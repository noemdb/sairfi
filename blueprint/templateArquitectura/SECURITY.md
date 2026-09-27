# SECURITY.md — {{Nombre del Proyecto}}

> Se llena en el Paso 05, antes de conectar cualquier dato o servicio sensible. No se negocia, sin importar qué tan simple parezca el proyecto.

## Gestión de secretos
- **Dónde viven las API keys / credenciales:** variables de entorno (`.env`, nunca en el repo).
- **Checklist:**
  - [ ] `.env` está en `.gitignore`
  - [ ] Existe un `.env.example` sin valores reales
  - [ ] Las claves de producción no son las mismas que las de desarrollo

## Autenticación
- **Estrategia:** {{sesión, JWT, OAuth...}}
- **Expiración de sesión/token:**
- **Manejo de contraseñas (si aplica):** {{hashing usado, política de complejidad}}

## Autorización — Matriz RBAC
| Rol | Recurso | Crear | Leer | Actualizar | Eliminar |
|---|---|---|---|---|---|
| | | | | | |

*(actualizar esta tabla desde el primer control de acceso que se implemente, no al final)*

## Validación de inputs
- **Dónde se valida:** {{cliente + servidor, nunca confiar solo en el cliente}}
- **Herramienta:** {{Zod u otro}}
- **Sanitización de datos de usuario antes de:** {{renderizado (XSS), queries (inyección), archivos subidos}}

## Rate limiting
| Endpoint / grupo | Límite | Ventana | Acción al exceder |
|---|---|---|---|
| | | | |

## Otros controles
- [ ] HTTPS forzado en producción
- [ ] Headers de seguridad configurados (CSP, HSTS, etc.)
- [ ] CORS configurado explícitamente (no `*` en producción)
- [ ] Logs no exponen datos sensibles (contraseñas, tokens, PII)
- [ ] Backups de base de datos configurados y probados

## Amenazas conocidas y mitigación
| Amenaza | Probabilidad | Mitigación aplicada |
|---|---|---|
| | | |
