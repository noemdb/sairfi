import { prisma } from "@/lib/db/client";

type AuditParams = {
  userId: string;
  action:
    | "LOGIN"
    | "LOGOUT"
    | "SUBMISSION_CREATED"
    | "SECTION_DRAFT_SAVED"
    | "SECTION_SUBMITTED"
    | "SECTION_REOPENED"
    | "FILE_UPLOADED"
    | "FILE_DELETED"
    | "FILE_DOWNLOADED"
    | "USER_CREATED"
    | "USER_DEACTIVATED";
  entity: string;
  entityId: string;
  submissionId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function auditLog(params: AuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action as never,
        entity: params.entity,
        entityId: params.entityId,
        submissionId: params.submissionId || null,
        metadata: params.metadata ? (params.metadata as never) : undefined,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });
  } catch (e) {
    console.error("[audit] failed", e);
  }
}
