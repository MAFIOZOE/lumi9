import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Environment variable fallbacks for debugging
  env: {
    DEBUG_BUILD: 'true',
    BUILD_TIMESTAMP: new Date().toISOString(),
  },
};

// Log environment status during build
console.log('🔧 Next.js Config - Environment Check:', {
  NODE_ENV: process.env.NODE_ENV,
  hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
  buildTime: new Date().toISOString()
});

export default nextConfig;
