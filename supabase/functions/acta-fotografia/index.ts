import { assertJrvAccess, authenticate } from '../_shared/auth.ts';
import { ApiError, errorResponse, handleOptions, success } from '../_shared/http.ts';
import { asPositiveInteger, validateDignity } from '../_shared/validation.ts';

const bucketName = 'actas-electorales';
const maxBytes = 10 * 1024 * 1024;

function isSupportedImage(bytes: Uint8Array, mimeType: string): boolean {
  if (mimeType === 'image/jpeg') {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === 'image/png') {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }
  if (mimeType === 'image/webp') {
    return (
      bytes.length >= 12 &&
      new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' &&
      new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP'
    );
  }
  return false;
}

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;

  try {
    if (request.method !== 'POST') {
      throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Usa POST para subir una fotografía.');
    }

    const actor = await authenticate(request, ['coordinador_recinto', 'veedor']);
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new ApiError(400, 'INVALID_MULTIPART', 'El formulario de fotografía no es válido.');
    }
    const jrvId = asPositiveInteger(form.get('jrv_id'), 'jrv_id');
    const dignity = validateDignity(form.get('dignidad'));
    const file = form.get('file');

    if (!(file instanceof File)) {
      throw new ApiError(400, 'FILE_REQUIRED', 'Adjunta la fotografía del acta.');
    }
    if (file.size < 1 || file.size > maxBytes) {
      throw new ApiError(413, 'FILE_SIZE_INVALID', 'La fotografía debe pesar hasta 10 MB.');
    }

    await assertJrvAccess(actor, jrvId);

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!isSupportedImage(bytes, file.type)) {
      throw new ApiError(415, 'UNSUPPORTED_IMAGE', 'El archivo debe ser una imagen JPEG, PNG o WebP válida.');
    }

    const extension = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp';
    const path = `jrv/${jrvId}/${dignity}/${actor.user.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await actor.admin.storage.from(bucketName).upload(path, bytes, {
      contentType: file.type,
      upsert: false,
    });

    if (uploadError) {
      console.error('Error subiendo fotografía de acta:', uploadError);
      throw new ApiError(502, 'PHOTO_UPLOAD_FAILED', 'No se pudo guardar la fotografía.');
    }

    const { data: signed, error: signedError } = await actor.admin.storage.from(bucketName).createSignedUrl(path, 300);

    if (signedError) {
      console.error('Error generando enlace de fotografía:', signedError);
      throw new ApiError(
        502,
        'PHOTO_URL_FAILED',
        'La fotografía se guardó, pero no se pudo generar un enlace temporal.',
      );
    }

    return success(
      {
        path,
        fotografia_url: signed.signedUrl,
        mime_type: file.type,
        size_bytes: file.size,
      },
      201,
    );
  } catch (error) {
    return errorResponse(error);
  }
});
