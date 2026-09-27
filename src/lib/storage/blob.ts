import { put, del } from "@vercel/blob";
import { deleteFromUploadThing, uploadThingToken, uploadToUploadThing } from "./uploadthing";

// Prioridad de backend (ADR-013): UploadThing → Vercel Blob → local.
// Los tokens se leen en cada llamada (no a nivel de módulo) para que los
// tests puedan forzar el fallback local borrando las variables de entorno.
function blobToken() {
  return process.env.BLOB_READ_WRITE_TOKEN || null;
}

export async function uploadToBlob(pathname: string, body: Buffer | Blob | ArrayBuffer, contentType: string) {
  if (uploadThingToken()) {
    const filename = pathname.split("/").pop() || pathname;
    const { url, key } = await uploadToUploadThing(filename, body, contentType);
    return { url, pathname: key };
  }
  const TOKEN = blobToken();
  if (!TOKEN) {
    // Fallback sin almacenamiento real: simular url privada local
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
  if (urlOrPathname.startsWith("local://") || urlOrPathname.startsWith("/api/files/local/")) return;
  if (uploadThingToken()) {
    await deleteFromUploadThing(urlOrPathname);
    return;
  }
  const TOKEN = blobToken();
  if (!TOKEN) return;
  try {
    await del(urlOrPathname, { token: TOKEN });
  } catch {
    // ignore
  }
}
