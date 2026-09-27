import { put, del } from "@vercel/blob";

// El token se lee en cada llamada (no a nivel de módulo) para que los tests
// puedan desactivar Blob borrando la variable de entorno (fallback local).
function token() {
  return process.env.BLOB_READ_WRITE_TOKEN || null;
}

export async function uploadToBlob(pathname: string, body: Buffer | Blob | ArrayBuffer, contentType: string) {
  const TOKEN = token();
  if (!TOKEN) {
    // Fallback sin Blob real: simular url privada local
    // En producción debe configurarse BLOB_READ_WRITE_TOKEN
    return {
      url: `/api/files/local/${encodeURIComponent(pathname)}`,
      pathname,
    };
  }
  const blob = await put(pathname, body as never, {
    access: "private" as never,
    contentType,
    token: TOKEN,
    addRandomSuffix: true,
  });
  // @vercel/blob private returns url with token? We store pathname + url
  return { url: blob.url, pathname: blob.pathname };
}

export async function deleteFromBlob(urlOrPathname: string) {
  const TOKEN = token();
  if (!TOKEN) return;
  try {
    await del(urlOrPathname, { token: TOKEN });
  } catch {
    // ignore
  }
}
