import { z } from "zod";

export const ALLOWED_EXTENSIONS = ["xls", "xlsx", "csv", "pdf", "docx"] as const;
export const ALLOWED_MIMES: Record<string, string[]> = {
  xls: ["application/vnd.ms-excel"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  csv: ["text/csv", "application/csv", "text/plain"],
  pdf: ["application/pdf"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
};

export const attachmentCategorySchema = z.enum([
  "DATA_EXAMPLE",
  "CALCULATION_CASE",
  "BALANCE",
  "CHART_OF_ACCOUNTS",
  "FINAL_REPORT",
  "REVIEWED_CASE",
  "LEGAL_FRAMEWORK",
  "COMPANY_LIST",
  "OTHER",
]);

export function isAllowedExtension(ext: string): boolean {
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(ext.toLowerCase());
}

export function validateFileMeta(opts: { extension: string; mimeType: string; sizeBytes: number }) {
  const ext = opts.extension.toLowerCase();
  if (!isAllowedExtension(ext)) throw new Error(`Extensión no permitida: ${ext}`);
  if (opts.sizeBytes > 20 * 1024 * 1024) throw new Error("Archivo excede 20 MB");
  // MIME check es laxo para csv/pdf variantes
}
