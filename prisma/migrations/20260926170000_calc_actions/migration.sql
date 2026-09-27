-- Acciones de auditoría del motor de cálculo (Fase 5; patrón ADD VALUE seguro).
ALTER TYPE "AuditAction" ADD VALUE 'CALC_EXECUTED';
ALTER TYPE "AuditAction" ADD VALUE 'CALC_SUBMITTED';
ALTER TYPE "AuditAction" ADD VALUE 'CALC_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE 'CALC_ANNULLED';
