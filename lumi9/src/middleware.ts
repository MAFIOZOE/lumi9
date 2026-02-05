import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Tenant resolution middleware
// Extracts tenant from subdomain: {tenant}.lumi9.ai
export function middleware(request: NextRequest) {
  try {
    const hostname = request.headers.get("host") || "";
    const url = request.nextUrl.clone();

    const subdomain = getSubdomain(hostname);

    // No subdomain = main domain, pass through
    if (!subdomain || subdomain === "www" || subdomain === "app") {
      return NextResponse.next();
    }

    // Skip static files entirely
    if (url.pathname.startsWith("/_next") || url.pathname.includes(".")) {
      return NextResponse.next();
    }

    // For API routes: set header but don't rewrite URL
    if (url.pathname.startsWith("/api")) {
      const response = NextResponse.next();
      response.headers.set("x-tenant-slug", subdomain);
      return response;
    }

    // For pages: set header AND rewrite URL with tenant param
    url.searchParams.set("tenant", subdomain);

    return NextResponse.rewrite(url, {
      headers: { "x-tenant-slug": subdomain },
    });
  } catch (_error) {
    // Don't log in middleware on Cloudflare — keep it silent to avoid build/runtime issues
    return NextResponse.next();
  }
}

function getSubdomain(hostname: string): string | null {
  const host = hostname.split(":")[0];

  if (host.endsWith(".lumi9.ai")) {
    return host.replace(".lumi9.ai", "");
  }

  if (host.endsWith(".localhost")) {
    return host.replace(".localhost", "");
  }

  return null;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
