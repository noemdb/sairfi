// Matriz RBAC — ÚNICA fuente de verdad de permisos (Fase 1.2).
// - El runtime la consume vía hasPermission() / requirePermission().
// - prisma/seed.ts la importa para sembrar roles + permissions + asignaciones.
// - SECURITY.md § Autorización es su reflejo documental; si discrepan, manda este archivo.
// Roles: administrador, analista, contador, asesor_tributario, auditor (ARCHITECTURE.md §4.2).

export const ROLES = [
  { id: 'role-admin', nombre: 'administrador', descripcion: 'Acceso total: empresas, usuarios, índices, parámetros y cierres.' },
  { id: 'role-analyst', nombre: 'analista', descripcion: 'Carga datos, ejecuta cálculos preliminares y genera reportes.' },
  { id: 'role-accountant', nombre: 'contador', descripcion: 'Clasifica partidas, revisa cálculos y aprueba resultados.' },
  { id: 'role-advisor', nombre: 'asesor_tributario', descripcion: 'Define reglas, valida tratamientos y aprueba cierres.' },
  { id: 'role-auditor', nombre: 'auditor', descripcion: 'Solo lectura y exportación: datos, historial y reportes.' },
] as const;

export type RoleNombre = (typeof ROLES)[number]['nombre'];

// 'recurso:accion'. Acciones: create, read, update, delete + approve, close,
// reopen, export donde el dominio las exige (DOMAIN.md §3.5, API.md).
export const ROLE_PERMISSIONS: Record<RoleNombre, string[]> = {
  administrador: ['*:*'],
  analista: [
    'companies:read',
    'fiscal_periods:read',
    'price_indices:create', 'price_indices:read',
    'fiscal_items:create', 'fiscal_items:read', 'fiscal_items:update',
    'fiscal_movements:create', 'fiscal_movements:read', 'fiscal_movements:update',
    'calculations:create', 'calculations:read',
    'reports:read', 'reports:export',
    'imports:create', 'imports:read',
    'submissions:create', 'submissions:read', 'submissions:update', 'submissions:delete',
    'attachments:create', 'attachments:read', 'attachments:delete',
  ],
  contador: [
    'companies:read',
    'fiscal_periods:create', 'fiscal_periods:read', 'fiscal_periods:update', 'fiscal_periods:close',
    'price_indices:read', 'price_indices:approve',
    'fiscal_items:create', 'fiscal_items:read', 'fiscal_items:update',
    'fiscal_movements:create', 'fiscal_movements:read', 'fiscal_movements:update',
    'calculations:create', 'calculations:read', 'calculations:approve',
    'reports:read', 'reports:export',
    'imports:create', 'imports:read',
    'submissions:create', 'submissions:read', 'submissions:update', 'submissions:delete',
    'attachments:create', 'attachments:read', 'attachments:delete',
    'audit_logs:read',
  ],
  asesor_tributario: [
    'companies:read',
    'fiscal_periods:read', 'fiscal_periods:update', 'fiscal_periods:close', 'fiscal_periods:reopen',
    'price_indices:read', 'price_indices:approve',
    'fiscal_items:read',
    'fiscal_movements:read',
    'calculations:read', 'calculations:approve',
    'reports:read', 'reports:export',
    'imports:read',
    'submissions:read',
    'attachments:read',
    'audit_logs:read',
  ],
  auditor: [
    'companies:read',
    'fiscal_periods:read',
    'price_indices:read',
    'fiscal_items:read',
    'fiscal_movements:read',
    'calculations:read',
    'reports:read', 'reports:export',
    'imports:read',
    'audit_logs:read',
    'submissions:read',
    'attachments:read',
  ],
};

export function parsePermission(p: string): { recurso: string; accion: string } {
  const [recurso, accion] = p.split(':');
  return { recurso, accion };
}

/** Todos los permisos distintos del sistema (para sembrar la tabla permissions). */
export function allPermissions(): string[] {
  const set = new Set<string>();
  for (const perms of Object.values(ROLE_PERMISSIONS)) {
    for (const p of perms) if (p !== '*:*') set.add(p);
  }
  return [...set].sort();
}

export function hasPermission(roleNombres: string[], recurso: string, accion: string): boolean {
  const granted = new Set<string>();
  for (const nombre of roleNombres) {
    for (const p of ROLE_PERMISSIONS[nombre as RoleNombre] ?? []) granted.add(p);
  }
  return granted.has('*:*') || granted.has(`${recurso}:*`) || granted.has(`${recurso}:${accion}`);
}
