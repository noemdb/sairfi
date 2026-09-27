import { promises as fs } from "fs";
import path from "path";

export type FlowMeta = {
  slug: string;
  title: string;
  description: string;
  steps: { id: string; label: string }[];
};

export type FlowDoc = FlowMeta & { markdown: string };

const FLOWS_DIR = path.join(process.cwd(), "docs", "flujos");

export function slugifyHeading(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parseFlow(slug: string, markdown: string): FlowMeta {
  const lines = markdown.split("\n");
  const h1 = lines.find((l) => l.startsWith("# "))?.replace(/^#\s+/, "").trim() ?? slug;
  // Descripción: primer blockquote `> ` no vacío tras el título.
  const description =
    lines
      .find((l) => l.startsWith("> ") && l.replace(/^>\s*/, "").trim().length > 0)
      ?.replace(/^>\s*/, "")
      .trim() ?? "";
  const steps = lines
    .filter((l) => l.startsWith("## "))
    .map((l) => l.replace(/^##\s+/, "").trim())
    .map((label) => ({ id: slugifyHeading(label), label }));
  return { slug, title: h1, description, steps };
}

function safeSlug(slug: string) {
  return /^[a-z0-9][a-z0-9-]*$/.test(slug) ? slug : null;
}

/** Flujos ordenados por nombre de archivo (`01-*.md`, `02-*.md`, …). */
export async function listFlows(): Promise<FlowMeta[]> {
  let files: string[] = [];
  try {
    files = (await fs.readdir(FLOWS_DIR)).filter((f) => f.endsWith(".md")).sort();
  } catch {
    return [];
  }
  const flows: FlowMeta[] = [];
  for (const file of files) {
    const slug = file.replace(/\.md$/, "");
    if (!safeSlug(slug)) continue;
    const markdown = await fs.readFile(path.join(FLOWS_DIR, file), "utf-8");
    flows.push(parseFlow(slug, markdown));
  }
  return flows;
}

export async function getFlow(slug: string): Promise<FlowDoc | null> {
  if (!safeSlug(slug)) return null;
  try {
    const markdown = await fs.readFile(path.join(FLOWS_DIR, `${slug}.md`), "utf-8");
    return { ...parseFlow(slug, markdown), markdown };
  } catch {
    return null;
  }
}
