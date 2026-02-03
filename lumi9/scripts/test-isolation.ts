/* eslint-disable no-console */
// Multi-tenant isolation smoke test for Lumi9
// Run: npx tsx scripts/test-isolation.ts

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

function loadDotEnv(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

type TestResult = { name: string; ok: boolean; details?: string };

function pass(name: string, details?: string): TestResult {
  return { name, ok: true, details };
}
function fail(name: string, details?: string): TestResult {
  return { name, ok: false, details };
}

async function main() {
  const root = process.cwd();
  loadDotEnv(path.join(root, '.env.local'));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const runId = `isolation-${Date.now()}`;

  const results: TestResult[] = [];

  // ------------------------------
  // Setup Phase
  // ------------------------------

  const tenantSlugs = { alice: 'test-alice', bob: 'test-bob' } as const;

  async function ensureTenant(slug: string, name: string) {
    const { data: existing, error: selErr } = await supabase
      .from('tenants')
      .select('id, slug, name')
      .eq('slug', slug)
      .maybeSingle();
    if (selErr) throw selErr;

    if (existing) return existing;

    const { data: created, error: insErr } = await supabase
      .from('tenants')
      .insert({ slug, name })
      .select('id, slug, name')
      .single();
    if (insErr) throw insErr;
    return created;
  }

  async function resetTenantData(tenantId: string) {
    // Delete conversations first (cascades messages)
    const { error: convErr } = await supabase.from('conversations').delete().eq('tenant_id', tenantId);
    if (convErr) throw convErr;

    const { error: memErr } = await supabase.from('user_memory').delete().eq('tenant_id', tenantId);
    if (memErr) throw memErr;

    const { error: ctErr } = await supabase.from('credit_transactions').delete().eq('tenant_id', tenantId);
    if (ctErr) throw ctErr;

    const { error: userErr } = await supabase.from('users').delete().eq('tenant_id', tenantId);
    if (userErr) throw userErr;
  }

  async function createUser(tenantId: string, email: string, name: string) {
    const { data, error } = await supabase
      .from('users')
      .insert({ tenant_id: tenantId, email, name, role: 'member' })
      .select('id, tenant_id, email, name')
      .single();
    if (error) throw error;
    return data;
  }

  async function setInitialCredits(tenantId: string, amount: number) {
    const { error } = await supabase
      .from('credit_transactions')
      .insert({
        tenant_id: tenantId,
        amount,
        balance_after: amount,
        type: 'bonus',
        description: `Isolation test initial credits (${runId})`,
        metadata: { run_id: runId },
      });
    if (error) throw error;
  }

  const aliceTenant = await ensureTenant(tenantSlugs.alice, 'Test Alice');
  const bobTenant = await ensureTenant(tenantSlugs.bob, 'Test Bob');

  // Reset ONLY these two test tenants (safe to be destructive here)
  await resetTenantData(aliceTenant.id);
  await resetTenantData(bobTenant.id);

  const aliceUser = await createUser(aliceTenant.id, 'alice+isolation@test.local', 'Alice Isolation');
  const bobUser = await createUser(bobTenant.id, 'bob+isolation@test.local', 'Bob Isolation');

  await setInitialCredits(aliceTenant.id, 100);
  await setInitialCredits(bobTenant.id, 100);

  // ------------------------------
  // Test A: Conversation Isolation
  // ------------------------------

  const { data: aliceConv, error: convInsErr } = await supabase
    .from('conversations')
    .insert({
      tenant_id: aliceTenant.id,
      user_id: aliceUser.id,
      title: `Alice Isolation Conversation (${runId})`,
      channel: 'web',
    })
    .select('id, tenant_id, user_id')
    .single();
  if (convInsErr) throw convInsErr;

  const { error: msgInsErr } = await supabase.from('messages').insert({
    conversation_id: aliceConv.id,
    role: 'user',
    content: `Hello from Alice (${runId})`,
    tokens_used: 0,
    credits_used: 0,
    metadata: { run_id: runId },
  });
  if (msgInsErr) throw msgInsErr;

  const { data: bobConvs, error: bobConvErr } = await supabase
    .from('conversations')
    .select('id')
    .eq('tenant_id', bobTenant.id)
    .eq('user_id', bobUser.id);
  if (bobConvErr) throw bobConvErr;

  results.push(
    bobConvs.length === 0
      ? pass('Test A1: Bob sees 0 conversations')
      : fail('Test A1: Bob sees 0 conversations', `Expected 0, got ${bobConvs.length}`)
  );

  const { data: bobTenantMsgs, error: bobMsgsErr } = await supabase
    .from('messages')
    // join conversations to filter by tenant
    .select('id, conversations!inner(tenant_id)')
    .eq('conversations.tenant_id', bobTenant.id);
  if (bobMsgsErr) throw bobMsgsErr;

  results.push(
    bobTenantMsgs.length === 0
      ? pass('Test A2: Bob tenant message query returns 0 messages')
      : fail('Test A2: Bob tenant message query returns 0 messages', `Expected 0, got ${bobTenantMsgs.length}`)
  );

  // ------------------------------
  // Test B: Credit Isolation
  // ------------------------------

  // Fetch Alice latest balance
  const { data: aliceLastTx, error: aliceLastTxErr } = await supabase
    .from('credit_transactions')
    .select('balance_after')
    .eq('tenant_id', aliceTenant.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (aliceLastTxErr) throw aliceLastTxErr;
  const aliceBalanceBefore = aliceLastTx?.balance_after ?? 0;

  const aliceBalanceAfter = aliceBalanceBefore - 10;

  const { error: aliceDebitErr } = await supabase.from('credit_transactions').insert({
    tenant_id: aliceTenant.id,
    user_id: aliceUser.id,
    amount: -10,
    balance_after: aliceBalanceAfter,
    type: 'usage',
    description: `Isolation test debit (-10) (${runId})`,
    metadata: { run_id: runId },
  });
  if (aliceDebitErr) throw aliceDebitErr;

  async function getBalance(tenantId: string) {
    const { data, error } = await supabase
      .from('credit_transactions')
      .select('balance_after')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data?.balance_after ?? 0;
  }

  const bobBalance = await getBalance(bobTenant.id);
  const aliceBalance = await getBalance(aliceTenant.id);

  results.push(
    bobBalance === 100
      ? pass('Test B1: Bob balance unchanged at 100')
      : fail('Test B1: Bob balance unchanged at 100', `Expected 100, got ${bobBalance}`)
  );
  results.push(
    aliceBalance === 90
      ? pass('Test B2: Alice balance is 90 after debit')
      : fail('Test B2: Alice balance is 90 after debit', `Expected 90, got ${aliceBalance}`)
  );

  // ------------------------------
  // Test C: Memory Isolation
  // ------------------------------

  const { error: memInsErr } = await supabase.from('user_memory').insert({
    tenant_id: aliceTenant.id,
    user_id: aliceUser.id,
    memory_type: 'preferences',
    content: { likes: ['coffee'], run_id: runId },
  });
  if (memInsErr) throw memInsErr;

  const { data: bobMem, error: bobMemErr } = await supabase
    .from('user_memory')
    .select('id')
    .eq('tenant_id', bobTenant.id)
    .eq('user_id', bobUser.id);
  if (bobMemErr) throw bobMemErr;

  results.push(
    bobMem.length === 0
      ? pass("Test C1: Bob sees 0 memory entries")
      : fail("Test C1: Bob sees 0 memory entries", `Expected 0, got ${bobMem.length}`)
  );

  // ------------------------------
  // Test D: Cross-tenant Query Protection
  // ------------------------------

  const { data: crossConvs, error: crossConvErr } = await supabase
    .from('conversations')
    .select('id')
    // Bob tenant filter + Alice user_id should never match
    .eq('tenant_id', bobTenant.id)
    .eq('user_id', aliceUser.id);
  if (crossConvErr) throw crossConvErr;

  results.push(
    crossConvs.length === 0
      ? pass('Test D1: Cannot retrieve Alice conversations with Bob tenant_id filter')
      : fail('Test D1: Cannot retrieve Alice conversations with Bob tenant_id filter', `Expected 0, got ${crossConvs.length}`)
  );

  const { data: crossMsgs, error: crossMsgsErr } = await supabase
    .from('messages')
    .select('id, conversations!inner(id, tenant_id)')
    .eq('conversations.tenant_id', bobTenant.id)
    .eq('conversations.id', aliceConv.id);
  if (crossMsgsErr) throw crossMsgsErr;

  results.push(
    crossMsgs.length === 0
      ? pass('Test D2: Cannot retrieve Alice messages by joining on Bob tenant_id')
      : fail('Test D2: Cannot retrieve Alice messages by joining on Bob tenant_id', `Expected 0, got ${crossMsgs.length}`)
  );

  // ------------------------------
  // Cleanup Phase
  // ------------------------------

  // These are test tenants; reset again to remove artifacts.
  await resetTenantData(aliceTenant.id);
  await resetTenantData(bobTenant.id);

  // ------------------------------
  // Output
  // ------------------------------

  const maxName = Math.max(...results.map((r) => r.name.length));
  for (const r of results) {
    const label = r.ok ? 'PASS' : 'FAIL';
    const padded = r.name.padEnd(maxName);
    console.log(`${label}  ${padded}${r.details ? `  -> ${r.details}` : ''}`);
  }

  const failed = results.filter((r) => !r.ok);
  console.log('---');
  console.log(`Total: ${results.length}, Passed: ${results.length - failed.length}, Failed: ${failed.length}`);

  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
