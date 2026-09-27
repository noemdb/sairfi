import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

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
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

import { prisma } from '@/lib/db/client';
import { hashPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { createSubmission } from '@/lib/domain/submissions';
import { registerAttachment } from '@/lib/domain/attachments';
import { saveDraftAction, submitSectionAction, reopenSectionAction } from '@/actions/sections';
import { registerAttachmentAction, deleteAttachmentAction } from '@/actions/attachments';
import { deleteSubmissionAction } from '@/actions/submissions';
import { createUserAction, deactivateUserAction } from '@/actions/auth';

const tag = `t${Date.now()}`;
const s1 = {
  objective: 'Automatizar el ajuste por inflación fiscal de la empresa cliente.',
  userTypes: ['Contador'],
  permissions: 'El contador clasifica partidas y aprueba cálculos del ejercicio.',
};
const caseA = {
  caseType: 'Ajuste inicial',
  identifier: 'ACT-001',
  initialBalances: 'Maquinaria 100.000 Bs.',
  date: '2024-12-31',
  inpc: '1234.5678',
  movements: 'Sin movimientos',
  expectedResult: 'Ajuste 50.000 Bs.',
  ruleExplanation: 'Factor = cierre / base según LISLR art. 174.',
};
const s3 = {
  dataOrigins: ['Excel/CSV'],
  inpcSource: 'Carga manual',
  inpcApprover: 'Contador responsable',
  criteria: 'Criterio de validación del INPC con más de cincuenta caracteres exigidos.',
  cases: [caseA, { ...caseA, identifier: 'ACT-002' }],
};

function useToken(token: string | null) {
  store.clear();
  if (token) {
    store.set('session', token);
    store.set('__Host-session', token);
  }
}

describe.skipIf(!DB)('flujo Fase M contra DB (propiedad, secciones, adjuntos, admin)', { timeout: 60000 }, () => {
  let ownerId = '';
  let adminId = '';
  let strangerId = '';
  let ownerToken = '';
  let adminToken = '';
  let strangerToken = '';
  const submissionIds: string[] = [];
  const userIds: string[] = [];

  beforeAll(async () => {
    const hash = await hashPassword('Clave1234');
    // Puente ADR-011: el input ADMIN/RESPONDENT se mapea a role-admin/role-analyst.
    const mk = (email: string, name: string, roleId: string | null) =>
      prisma.user.create({
        data: {
          email,
          name,
          passwordHash: hash,
          ...(roleId ? { roles: { create: [{ role: { connect: { id: roleId } } }] } } : {}),
        },
      });
    const owner = await mk(`owner.${tag}@example.invalid`, 'Owner M', null);
    const admin = await mk(`admin.${tag}@example.invalid`, 'Admin M', 'role-admin');
    const stranger = await mk(`stranger.${tag}@example.invalid`, 'Stranger M', null);
    ownerId = owner.id;
    adminId = admin.id;
    strangerId = stranger.id;
    userIds.push(ownerId, adminId, strangerId);
    ownerToken = (await createSession(ownerId, {})).token;
    adminToken = (await createSession(adminId, {})).token;
    strangerToken = (await createSession(strangerId, {})).token;
  });

  afterAll(async () => {
    store.clear();
    for (const id of submissionIds) {
      await prisma.formSubmission.deleteMany({ where: { id } });
    }
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  it('borrador guarda sin validar; envío valida y bloquea reenvío', async () => {
    useToken(ownerToken);
    const sub = await createSubmission(ownerId);
    submissionIds.push(sub.id);
    expect((await prisma.sectionSubmission.count({ where: { submissionId: sub.id } })).toString()).toBe('5');

    const draft = await saveDraftAction(sub.id, 1, { objective: 'corto' });
    expect(draft.ok).toBe(true); // parcial, sin validación estricta

    const bad = await submitSectionAction(sub.id, 1, { objective: 'corto' });
    expect(bad.ok).toBe(false);

    const sent = await submitSectionAction(sub.id, 1, s1);
    expect(sent.ok).toBe(true);
    const again = await submitSectionAction(sub.id, 1, s1);
    expect(again.ok).toBe(false);
    expect(again.message || '').toMatch(/enviada/i);
  });

  it('sección 3 exige 2 casos y los normaliza en transacción', async () => {
    useToken(ownerToken);
    const sub = await createSubmission(ownerId);
    submissionIds.push(sub.id);
    const one = await submitSectionAction(sub.id, 3, { ...s3, cases: [caseA] });
    expect(one.ok).toBe(false);
    const two = await submitSectionAction(sub.id, 3, s3);
    expect(two.ok).toBe(true);
    const sec = await prisma.sectionSubmission.findFirstOrThrow({
      where: { submissionId: sub.id, sectionNumber: 3 },
      include: { cases: true },
    });
    expect(sec.cases).toHaveLength(2);
    expect(String(sec.cases[0].inpc)).toContain('1234.5');
  });

  it('propiedad: ajeno no opera; ADMIN reabre y dueño borra', async () => {
    useToken(ownerToken);
    const sub = await createSubmission(ownerId);
    submissionIds.push(sub.id);
    await submitSectionAction(sub.id, 1, s1);

    useToken(strangerToken);
    const denied = await saveDraftAction(sub.id, 1, s1);
    expect(denied.ok).toBe(false);
    expect(denied.message || '').toMatch(/autorizado/i);
    await expect(reopenSectionAction(sub.id, 1)).rejects.toThrow(/autorizado/i);
    await expect(deleteSubmissionAction(sub.id)).rejects.toThrow(/autorizado/i);

    useToken(ownerToken);
    await expect(reopenSectionAction(sub.id, 1)).rejects.toThrow(/autorizado/i);

    useToken(adminToken);
    expect(await reopenSectionAction(sub.id, 1)).toMatchObject({ ok: true });

    useToken(ownerToken);
    expect(await deleteSubmissionAction(sub.id)).toMatchObject({ ok: true });
    expect(await prisma.formSubmission.findUnique({ where: { id: sub.id } })).toBeNull();
  });

  it('adjuntos: registro validado, borrado lógico y control de acceso', async () => {
    useToken(ownerToken);
    const sub = await createSubmission(ownerId);
    submissionIds.push(sub.id);
    const att = await registerAttachmentAction({
      submissionId: sub.id,
      sectionNumber: 2,
      category: 'BALANCE',
      originalName: 'balance.xlsx',
      pathname: `submissions/${sub.id}/balance.xlsx`,
      blobUrl: `local://submissions/${sub.id}/balance.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      extension: 'xlsx',
      sizeBytes: 2048,
    });
    expect(att.id).toBeTruthy();

    useToken(strangerToken);
    await expect(deleteAttachmentAction(att.id)).rejects.toThrow(/autorizado/i);

    useToken(ownerToken);
    expect(await deleteAttachmentAction(att.id)).toMatchObject({ ok: true });
    const row = await prisma.attachment.findUniqueOrThrow({ where: { id: att.id } });
    expect(row.deletedAt).not.toBeNull();

    // el registro directo también valida en servidor
    await expect(
      registerAttachment({
        submissionId: sub.id,
        sectionNumber: 2,
        category: 'BALANCE',
        originalName: 'mal.exe',
        pathname: 'x',
        blobUrl: 'local://x',
        mimeType: 'application/octet-stream',
        extension: 'exe',
        sizeBytes: 10,
        uploadedById: ownerId,
      }),
    ).rejects.toThrow(/no permitida/i);
  });

  it('admin: alta con email normalizado, duplicado rechazado, baja y anti-autobaja', async () => {
    useToken(adminToken);
    const fd = new FormData();
    fd.set('email', '  Nuevo.TEST@example.invalid  ');
    fd.set('name', 'Nuevo');
    fd.set('password', 'Clave1234');
    fd.set('role', 'RESPONDENT');
    const created = await createUserAction({ ok: false }, fd);
    expect(created.ok).toBe(true);
    const row = await prisma.user.findUniqueOrThrow({
      where: { email: 'nuevo.test@example.invalid' },
      include: { roles: { include: { role: true } } },
    });
    userIds.push(row.id);
    expect(row.roles.map((r) => r.role.id)).toEqual(['role-analyst']);

    const dup = await createUserAction({ ok: false }, fd);
    expect(dup.ok).toBe(false);

    expect(await deactivateUserAction(row.id)).toMatchObject({ ok: true });
    await expect(deactivateUserAction(adminId)).rejects.toThrow(/mismo/i);

    useToken(ownerToken);
    const denied = await createUserAction({ ok: false }, fd);
    expect(denied.ok).toBe(false);
  });
});
