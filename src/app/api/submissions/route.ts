import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getRequestMeta } from "@/lib/auth/session";
import { createSubmission } from "@/lib/domain/submissions";
import { auditLog } from "@/lib/auth/audit";

export async function POST(_req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const submission = await createSubmission(user.id);
    const meta = await getRequestMeta();
    await auditLog({
      userId: user.id,
      action: "SUBMISSION_CREATED",
      entity: "FormSubmission",
      entityId: submission.id,
      submissionId: submission.id,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({ id: submission.id }, { status: 201 });
  } catch (e) {
    console.error("[api/submissions] error", e);
    return NextResponse.json({ error: (e as Error).message || "Error interno" }, { status: 500 });
  }
}
