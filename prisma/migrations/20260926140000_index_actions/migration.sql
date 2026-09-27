-- Acciones de auditoría de índices (Fase 2; patrón ADD VALUE seguro).
ALTER TYPE "AuditAction" ADD VALUE 'INDEX_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'INDEX_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE 'INDEX_REPLACED';
