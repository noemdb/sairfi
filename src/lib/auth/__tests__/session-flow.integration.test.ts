import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';

const DB = !!process.env.DATABASE_URL;

const store = new Map<string, string>();
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (n: string) => {
      const v = store.get(n);
      return v === undefined ? undefined : { value: v };
    },
    set: (n: string, v: string) => {
      store.set(n, v);
    },
    delete: (n: string) => {
      store.delete(n);
    },
  })),
  headers: vi.fn(async () => ({ get: () => null })),
}));

import { prisma } from '@/lib/db/client';
import { hashPassword } from '@/lib/auth/password';
import { createSession, destroySession, getSessionUser, hashToken } from '@/lib/auth/session';

const tag = `t${Date.now()}`;
const emails = { owner: `owner.${tag}@example.invalid`, admin: `admin.${tag}@example.invalid` };

function useToken(token: string | null) {
  store.clear();
  if (token) {
    // El nombre efectivo depende del entorno (__Host- se degrada en no-prod);
    // se fijan ambas variantes para no acoplar el test a ese detalle.
    store.set('session', token);
    store.set('__Host-session', token);
  }
}

describe.skipIf(!DB)('flujo de sesiones contra DB (Fase M, SECURITY.md)', { timeout: 30000 }, () => {
  let ownerId = '';
  let adminId = '';

  beforeAll(async () => {
    const hash = await hashPassword('Clave1234');
    const owner = await prisma.user.create({
      data: { email: emails.owner, name: 'Owner Test', passwordHash: hash },
    });
    const admin = await prisma.user.create({
      data: {
        email: emails.admin,
        name: 'Admin Test',
        passwordHash: hash,
        roles: { create: [{ role: { connect: { id: 'role-admin' } } }] },
      },
    });
    ownerId = owner.id;
    adminId = admin.id;
  });

  afterAll(async () => {
    store.clear();
    await prisma.session.deleteMany({ where: { userId: { in: [ownerId, adminId] } } });
    // submissions de prueba no se crean aquí; el borrado de usuario arrastra sus audit_logs
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, adminId] } } });
  });

  it('sesión válida resuelve el usuario (solo hash en DB, nunca el token)', async () => {
    const { token } = await createSession(ownerId, {});
    const row = await prisma.session.findUniqueOrThrow({ where: { tokenHash: hashToken(token) } });
    expect(row.tokenHash).not.toContain(token);
    useToken(token);
    const me = await getSessionUser();
    expect(me?.id).toBe(ownerId);
    expect(me?.role).toBe('RESPONDENT');
  });

  it('logout revoca: la sesión desaparece y el usuario queda en null', async () => {
    const { token } = await createSession(ownerId, {});
    useToken(token);
    expect(await getSessionUser()).not.toBeNull();
    await destroySession();
    expect(await getSessionUser()).toBeNull();
    expect(await prisma.session.findUnique({ where: { tokenHash: hashToken(token) } })).toBeNull();
  });

  it('sesión expirada se elimina sola y no autentica', async () => {
    const { token } = await createSession(ownerId, {});
    await prisma.session.update({
      where: { tokenHash: hashToken(token) },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    useToken(token);
    expect(await getSessionUser()).toBeNull();
    expect(await prisma.session.findUnique({ where: { tokenHash: hashToken(token) } })).toBeNull();
  });

  it('el rol legacy se resuelve desde RoleUser (administrador→ADMIN, sin roles→RESPONDENT)', async () => {
    const { token: tAdmin } = await createSession(adminId, {});
    useToken(tAdmin);
    const admin = await getSessionUser();
    expect(admin?.role).toBe('ADMIN');
    expect(admin?.roles).toContain('administrador');
    await prisma.session.deleteMany({ where: { userId: adminId } });

    const { token: tOwner } = await createSession(ownerId, {});
    useToken(tOwner);
    expect((await getSessionUser())?.role).toBe('RESPONDENT');
    await prisma.session.deleteMany({ where: { userId: ownerId } });
    store.clear();
  });

  it('usuario desactivado pierde acceso aunque el token exista', async () => {
    const { token } = await createSession(adminId, {});
    await prisma.user.update({ where: { id: adminId }, data: { active: false } });
    useToken(token);
    expect(await getSessionUser()).toBeNull();
    await prisma.user.update({ where: { id: adminId }, data: { active: true } });
    await prisma.session.deleteMany({ where: { userId: adminId } });
  });

  it('cookie huérfana (sin fila en DB) se limpia y no autentica', async () => {
    useToken('token-que-no-existe-en-db');
    expect(await getSessionUser()).toBeNull();
    expect(store.size).toBe(0);
  });
});
