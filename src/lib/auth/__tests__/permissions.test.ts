import { describe, expect, it } from 'vitest';
import { allPermissions, hasPermission, parsePermission, ROLES, ROLE_PERMISSIONS } from '@/lib/auth/permissions';

// SECURITY.md § Autorización: la matriz de aquí es la fuente de verdad.
describe('matriz RBAC', () => {
  it('tiene 5 roles con IDs fijos y permisos conocidos', () => {
    expect(ROLES.map((r) => r.id)).toEqual(['role-admin', 'role-analyst', 'role-accountant', 'role-advisor', 'role-auditor']);
    expect(allPermissions().length).toBeGreaterThan(20);
    expect(allPermissions()).toContain('calculations:approve');
    expect(parsePermission('fiscal_periods:reopen')).toEqual({ recurso: 'fiscal_periods', accion: 'reopen' });
  });

  it('administrador es wildcard total', () => {
    expect(hasPermission(['administrador'], 'users', 'delete')).toBe(true);
    expect(hasPermission(['administrador'], 'cualquier', 'cosa')).toBe(true);
  });

  it('analista opera partidas y ejecuta, pero no aprueba ni audita', () => {
    expect(hasPermission(['analista'], 'fiscal_items', 'create')).toBe(true);
    expect(hasPermission(['analista'], 'calculations', 'create')).toBe(true);
    expect(hasPermission(['analista'], 'calculations', 'approve')).toBe(false);
    expect(hasPermission(['analista'], 'audit_logs', 'read')).toBe(false);
    expect(hasPermission(['analista'], 'users', 'create')).toBe(false);
  });

  it('contador crea ejercicios y aprueba cálculos e índices, sin gestionar usuarios', () => {
    expect(hasPermission(['contador'], 'fiscal_periods', 'create')).toBe(true);
    expect(hasPermission(['contador'], 'calculations', 'approve')).toBe(true);
    expect(hasPermission(['contador'], 'price_indices', 'approve')).toBe(true);
    expect(hasPermission(['contador'], 'fiscal_periods', 'close')).toBe(true);
    expect(hasPermission(['contador'], 'users', 'create')).toBe(false);
  });

  it('asesor aprueba índices y reabre, sin cargar partidas', () => {
    expect(hasPermission(['asesor_tributario'], 'price_indices', 'approve')).toBe(true);
    expect(hasPermission(['asesor_tributario'], 'fiscal_periods', 'reopen')).toBe(true);
    expect(hasPermission(['asesor_tributario'], 'fiscal_items', 'create')).toBe(false);
  });

  it('auditor lee y exporta, sin mutar', () => {
    expect(hasPermission(['auditor'], 'calculations', 'read')).toBe(true);
    expect(hasPermission(['auditor'], 'reports', 'export')).toBe(true);
    expect(hasPermission(['auditor'], 'calculations', 'approve')).toBe(false);
    expect(hasPermission(['auditor'], 'submissions', 'delete')).toBe(false);
  });

  it('roles desconocidos o vacíos no autorizan nada', () => {
    expect(hasPermission([], 'reports', 'read')).toBe(false);
    expect(hasPermission(['inventado'], 'reports', 'read')).toBe(false);
  });

  it('los permisos se acumulan entre roles', () => {
    expect(hasPermission(['analista', 'auditor'], 'audit_logs', 'read')).toBe(true);
    expect(hasPermission(['analista', 'auditor'], 'calculations', 'approve')).toBe(false);
  });

  it('toda asignación de la matriz referencia permisos existentes', () => {
    const all = new Set(allPermissions());
    for (const [rol, perms] of Object.entries(ROLE_PERMISSIONS)) {
      for (const p of perms) {
        if (p === '*:*') continue;
        expect(all.has(p), `${rol} → ${p}`).toBe(true);
      }
    }
  });
});
