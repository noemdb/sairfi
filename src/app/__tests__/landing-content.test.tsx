import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={typeof href === 'string' ? href : ''}>{children}</a>,
}));

import { LandingContent } from '@/app/landing-content';

const user = { id: 'u1', email: 'a@b.com', name: 'Ana', role: 'RESPONDENT' as const, roles: [], active: true };

// Criterio ROADMAP Fase 1.5: el visitante entiende el producto y cómo entrar;
// el autenticado llega al app en un clic.
describe('landing SAIRFI (Fase 1.5)', () => {
  it('visitante: propuesta de valor + entrada al sistema + puerta del diagnóstico', () => {
    render(<LandingContent user={null} />);
    expect(screen.getByRole('heading', { name: /ajuste por inflación fiscal/i })).toBeInTheDocument();
    expect(screen.getByText('Motor versionado')).toBeInTheDocument();
    expect(screen.getByText('Trazabilidad completa')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /entrar al sistema/i })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: /hacer el diagnóstico/i })).toHaveAttribute('href', '/login');
    expect(screen.getByText(/del registro al cierre/i)).toBeInTheDocument();
  });

  it('autenticado: saludo + acceso al dashboard en un clic', () => {
    render(<LandingContent user={user} />);
    expect(screen.getByText(/hola, ana/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ir al dashboard/i })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: /continuar/i })).toHaveAttribute('href', '/dashboard');
  });
});
