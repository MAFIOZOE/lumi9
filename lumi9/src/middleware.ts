import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// TEMPORARILY DISABLED TENANT MIDDLEWARE
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

// Disable matching entirely
export const config = {
  matcher: [],
};
