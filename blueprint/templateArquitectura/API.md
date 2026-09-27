# API.md — {{Nombre del Proyecto}}

> Se llena por bloque, en el Paso 03, en el mismo momento en que se construye cada endpoint o Server Action — no al final del proyecto.

## Convenciones generales
- **Base URL / prefijo:**
- **Formato de respuesta estándar (éxito):**
  ```json
  { "data": {}, "meta": {} }
  ```
- **Formato de respuesta estándar (error):**
  ```json
  { "error": { "code": "", "message": "" } }
  ```
- **Autenticación:** {{header, cookie de sesión, etc.}}
- **Rate limiting por defecto:** {{ver detalle completo en SECURITY.md}}

## Endpoints / Server Actions

### `{{MÉTODO}} /ruta/del/endpoint`
- **Descripción:**
- **Auth requerida:** Sí/No — rol(es) permitido(s):
- **Request schema:**
  ```ts
  const RequestSchema = z.object({});
  ```
- **Response schema (éxito):**
  ```ts
  const ResponseSchema = z.object({});
  ```
- **Errores posibles:**
  | Código | Cuándo ocurre |
  |---|---|
  | 400 | |
  | 401 | |
  | 403 | |
  | 404 | |
  | 429 | Rate limit excedido |
- **Efectos secundarios:** {{emails, notificaciones, escritura en otras tablas, etc.}}
- **Criterios de aceptación:**
  - [ ]
  - [ ]

*(repetir por cada endpoint/acción, agrupando por recurso o módulo)*
