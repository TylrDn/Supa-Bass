/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exclude Supabase functions from build
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        'https://deno.land/std@0.168.0/http/server.ts': 'commonjs https://deno.land/std@0.168.0/http/server.ts',
        'https://esm.sh/@supabase/supabase-js@2.39.0': 'commonjs https://esm.sh/@supabase/supabase-js@2.39.0'
      })
    }
    return config
  },
  // Exclude Supabase directory from compilation
  typescript: {
    ignoreBuildErrors: false,
  },
}

module.exports = nextConfig
