// OpenClaw Gateway client (REAL + MOCK fallback)

import crypto from 'node:crypto'
//
// Lumi9 runs agent tasks via the OpenClaw Gateway. When OPENCLAW_USE_MOCK=true
// (or no token is configured), we fall back to a mock client so local UI work
// can continue without a running gateway.
//
// The OpenClaw Gateway primarily exposes a WebSocket JSON-RPC interface.
// We connect, authenticate with a bearer token, then use chat.send + chat.history
// to run a task and retrieve the assistant response.

export interface OpenClawConfig {
  gatewayUrl: string
  gatewayToken: string
}

export interface TaskRequest {
  task: string
  systemPrompt?: string
  model?: string
  tools?: string[]
  timeout?: number
}

export interface TaskResult {
  success: boolean
  response: string
  toolsUsed: string[]
  tokensUsed: { input: number; output: number }
  error?: string
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function estimateTokens(text: string): number {
  // Very rough heuristic; good enough for UI + credit estimation.
  return Math.max(1, Math.ceil(text.length / 4))
}

function parseBool(v: unknown): boolean {
  if (typeof v !== 'string') return false
  const s = v.trim().toLowerCase()
  return s === '1' || s === 'true' || s === 'yes' || s === 'on'
}

function base64UrlEncode(buf: Uint8Array): string {
  return Buffer.from(buf)
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

function base64UrlDecode(s: string): Uint8Array {
  const b64 = s.replaceAll('-', '+').replaceAll('_', '/') + '==='.slice((s.length + 3) % 4)
  return new Uint8Array(Buffer.from(b64, 'base64'))
}

function sha256Hex(buf: Uint8Array): string {
  return crypto.createHash('sha256').update(Buffer.from(buf)).digest('hex')
}

function toWsUrl(url: string): string {
  const u = (url || '').trim()
  if (!u) return 'ws://127.0.0.1:18789'
  if (u.startsWith('ws://') || u.startsWith('wss://')) return u
  if (u.startsWith('http://')) return 'ws://' + u.slice('http://'.length)
  if (u.startsWith('https://')) return 'wss://' + u.slice('https://'.length)
  // assume host:port
  if (/^\d+\.\d+\.\d+\.\d+:\d+$/.test(u) || /^[^/]+:\d+$/.test(u)) return `ws://${u}`
  return u
}

function mapTools(tools: string[] | undefined): string[] {
  const t = (tools || []).filter(Boolean)
  const mapped: string[] = []
  for (const x of t) {
    switch (x) {
      case 'web_search':
        mapped.push('web_search')
        break
      case 'web_browse':
        // Prefer full browser automation.
        mapped.push('browser')
        break
      case 'code_exec':
        mapped.push('exec')
        break
      case 'file_access':
        mapped.push('read', 'write')
        break
      case 'email_send':
        mapped.push('message')
        break
      default:
        mapped.push(x)
    }
  }
  return Array.from(new Set(mapped))
}

type RpcReq = { type: 'req'; id: string; method: string; params?: unknown }
type RpcRes = { type: 'res'; id: string; ok: boolean; payload?: unknown; error?: { message?: string } }

type RpcEvent = { type: 'event'; event: string; payload?: any }

type DeviceIdentity = { deviceId: string; publicKey: string; privateKey: crypto.KeyObject }

function createDeviceIdentity(): DeviceIdentity {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519')
  const jwk = publicKey.export({ format: 'jwk' }) as any
  const x = String(jwk.x || '')
  if (!x) throw new Error('Failed to export OpenClaw device public key')
  const publicKeyBytes = base64UrlDecode(x)
  const deviceId = sha256Hex(publicKeyBytes)
  return { deviceId, publicKey: x, privateKey }
}

function makeDeviceSignatureString(args: {
  deviceId: string
  clientId: string
  clientMode: string
  role: string
  scopes: string[]
  signedAtMs: number
  token: string | null
  nonce?: string | null
}): string {
  const version = args.nonce ? 'v2' : 'v1'
  const scopes = args.scopes.join(',')
  const token = args.token ?? ''
  const parts = [
    version,
    args.deviceId,
    args.clientId,
    args.clientMode,
    args.role,
    scopes,
    String(args.signedAtMs),
    token,
  ]
  if (version === 'v2') parts.push(args.nonce ?? '')
  return parts.join('|')
}

function signDeviceString(privateKey: crypto.KeyObject, text: string): string {
  const sig = crypto.sign(null, Buffer.from(text, 'utf8'), privateKey)
  return base64UrlEncode(new Uint8Array(sig))
}

class GatewayWsRpc {
  private ws: WebSocket | null = null
  private pending = new Map<string, { resolve: (v: any) => void; reject: (e: any) => void }>()

  private connectNonce: string | null = null
  private connectNonceWaiters: Array<(nonce: string | null) => void> = []

  constructor(private wsUrl: string) {}

  private waitForConnectNonce(waitMs: number): Promise<string | null> {
    if (this.connectNonce) return Promise.resolve(this.connectNonce)
    return new Promise((resolve) => {
      const t = setTimeout(() => resolve(null), waitMs)
      this.connectNonceWaiters.push((nonce) => {
        clearTimeout(t)
        resolve(nonce)
      })
    })
  }

  async connect(connectParams: any | ((nonce: string | null) => any), timeoutMs: number): Promise<any> {
    const ws = await this.open(timeoutMs)
    this.ws = ws

    // Some gateway configs require a challenge nonce (connect.challenge event)
    // before connect will be accepted.
    const nonce = await this.waitForConnectNonce(800)

    const params = typeof connectParams === 'function' ? connectParams(nonce) : connectParams
    return this.request('connect', params, timeoutMs)
  }

  private async open(timeoutMs: number): Promise<WebSocket> {
    const WebSocketImpl: any = (globalThis as any).WebSocket ?? (await this.importWs())
    return await new Promise<WebSocket>((resolve, reject) => {
      const ws: WebSocket = new WebSocketImpl(this.wsUrl)

      const t = setTimeout(() => {
        try {
          ;(ws as any).close?.()
        } catch {
          // ignore
        }
        reject(new Error(`OpenClaw gateway timeout connecting to ${this.wsUrl}`))
      }, Math.max(1, Math.ceil(timeoutMs / 2)))

      const cleanup = () => clearTimeout(t)

      ;(ws as any).addEventListener?.('open', () => {
        cleanup()
        resolve(ws)
      })

      ;(ws as any).addEventListener?.('message', (evt: any) => {
        this.handleMessage(String(evt?.data ?? ''))
      })

      ;(ws as any).addEventListener?.('close', (evt: any) => {
        // Reject everything still waiting.
        const reason = String(evt?.reason ?? '')
        const code = evt?.code
        for (const [, p] of this.pending) p.reject(new Error(`gateway closed (${code}): ${reason}`))
        this.pending.clear()
      })

      ;(ws as any).addEventListener?.('error', () => {
        // The close handler will flush pending.
      })

      // ws (node "ws" lib) uses .on not addEventListener
      ;(ws as any).on?.('open', () => {
        cleanup()
        resolve(ws)
      })
      ;(ws as any).on?.('message', (data: any) => this.handleMessage(String(data ?? '')))
      ;(ws as any).on?.('close', (code: any, data: any) => {
        const reason = String(data ?? '')
        for (const [, p] of this.pending) p.reject(new Error(`gateway closed (${code}): ${reason}`))
        this.pending.clear()
      })
      ;(ws as any).on?.('error', () => {})
    })
  }

  private async importWs(): Promise<any> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    try {
      const mod = await import('ws')
      return (mod as any).default ?? (mod as any)
    } catch {
      throw new Error(
        'No WebSocket implementation available. Install the "ws" package or run in an environment with global WebSocket.',
      )
    }
  }

  private handleMessage(raw: string) {
    let msg: any
    try {
      msg = JSON.parse(raw)
    } catch {
      return
    }

    if (msg?.type === 'event') {
      const ev = msg as RpcEvent
      if (ev.event === 'connect.challenge') {
        const nonce = typeof ev.payload?.nonce === 'string' ? ev.payload.nonce : null
        if (nonce) {
          this.connectNonce = nonce
          const waiters = this.connectNonceWaiters
          this.connectNonceWaiters = []
          for (const w of waiters) w(nonce)
        }
      }
      return
    }

    if (msg?.type !== 'res') return

    const res = msg as RpcRes
    const pending = this.pending.get(res.id)
    if (!pending) return
    this.pending.delete(res.id)

    if (res.ok) pending.resolve(res.payload)
    else pending.reject(new Error(res.error?.message ?? 'OpenClaw RPC request failed'))
  }

  request(method: string, params: any, timeoutMs: number): Promise<any> {
    if (!this.ws) return Promise.reject(new Error('Gateway not connected'))

    const id = (globalThis.crypto as any)?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
    const payload: RpcReq = { type: 'req', id, method, params }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`OpenClaw RPC timeout calling ${method}`))
      }, timeoutMs)

      this.pending.set(id, {
        resolve: (v) => {
          clearTimeout(timer)
          resolve(v)
        },
        reject: (e) => {
          clearTimeout(timer)
          reject(e)
        },
      })

      try {
        ;(this.ws as any).send(JSON.stringify(payload))
      } catch (e) {
        clearTimeout(timer)
        this.pending.delete(id)
        reject(e)
      }
    })
  }

  close() {
    try {
      ;(this.ws as any)?.close?.()
    } catch {
      // ignore
    }
    this.ws = null
  }
}

class MockOpenClawClient {
  async executeTask(request: TaskRequest): Promise<TaskResult> {
    const delay = 800 + Math.floor(Math.random() * 800)
    await sleep(delay)

    const requestedTools = (request.tools || []).filter(Boolean)
    const toolsUsed = requestedTools.length ? requestedTools : ['basic_chat']

    const response =
      `MOCK OpenClaw Response\n\n` +
      `Task: ${request.task}\n` +
      `Model: ${request.model || 'default'}\n` +
      `Tools: ${toolsUsed.join(', ')}\n\n` +
      `Result:\n` +
      `- I analyzed your request and produced a plausible output.\n` +
      `- This is a simulated response (no real browsing/execution yet).\n`

    return {
      success: true,
      response,
      toolsUsed,
      tokensUsed: {
        input: estimateTokens((request.systemPrompt || '') + request.task),
        output: estimateTokens(response),
      },
    }
  }

  async streamTask(request: TaskRequest, onChunk: (chunk: string) => void): Promise<TaskResult> {
    onChunk('MOCK OpenClaw: thinking...\n')
    const final = await this.executeTask(request)
    onChunk(final.response)
    return final
  }
}

export class OpenClawClient {
  private gatewayUrl: string
  private token: string
  private useMock: boolean
  private mock = new MockOpenClawClient()

  constructor(config: OpenClawConfig) {
    this.gatewayUrl = config.gatewayUrl || 'http://localhost:18789'
    this.token = config.gatewayToken || ''
    this.useMock =
      parseBool(process.env.OPENCLAW_USE_MOCK) ||
      parseBool(process.env.NEXT_PUBLIC_OPENCLAW_USE_MOCK) ||
      !this.token
  }

  async executeTask(request: TaskRequest): Promise<TaskResult> {
    if (this.useMock) return this.mock.executeTask(request)

    const timeoutMs = Math.max(5_000, request.timeout ?? 60_000)

    const toolsRequested = mapTools(request.tools)

    const wsUrl = toWsUrl(this.gatewayUrl)

    // Keep logs useful but do not leak tokens.
    console.log('[openclaw] executeTask', {
      wsUrl,
      model: request.model,
      toolsRequested,
      taskPreview: request.task.slice(0, 120),
    })

    const rpc = new GatewayWsRpc(wsUrl)

    try {
      // 1) Connect + authenticate
      const device = createDeviceIdentity()

      const clientId = 'gateway-client'
      const clientMode = 'backend'
      const role = 'operator'
      const scopes = ['operator.admin', 'operator.pairing', 'operator.approvals']

      const hello = await rpc.connect(
        (nonce: string | null) => {
          const signedAtMs = Date.now()
          const sigStr = makeDeviceSignatureString({
            deviceId: device.deviceId,
            clientId,
            clientMode,
            role,
            scopes,
            signedAtMs,
            token: this.token,
            nonce,
          })

          const signature = signDeviceString(device.privateKey, sigStr)

          return {
            minProtocol: 3,
            maxProtocol: 3,
            client: {
              // Must match one of the gateway's allowed client ids.
              id: clientId,
              version: '0.1.0',
              platform: 'node',
              mode: clientMode,
              instanceId: 'lumi9',
            },
            role,
            scopes,
            caps: [],
            auth: { token: this.token },
            device: {
              id: device.deviceId,
              publicKey: device.publicKey,
              signature,
              signedAt: signedAtMs,
              ...(nonce ? { nonce } : {}),
            },
            userAgent: 'lumi9',
            locale: 'en-US',
          }
        },
        Math.min(15_000, timeoutMs),
      )

      // 2) Resolve a session key (prefer gateway main session key if provided)
      let sessionKey = 'main'
      try {
        const ident = await rpc.request('agent.identity.get', {}, 10_000)
        if (ident?.mainSessionKey && typeof ident.mainSessionKey === 'string') sessionKey = ident.mainSessionKey
      } catch {
        // ignore; fallback to "main"
      }

      // 3) Send task message
      const startedAt = Date.now()
      const idempotencyKey = (globalThis.crypto as any)?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`

      // NOTE: systemPrompt/model/tools are not currently passed as structured fields to the gateway RPC.
      // If needed later, we can add gateway-side directives or session defaults.
      const message =
        (request.systemPrompt ? `${request.systemPrompt.trim()}\n\n` : '') +
        (request.model ? `Model: ${request.model}\n` : '') +
        (toolsRequested.length ? `Requested tools: ${toolsRequested.join(', ')}\n\n` : '') +
        request.task

      await rpc.request(
        'chat.send',
        {
          sessionKey,
          message,
          deliver: false,
          idempotencyKey,
        },
        Math.min(20_000, timeoutMs),
      )

      // 4) Poll chat history until an assistant message arrives after startedAt
      let responseText = ''
      let lastErr: string | null = null

      while (Date.now() - startedAt < timeoutMs) {
        try {
          const history = await rpc.request('chat.history', { sessionKey, limit: 50 }, 15_000)
          const messages: any[] = Array.isArray(history?.messages) ? history.messages : []

          // Find the newest assistant message after we started.
          const assistant = messages
            .filter((m) => m && m.role === 'assistant' && typeof m.timestamp === 'number' && m.timestamp >= startedAt)
            .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))
            .at(-1)

          if (assistant) {
            const parts: any[] = Array.isArray(assistant.content) ? assistant.content : []
            const text = parts
              .filter((p) => p && p.type === 'text' && typeof p.text === 'string')
              .map((p) => p.text)
              .join('')
              .trim()

            if (text) {
              responseText = text
              break
            }
          }
        } catch (e) {
          lastErr = e instanceof Error ? e.message : String(e)
        }

        await sleep(900)
      }

      if (!responseText) {
        throw new Error(lastErr || 'Timed out waiting for OpenClaw response')
      }

      return {
        success: true,
        response: responseText,
        // Gateway does not currently return tool usage via this simple polling approach.
        // Use requested tools as an approximation for credit calculation.
        toolsUsed: toolsRequested.length ? toolsRequested : ['basic_chat'],
        tokensUsed: {
          input: estimateTokens(message),
          output: estimateTokens(responseText),
        },
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return {
        success: false,
        response: '',
        toolsUsed: mapTools(request.tools),
        tokensUsed: { input: 0, output: 0 },
        error: msg,
      }
    } finally {
      rpc.close()
    }
  }

  async streamTask(request: TaskRequest, onChunk: (chunk: string) => void): Promise<TaskResult> {
    if (this.useMock) return this.mock.streamTask(request, onChunk)

    // Minimal streaming: emit a start line, then the final response.
    onChunk('OpenClaw: starting task...\n')
    const final = await this.executeTask(request)
    if (final.success) onChunk(final.response)
    else onChunk(`Error: ${final.error || 'Unknown error'}\n`)
    return final
  }
}

let _client: OpenClawClient | null = null

export function getOpenClawClient(): OpenClawClient {
  if (_client) return _client

  const gatewayUrl =
    process.env.OPENCLAW_GATEWAY_URL ||
    process.env.OPENCLOW_GATEWAY_URL ||
    'http://localhost:18789'

  const gatewayToken =
    process.env.OPENCLAW_GATEWAY_TOKEN ||
    process.env.OPENCLOW_GATEWAY_TOKEN ||
    ''

  _client = new OpenClawClient({ gatewayUrl, gatewayToken })
  return _client
}
