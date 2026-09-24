import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Configuración requerida para Neon en Node.js
neonConfig.webSocketConstructor = ws;

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // No lanzar en build (Vercel evalúa el módulo sin env); usar placeholder dummy.
    // En runtime Vercel sí tendrá DATABASE_URL y la primera query fallará con mensaje claro si sigue faltando.
    console.warn("[prisma] DATABASE_URL no está configurada — usando placeholder para build");
    const dummy = "postgresql://dummy:dummy@localhost:5432/dummy?sslmode=require";
    const adapter = new PrismaNeon({ connectionString: dummy });
    return new PrismaClient({ adapter }) as unknown as PrismaClient;
  }
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
}

// Lazy: evita ejecutar createPrismaClient durante `next build` si no hay env
let _prisma: PrismaClient | null = null;
function getPrisma(): PrismaClient {
  if (global.prismaGlobal) return global.prismaGlobal;
  if (_prisma) return _prisma;
  _prisma = createPrismaClient();
  if (process.env.NODE_ENV !== "production") global.prismaGlobal = _prisma;
  return _prisma;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const p = getPrisma() as unknown as Record<string | symbol, unknown>;
    const value = p[prop as string];
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(p) : value;
  },
}) as PrismaClient;
