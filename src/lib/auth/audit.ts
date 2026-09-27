import { prisma } from "@/lib/db/client";

type AuditParams = {
  userId: string;
  action:
    | "LOGIN"
    | "LOGOUT"
    | "SUBMISSION_CREATED"
    | "SUBMISSION_DELETED"
    | "SECTION_DRAFT_SAVED"
    | "SECTION_SUBMITTED"
    | "SECTION_REOPENED"
    | "FILE_UPLOADED"
    | "FILE_DELETED"
    | "FILE_DOWNLOADED"
    | "USER_CREATED"
    | "USER_DEACTIVATED"
    | "COMPANY_CREATED"
    | "COMPANY_UPDATED"
    | "PERIOD_CREATED"
    | "PERIOD_OPENED"
    | "PERIOD_CLOSED"
    | "PERIOD_REOPENED"
    | "INDEX_CREATED"
    | "INDEX_APPROVED"
    | "INDEX_REPLACED"
    | "ITEM_CREATED"
    | "ITEM_UPDATED"
    | "MOVEMENT_CREATED"
    | "IMPORT_CREATED"
    | "CALC_EXECUTED"
    | "CALC_SUBMITTED"
    | "CALC_APPROVED"
    | "CALC_ANNULLED";
  entity: string;
  entityId: string;
  submissionId?: string | null;
  companyId?: string | null;
  metadata?: Record<string, unknown>;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
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
        companyId: params.companyId || null,
        metadata: params.metadata ? (params.metadata as never) : undefined,
        oldValues: params.oldValues ? (params.oldValues as never) : undefined,
        newValues: params.newValues ? (params.newValues as never) : undefined,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });
  } catch (e) {
    console.error("[audit] failed", e);
  }
}
