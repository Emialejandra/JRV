import { ApiError } from './http.ts';

export function asPositiveInteger(value: unknown, name: string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new ApiError(400, 'INVALID_FIELD', `${name} debe ser un entero positivo.`, {
      field: name,
    });
  }
  return parsed;
}

export function asNonNegativeInteger(value: unknown, name: string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new ApiError(400, 'INVALID_FIELD', `${name} debe ser un entero no negativo.`, {
      field: name,
    });
  }
  return parsed;
}

export function asText(value: unknown, name: string, maxLength: number): string {
  if (typeof value !== 'string') {
    throw new ApiError(400, 'INVALID_FIELD', `${name} es obligatorio.`, {
      field: name,
    });
  }
  const result = value.trim();
  if (!result || result.length > maxLength) {
    throw new ApiError(400, 'INVALID_FIELD', `${name} no es válido.`, {
      field: name,
    });
  }
  return result;
}

export function validEcuadorianId(value: string): boolean {
  if (!/^\d{10}$/.test(value)) return false;

  const province = Number(value.slice(0, 2));
  const thirdDigit = Number(value[2]);
  if (!((province >= 1 && province <= 24) || province === 30) || thirdDigit > 5) {
    return false;
  }

  const sum = [...value.slice(0, 9)].reduce((total, digit, index) => {
    let number = Number(digit);
    if (index % 2 === 0) {
      number *= 2;
      if (number > 9) number -= 9;
    }
    return total + number;
  }, 0);

  return (10 - (sum % 10)) % 10 === Number(value[9]);
}

export function asEmail(value: unknown): string {
  const email = asText(value, 'Correo electrónico', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, 'INVALID_EMAIL', 'El correo electrónico no es válido.');
  }
  return email;
}

export function asPhone(value: unknown): string {
  const phone = asText(value, 'Teléfono', 20);
  if (!/^\+?[0-9()\-\s]{7,20}$/.test(phone)) {
    throw new ApiError(400, 'INVALID_PHONE', 'El teléfono no es válido.');
  }
  return phone;
}

export function validateEcuadorianId(value: unknown): string {
  const cedula = asText(value, 'Cédula', 10);
  if (!validEcuadorianId(cedula)) {
    throw new ApiError(400, 'INVALID_CEDULA', 'La cédula ecuatoriana no es válida.');
  }
  return cedula;
}

export function validateDignity(value: unknown): 'alcaldia' | 'prefectura' {
  if (value !== 'alcaldia' && value !== 'prefectura') {
    throw new ApiError(400, 'INVALID_DIGNITY', 'La dignidad debe ser alcaldia o prefectura.');
  }
  return value;
}

export interface ActaVoteInput {
  candidatura_id: number;
  cantidad_votos: number;
}

export interface ActaInput {
  acta_id: number | null;
  jrv_id: number;
  dignidad: 'alcaldia' | 'prefectura';
  client_id: string | null;
  expected_updated_at: string | null;
  votos: ActaVoteInput[];
  total_votos_blancos: number;
  total_votos_nulos: number;
  total_votantes: number;
  latitud: number | null;
  longitud: number | null;
  fotografia_path: string | null;
  observaciones: string | null;
}

export function asCoordinate(value: unknown, name: string, minimum: number, maximum: number): number | null {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    return null;
  }
  const coordinate = Number(value);
  if (!Number.isFinite(coordinate) || coordinate < minimum || coordinate > maximum) {
    throw new ApiError(400, 'INVALID_COORDINATE', `${name} no está dentro del rango válido.`, {
      field: name,
    });
  }
  return coordinate;
}

export function validateActaInput(body: Record<string, unknown>): ActaInput {
  if (!Array.isArray(body.votos) || body.votos.length !== 5) {
    throw new ApiError(400, 'INVALID_VOTES', 'El acta debe incluir exactamente cinco organizaciones/candidaturas.');
  }

  const votes = body.votos.map((value, index) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new ApiError(400, 'INVALID_VOTES', `El voto ${index + 1} no es válido.`);
    }
    const vote = value as Record<string, unknown>;
    return {
      candidatura_id: asPositiveInteger(vote.candidatura_id, 'candidatura_id'),
      cantidad_votos: asNonNegativeInteger(vote.cantidad_votos, 'cantidad_votos'),
    };
  });

  if (new Set(votes.map((vote) => vote.candidatura_id)).size !== 5) {
    throw new ApiError(400, 'DUPLICATE_CANDIDACY', 'Cada candidatura debe aparecer una sola vez.');
  }

  const whites = asNonNegativeInteger(body.total_votos_blancos, 'Votos blancos');
  const nulls = asNonNegativeInteger(body.total_votos_nulos, 'Votos nulos');
  const voters = asNonNegativeInteger(body.total_votantes, 'Total de sufragantes');
  const validVotes = votes.reduce((sum, vote) => sum + vote.cantidad_votos, 0);

  if (validVotes + whites + nulls !== voters) {
    throw new ApiError(
      422,
      'ACTA_TOTAL_MISMATCH',
      'La suma de votos válidos, blancos y nulos debe coincidir con el total de sufragantes.',
      {
        total_votos_validos: validVotes,
        total_votos_blancos: whites,
        total_votos_nulos: nulls,
        total_votantes: voters,
      },
    );
  }

  const actaId =
    body.acta_id === null || body.acta_id === undefined ? null : asPositiveInteger(body.acta_id, 'acta_id');

  const clientId = typeof body.client_id === 'string' && body.client_id.trim() ? body.client_id.trim() : null;
  if (clientId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clientId)) {
    throw new ApiError(400, 'INVALID_CLIENT_ID', 'client_id debe ser un UUID.');
  }

  let expectedUpdatedAt: string | null = null;
  if (body.expected_updated_at !== null && body.expected_updated_at !== undefined) {
    if (
      typeof body.expected_updated_at !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(body.expected_updated_at) ||
      Number.isNaN(Date.parse(body.expected_updated_at))
    ) {
      throw new ApiError(400, 'INVALID_TIMESTAMP', 'expected_updated_at debe ser una fecha ISO válida.');
    }
    expectedUpdatedAt = body.expected_updated_at;
  }

  const observations =
    body.observaciones === null || body.observaciones === undefined
      ? null
      : asText(body.observaciones, 'Observaciones', 2000);

  const photographyPath =
    body.fotografia_path === null || body.fotografia_path === undefined
      ? null
      : asText(body.fotografia_path, 'fotografia_path', 500);

  if (actaId === null && photographyPath === null) {
    throw new ApiError(
      422,
      'PHOTO_REQUIRED',
      'Debes subir la fotografía del acta antes de registrarla.'
    );
  }

  return {
    acta_id: actaId,
    jrv_id: asPositiveInteger(body.jrv_id, 'jrv_id'),
    dignidad: validateDignity(body.dignidad),
    client_id: clientId,
    expected_updated_at: expectedUpdatedAt,
    votos: votes,
    total_votos_blancos: whites,
    total_votos_nulos: nulls,
    total_votantes: voters,
    latitud: asCoordinate(body.latitud, 'latitud', -90, 90),
    longitud: asCoordinate(body.longitud, 'longitud', -180, 180),
    fotografia_path: photographyPath,
    observaciones: observations,
  };
}
