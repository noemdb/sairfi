---
name: beautiful-ui
description: Embellece el front con UI estilo shadcn (landing, header, primitivos). Use ONLY when the user asks to beautify the frontend, improve UX, add shadcn components, or mentions beautiful-ui, embellecer front, or NameThatUI-style blocks.
---

# beautiful-ui

Skill de proyecto SAIRFI: sistema de diseño shadcn-style ya instalado. Reutilizar en vez de reinventar.

## Stack instalado (no reinstalar salvo que falte)

- `components.json` (estilo `new-york`, aliases `@/*`, CSS `src/app/globals.css`, iconos `lucide`)
- `src/lib/utils.ts` → `cn()` (`clsx` + `tailwind-merge`)
- Deps: `class-variance-authority`, `lucide-react`, `tw-animate-css`, `@radix-ui/{slot,dialog,dropdown-menu,avatar,separator,progress}`
- Tokens en `src/app/globals.css`: `--primary:#0f2b46`, `--ring:#0ea5e9`, `--radius:0.75rem`, light-only (`color-scheme: light`, sin `.dark`)

## Primitivos disponibles

| Archivo | Exporta | Notas |
|---|---|---|
| `src/components/ui/button.tsx` | `Button`, `buttonVariants` | `cva` + `Slot` (`asChild`). Alias legacy `primary` → `default`. Sizes `sm/md/lg`, `default` = `h-9`. |
| `src/components/ui/card.tsx` | `Card/Header/Title/Description/Action/Content/Footer` | Re-exporta `Badge` (compat con 10+ páginas que importan `Badge` desde card). |
| `src/components/ui/badge.tsx` | `Badge` | Variants: `default/secondary/destructive/outline/success/warning/muted`. |
| `src/components/ui/input.tsx` | `Input/Textarea/Label/FieldError/HelpText` | Estilo shadcn con `cn()`. |
| `src/components/ui/dialog.tsx` | `Dialog/Trigger/Content/Header/Footer/Title/Description/Close/...` | Radix. `DialogContent` trae `showCloseButton` y acepta props extra (`role`, `aria-*`). |
| `src/components/ui/dropdown-menu.tsx` | `DropdownMenu/...` | Estilo shadcn, content `rounded-2xl`. |
| `src/components/ui/avatar.tsx` | `Avatar/Image/Fallback` | Fallback con gradiente marca. |
| `src/components/ui/separator.tsx`, `skeleton.tsx`, `progress.tsx` | — | Estándar shadcn. |
| `src/components/ui/toast.tsx` | `ToastProvider/useToast` | Artesanal del proyecto, conservar. |
| `src/components/layout/app-shell.tsx` | `AppHeader`, `PageContainer` | Header sticky + acento fiscal degradado. |
| `src/components/layout/user-menu.tsx` | `UserMenu` | `DropdownMenu` + `Avatar` + `Badge` rol. |

## Patrones obligatorios

1. **Variantes con `cva` + `cn`**, nunca concatenar strings a mano:
   ```tsx
   import { cn } from "@/lib/utils";
   className={cn(buttonVariants({ variant, size }), className)}
   ```
2. **CTA como link accesible** (no `<Link><button>`):
   ```tsx
   <Button size="lg" asChild className="rounded-full px-7">
     <Link href="/login">Entrar al sistema <ArrowRight aria-hidden /></Link>
   </Button>
   ```
3. **Hero landing** (`src/app/landing-content.tsx` es la referencia): fondo mesh + retícula con `[mask-image:radial-gradient(...)]`, `Badge` pill, `h1` `text-balance`, mock `Card` panel fiscal + badges flotantes, bento 4 cards con icono en `h-9 w-9 rounded-xl` que invierte a sólido en `group-hover`, pasos numerados, CTA final en degradado `#0f2b46→#1e5a96` con `CardDescription text-slate-200`.
4. **Compat**: `variant="primary"` y `size="md/lg"` siguen válidos en `Button`; `Badge` importable desde `@/components/ui/card`.
5. **Tests que no romper**: `src/app/__tests__/landing-content.test.tsx` exige textos `Motor versionado`, `Trazabilidad completa`, `Del registro al cierre`, links `Entrar al sistema→/login`, `Hacer el diagnóstico→/login`, `Ir al dashboard→/dashboard`, `Continuar→/dashboard`, saludo `Hola, {name}`. Mantener estos strings al rediseñar.

## Agregar un componente shadcn nuevo

1. Revisar si ya existe en `src/components/ui/`.
2. Si falta (ej. `table`, `tabs`, `tooltip`, `sheet`, `sonner`): crear el archivo estilo shadcn con `cn()` y tokens (`bg-popover`, `border-border`, `rounded-2xl`), sin introducir modo dark.
3. Reexportar alias legacy si alguna página ya importa ese nombre desde otro path.

## Verificación

```bash
npx tsc --noEmit
npx vitest run src/app/__tests__/landing-content.test.tsx
npx eslint <archivos tocados>
npm run build
```

## No hacer

- No correr `npx shadcn@latest init` interactivo (ya inicializado vía `components.json` + `utils` + `globals.css`).
- No introducir `.dark` / `dark:` salvo `aria-invalid` que ya trae el patrón shadcn.
- No cambiar la API pública de `Button/Card/Input/Dialog` sin actualizar sus ~42 usos (`grep 'from "@/components/ui/'`).
- No usar emojis en UI; iconos solo `lucide-react`.
