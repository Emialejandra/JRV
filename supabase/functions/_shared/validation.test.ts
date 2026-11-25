import { describe, expect, it } from 'vitest';
import { ApiError } from './http.ts';
import { validateActaInput, validateEcuadorianId } from './validation.ts';

describe('Ecuadorian identity validation', () => {
  it('accepts a valid national ID and rejects an invalid checksum', () => {
    expect(validateEcuadorianId('1710034065')).toBe('1710034065');
    expect(() => validateEcuadorianId('1710034064')).toThrow(ApiError);
  });
});

describe('electoral act validation', () => {
  const validActa = {
    jrv_id: 12,
    dignidad: 'alcaldia',
    client_id: '018f47d1-7b6c-7a2c-9a9f-45dc2b8a4c10',
    fotografia_path:
      'jrv/12/alcaldia/00000000-0000-4000-8000-000000000001/acta.jpg',
    votos: [
      { candidatura_id: 1, cantidad_votos: 4 },
      { candidatura_id: 2, cantidad_votos: 3 },
      { candidatura_id: 3, cantidad_votos: 2 },
      { candidatura_id: 4, cantidad_votos: 1 },
      { candidatura_id: 5, cantidad_votos: 0 },
    ],
    total_votos_blancos: 1,
    total_votos_nulos: 1,
    total_votantes: 12,
  };

  it('accepts a balanced acta with a stable client UUID', () => {
    expect(validateActaInput(validActa)).toMatchObject({
      jrv_id: 12,
      dignidad: 'alcaldia',
      total_votantes: 12,
    });
  });

  it('rejects totals that do not equal valid, blank, and null votes', () => {
    expect(() => validateActaInput({ ...validActa, total_votantes: 11 })).toThrow(ApiError);
  });

  it('rejects duplicate candidacies and malformed client identifiers', () => {
    expect(() =>
      validateActaInput({
        ...validActa,
        votos: [...validActa.votos.slice(0, 4), { candidatura_id: 1, cantidad_votos: 0 }],
      }),
    ).toThrow(ApiError);

    expect(() => validateActaInput({ ...validActa, client_id: 'not-a-uuid' })).toThrow(ApiError);
  });

  it('requires a photograph for new actas', () => {
    expect(() =>
      validateActaInput({ ...validActa, fotografia_path: null })
    ).toThrow(ApiError);
  });
});
