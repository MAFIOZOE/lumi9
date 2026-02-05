import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// SAFE tenant middleware — apex and www are untouched
export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host");
  if (!hostname) return NextResponse.next();

  const host = hostname.split(":")[0].toLowerCase();

  // Only apply tenant logic to *.lumi9.ai
  if (!host.endsWith(".lumi9.ai")) return NextResponse.next();

  const sub = host.replace(".lumi9.ai", "");

  // Skip apex + reserved
  if (!sub || sub === "www" || sub === "app") {
    return NextResponse.next();
  }

  // Prevent multi-level subdomains
  if (sub.includes(".")) return NextResponse.next();

  const url = request.nextUrl.clone();

  // Skip static and Next internals
  if (
    url.pathname.startsWith("/_next") ||
    url.pathname.match(/\.[a-zA-Z0-9]+$/)
  ) {
    return NextResponse.next();
  }

  // API routes: header only
  if (url.pathname.startsWith("/api")) {
    const res = NextResponse.next();
    res.headers.set("x-tenant-slug", sub);
    return res;
  }

  // Pages: rewrite with tenant param
  url.searchParams.set("tenant", sub);
  return NextResponse.rewrite(url, {
    headers: { "x-tenant-slug": sub },
  });
}

// Apply to everything except static assets
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
