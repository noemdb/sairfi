/**
 * @vitest-environment node
 * Entorno node (no jsdom): las rutas usan File/FormData/Request nativos,
 * igual que el runtime de Next. Los demás tests siguen en jsdom.
 */
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

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/client';
import { hashPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { createSubmission } from '@/lib/domain/submissions';
import { registerAttachment } from '@/lib/domain/attachments';
import { POST as postSubmission } from '@/app/api/submissions/route';
import { POST as postUpload } from '@/app/api/uploads/route';
import { GET as getFile } from '@/app/api/files/[id]/route';
import { GET as getExport } from '@/app/api/export/[id]/route';

const tag = `t${Date.now()}`;

function useToken(token: string | null) {
  store.clear();
  if (token) {
    store.set('session', token);
    store.set('__Host-session', token);
  }
}

function req(url: string, init?: { method?: string; body?: FormData }) {
  return new NextRequest(`http://localhost${url}`, init);
}

describe.skipIf(!DB)('rutas HTTP Fase M (envolvente convenida)', { timeout: 60000 }, () => {
  let ownerId = '';
  let strangerId = '';
  let ownerToken = '';
  let strangerToken = '';
  let submissionId = '';
  let attachmentId = '';
  const userIds: string[] = [];

  beforeAll(async () => {
    const hash = await hashPassword('Clave1234');
    const owner = await prisma.user.create({
      data: { email: `owner.${tag}@example.invalid`, name: 'Owner R', passwordHash: hash },
    });
    const stranger = await prisma.user.create({
      data: { email: `stranger.${tag}@example.invalid`, name: 'Stranger R', passwordHash: hash },
    });
    ownerId = owner.id;
    strangerId = stranger.id;
    userIds.push(ownerId, strangerId);
    ownerToken = (await createSession(ownerId, {})).token;
    strangerToken = (await createSession(strangerId, {})).token;
    const sub = await createSubmission(ownerId);
    submissionId = sub.id;
    const att = await registerAttachment({
      submissionId,
      sectionNumber: 1,
      category: 'BALANCE',
      originalName: 'b.pdf',
      pathname: `submissions/${submissionId}/b.pdf`,
      blobUrl: `local://submissions/${submissionId}/b.pdf`,
      mimeType: 'application/pdf',
      extension: 'pdf',
      sizeBytes: 512,
      uploadedById: ownerId,
    });
    attachmentId = att.id;
  });

  afterAll(async () => {
    store.clear();
    await prisma.formSubmission.deleteMany({ where: { id: submissionId } });
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  it('POST /api/submissions: 401 sin sesión, 201 con envolvente autenticado', async () => {
    useToken(null);
    const anon = await postSubmission(req('/api/submissions', { method: 'POST' }));
    expect(anon.status).toBe(401);
    expect(((await anon.json()) as { error: { code: string } }).error.code).toBe('UNAUTHENTICATED');

    useToken(ownerToken);
    const res = await postSubmission(req('/api/submissions', { method: 'POST' }));
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { id: string } };
    expect(body.data.id).toBeTruthy();
    await prisma.formSubmission.deleteMany({ where: { id: body.data.id } });
  });

  it('POST /api/uploads: valida campos, extensión y propiedad con códigos', async () => {
    useToken(ownerToken);
    const empty = await postUpload(req('/api/uploads', { method: 'POST', body: new FormData() }));
    expect(empty.status).toBe(400);
    expect(((await empty.json()) as { error: { code: string } }).error.code).toBe('VALIDATION_ERROR');

    const fd = new FormData();
    fd.set('file', new File(['x'], 'mal.exe', { type: 'application/octet-stream' }));
    fd.set('submissionId', submissionId);
    fd.set('sectionNumber', '1');
    fd.set('category', 'OTHER');
    const badExt = await postUpload(req('/api/uploads', { method: 'POST', body: fd }));
    expect(badExt.status).toBe(400);

    useToken(strangerToken);
    const fd2 = new FormData();
    fd2.set('file', new File(['x'], 'ok.pdf', { type: 'application/pdf' }));
    fd2.set('submissionId', submissionId);
    fd2.set('sectionNumber', '1');
    fd2.set('category', 'OTHER');
    const forbidden = await postUpload(req('/api/uploads', { method: 'POST', body: fd2 }));
    expect(forbidden.status).toBe(403);
  });

  it('GET /api/files/[id]: dueño 200, ajeno 403 indistinguible', async () => {
    useToken(ownerToken);
    const ok = await getFile(req(`/api/files/${attachmentId}`), { params: Promise.resolve({ id: attachmentId }) });
    expect(ok.status).toBe(200);

    useToken(strangerToken);
    const denied = await getFile(req(`/api/files/${attachmentId}`), { params: Promise.resolve({ id: attachmentId }) });
    expect(denied.status).toBe(403);
  });

  it('GET /api/export/[id]: dueño descarga auditada, ajeno 403, inexistente 404', async () => {
    useToken(strangerToken);
    const denied = await getExport(req(`/api/export/${submissionId}`), { params: Promise.resolve({ id: submissionId }) });
    expect(denied.status).toBe(403);

    useToken(ownerToken);
    const missing = await getExport(req('/api/export/no-existe'), { params: Promise.resolve({ id: 'no-existe' }) });
    expect(missing.status).toBe(404);

    const res = await getExport(req(`/api/export/${submissionId}`), { params: Promise.resolve({ id: submissionId }) });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-disposition') || '').toContain('attachment');
    const audits = await prisma.auditLog.count({
      where: { action: 'FILE_DOWNLOADED', entityId: submissionId },
    });
    expect(audits).toBeGreaterThanOrEqual(1);
  });
});
