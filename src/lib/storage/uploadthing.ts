import { UTApi, UTFile } from "uploadthing/server";

// Token leído en cada llamada (no a nivel de módulo) para que los tests
// puedan forzar el fallback local borrando la variable de entorno.
export function uploadThingToken(): string | null {
  return process.env.UPLOADTHING_TOKEN || null;
}

export async function uploadToUploadThing(
  filename: string,
  body: Buffer | Blob | ArrayBuffer,
  contentType: string,
) {
  const token = uploadThingToken();
  if (!token) throw new Error("Falta UPLOADTHING_TOKEN para almacenar en UploadThing");
  const raw =
    body instanceof Uint8Array
      ? body
      : body instanceof ArrayBuffer
        ? new Uint8Array(body)
        : new Uint8Array(await body.arrayBuffer());
  // Copia a un ArrayBuffer propio: UTFile exige BlobPart (Uint8Array<ArrayBuffer>).
  const bytes = new Uint8Array(raw.length);
  bytes.set(raw);
  const utapi = new UTApi({ token });
  const file = new UTFile([bytes], filename, { type: contentType || "application/octet-stream" });
  const res = await utapi.uploadFiles(file);
  const single = Array.isArray(res) ? res[0] : res;
  const data = (single as { data?: { key: string; ufsUrl?: string; url?: string } } | null)?.data;
  const error = (single as { error?: { message?: string } } | null)?.error;
  const url = data?.ufsUrl ?? data?.url;
  if (!data || error || !url) {
    throw new Error(`UploadThing: ${error?.message || "respuesta sin datos"}`);
  }
  return { url, key: data.key };
}

/** Borrado best-effort. Acepta key (`abc/def.pdf`) o URL completa (`.../f/<key>`). */
export async function deleteFromUploadThing(keyOrUrl: string) {
  const token = uploadThingToken();
  if (!token) return;
  const key = keyOrUrl.includes("/f/") ? keyOrUrl.split("/f/").pop()! : keyOrUrl;
  try {
    const utapi = new UTApi({ token });
    await utapi.deleteFiles(key);
  } catch {
    // best-effort: no bloquear la operación principal
  }
}
