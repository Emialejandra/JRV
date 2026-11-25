import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { ApiError } from './http.ts';

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new ApiError(500, 'SERVER_CONFIGURATION', `Falta configurar la variable del servidor ${name}.`);
  }
  return value;
}

export function createAdminClient(): SupabaseClient {
  const url = requiredEnv('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!serviceRoleKey) {
    throw new ApiError(500, 'SERVER_CONFIGURATION', 'Falta configurar la clave administrativa en el servidor.');
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function createPublicClient(): SupabaseClient {
  const url = requiredEnv('SUPABASE_URL');
  const anonKey = requiredEnv('SUPABASE_ANON_KEY');

  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function createUserClient(authorization: string): SupabaseClient {
  const url = requiredEnv('SUPABASE_URL');
  const anonKey = requiredEnv('SUPABASE_ANON_KEY');

  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authorization } },
  });
}

export function requiredAppUrl(): string {
  return requiredEnv('APP_URL').replace(/\/+$/, '');
}

export function requiredResendApiKey(): string {
  return requiredEnv('RESEND_API_KEY');
}
