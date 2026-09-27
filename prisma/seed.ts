import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import bcrypt from "bcryptjs";
import { ROLES, ROLE_PERMISSIONS, allPermissions, parsePermission } from "../src/lib/auth/permissions";

neonConfig.webSocketConstructor = ws;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL missing");
  const adapter = new PrismaNeon({ connectionString });
  const prisma = new PrismaClient({ adapter });

  // 1. Roles con IDs fijos (idempotente: crea o actualiza nombre/descripción)
  for (const r of ROLES) {
    await prisma.role.upsert({
      where: { id: r.id },
      update: { nombre: r.nombre, descripcion: r.descripcion },
      create: { id: r.id, nombre: r.nombre, descripcion: r.descripcion },
    });
  }

  // 2. Permisos derivados de la matriz (idempotente por nombre único)
  const perms = allPermissions();
  for (const p of perms) {
    const { recurso, accion } = parsePermission(p);
    await prisma.permission.upsert({
      where: { nombre: p },
      update: {},
      create: { nombre: p, recurso, accion, descripcion: `${accion} en ${recurso}` },
    });
  }

  // 3. Asignaciones rol→permiso (idempotente por clave compuesta).
  // El administrador usa '*:*' en la matriz y no necesita filas.
  let assignments = 0;
  for (const role of ROLES) {
    for (const p of ROLE_PERMISSIONS[role.nombre] ?? []) {
      if (p === "*:*") continue;
      const perm = await prisma.permission.findUniqueOrThrow({ where: { nombre: p } });
      await prisma.permissionRole.upsert({
        where: { permissionId_roleId: { permissionId: perm.id, roleId: role.id } },
        update: {},
        create: { permissionId: perm.id, roleId: role.id },
      });
      assignments++;
    }
  }
  console.log(`[seed] roles: ${ROLES.length}, permisos: ${perms.length}, asignaciones verificadas: ${assignments}`);

  // 4. Admin inicial (solo si está configurado; nunca duplica)
  const email = process.env.INITIAL_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD;

  if (!email || !password) {
    console.log("[seed] INITIAL_ADMIN_EMAIL/PASSWORD no configurados, omitiendo admin inicial");
    await prisma.$disconnect();
    return;
  }

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const hash = await bcrypt.hash(password, 12);
    user = await prisma.user.create({
      data: {
        email,
        name: "Administrador Inicial",
        passwordHash: hash,
        active: true,
        roles: { create: [{ role: { connect: { id: "role-admin" } } }] },
      },
    });
    console.log(`[seed] creado ADMIN ${user.email} id=${user.id}`);
  } else {
    // Asegura el rol aunque el usuario existiera de antes (p. ej. creado pre-RBAC)
    await prisma.roleUser.upsert({
      where: { roleId_userId: { roleId: "role-admin", userId: user.id } },
      update: {},
      create: { roleId: "role-admin", userId: user.id },
    });
    console.log(`[seed] usuario ${email} ya existe; rol administrador asegurado`);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
