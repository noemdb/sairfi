-- Acciones de auditoría de partidas/movimientos (Fase 3; patrón ADD VALUE seguro).
ALTER TYPE "AuditAction" ADD VALUE 'ITEM_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'ITEM_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'MOVEMENT_CREATED';
