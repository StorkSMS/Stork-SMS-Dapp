// Server-side environment validation for API routes
export function validateServerEnvironment() {
  const requiredServerEnvVars = {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    JWT_SECRET: process.env.JWT_SECRET,
    SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  }

  const missingServerVars = Object.entries(requiredServerEnvVars)
    .filter(([key, value]) => !value)
    .map(([key]) => key)

  if (missingServerVars.length > 0) {
    throw new Error(`Missing required server environment variables: ${missingServerVars.join(', ')}`)
  }

  // Validate JWT keys format
  if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.split('.').length !== 3) {
    throw new Error('Invalid Supabase anonymous key format')
  }

  if (process.env.SUPABASE_SERVICE_ROLE_KEY?.split('.').length !== 3) {
    throw new Error('Invalid Supabase service role key format')
  }

  return true
}