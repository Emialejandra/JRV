export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
};

export function handleOptions(request: Request): Response | null {
  if (request.method !== 'OPTIONS') return null;
  return new Response('ok', { headers: corsHeaders });
}

export function success<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function failure(status: number, code: string, message: string, details?: unknown): Response {
  const error: ApiErrorBody = { code, message };
  if (details !== undefined) error.details = details;

  return new Response(JSON.stringify({ success: false, error }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return failure(error.status, error.code, error.message, error.details);
  }

  console.error('Unhandled backend error:', error);
  return failure(500, 'INTERNAL_ERROR', 'Ocurrió un error interno.');
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new ApiError(400, 'INVALID_JSON', 'El cuerpo JSON no es válido.');
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ApiError(400, 'INVALID_BODY', 'Se esperaba un objeto JSON.');
  }

  return value as Record<string, unknown>;
}
