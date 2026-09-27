-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'COMPANY_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'COMPANY_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'PERIOD_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'PERIOD_CLOSED';
ALTER TYPE "AuditAction" ADD VALUE 'PERIOD_REOPENED';

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "companyId" TEXT,
ADD COLUMN     "newValues" JSONB,
ADD COLUMN     "oldValues" JSONB;

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "recurso" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_user" (
    "role_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_user_pkey" PRIMARY KEY ("role_id","user_id")
);

-- ADR-011: roles con IDs fijos para backfills deterministas.
INSERT INTO "roles" ("id", "nombre", "descripcion") VALUES
  ('role-admin', 'administrador', 'Acceso total: empresas, usuarios, índices, parámetros y cierres.'),
  ('role-analyst', 'analista', 'Carga datos, ejecuta cálculos preliminares y genera reportes.'),
  ('role-accountant', 'contador', 'Clasifica partidas, revisa cálculos y aprueba resultados.'),
  ('role-advisor', 'asesor_tributario', 'Define reglas, valida tratamientos y aprueba cierres.'),
  ('role-auditor', 'auditor', 'Solo lectura: datos, historial y reportes.')
ON CONFLICT ("id") DO NOTHING;

-- Backfill defensivo (pre-vuelo vacío verificado; por si aparecen filas entremedio).
-- Debe correr ANTES del DROP COLUMN "role".
INSERT INTO "role_user" ("role_id", "user_id")
  SELECT 'role-admin', "id" FROM "users" WHERE "role" = 'ADMIN'
  ON CONFLICT DO NOTHING;
INSERT INTO "role_user" ("role_id", "user_id")
  SELECT 'role-analyst', "id" FROM "users" WHERE "role" = 'RESPONDENT'
  ON CONFLICT DO NOTHING;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "role";

-- DropEnum
DROP TYPE "UserRole";

-- CreateTable
CREATE TABLE "permission_role" (
    "permission_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permission_role_pkey" PRIMARY KEY ("permission_id","role_id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "rif" VARCHAR(20) NOT NULL,
    "direccion_fiscal" TEXT,
    "actividad_economica" VARCHAR(255),
    "fecha_inicio_operaciones" TIMESTAMP(3),
    "fecha_cierre_fiscal_habitual" VARCHAR(5),
    "estado" VARCHAR(20) NOT NULL DEFAULT 'ACTIVA',
    "configuracion" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_user" (
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_user_pkey" PRIMARY KEY ("company_id","user_id")
);

-- CreateTable
CREATE TABLE "fiscal_periods" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_cierre" TIMESTAMP(3) NOT NULL,
    "estado" VARCHAR(30) NOT NULL DEFAULT 'BORRADOR',
    "tipo" VARCHAR(20) NOT NULL DEFAULT 'REGULAR',
    "ejercicio_anterior_id" TEXT,
    "aprobado_por_id" TEXT,
    "aprobado_en" TIMESTAMP(3),
    "cerrado_en" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fiscal_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_indices" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "tipo" VARCHAR(20) NOT NULL DEFAULT 'INPC',
    "fuente" VARCHAR(100) NOT NULL,
    "anio" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "valor" DECIMAL(20,6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'BORRADOR',
    "archivo_soporte_id" TEXT,
    "aprobado_por_id" TEXT,
    "aprobado_en" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_indices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiscal_items" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "fiscal_period_id" TEXT NOT NULL,
    "cuenta_contable" VARCHAR(50) NOT NULL,
    "nombre_cuenta" VARCHAR(255) NOT NULL,
    "tipo" VARCHAR(20) NOT NULL,
    "clasificacion_monetaria" VARCHAR(20),
    "categoria_fiscal" VARCHAR(50),
    "fecha_adquisicion" TIMESTAMP(3),
    "valor_historico" DECIMAL(18,2) NOT NULL,
    "valor_fiscal_base" DECIMAL(18,2) NOT NULL,
    "ajuste_acumulado" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "valor_fiscal_actualizado" DECIMAL(18,2),
    "indice_base" DECIMAL(20,6),
    "indice_cierre" DECIMAL(20,6),
    "factor_aplicado" DECIMAL(20,8),
    "vida_util" INTEGER,
    "metodo_depreciacion" VARCHAR(50),
    "estado" VARCHAR(30) NOT NULL DEFAULT 'ACTIVA',
    "documento_soporte_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fiscal_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiscal_movements" (
    "id" TEXT NOT NULL,
    "fiscal_item_id" TEXT NOT NULL,
    "fiscal_period_id" TEXT NOT NULL,
    "tipo" VARCHAR(30) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "valor" DECIMAL(18,2) NOT NULL,
    "documento_soporte_id" TEXT,
    "indice_base" DECIMAL(20,6),
    "indice_cierre" DECIMAL(20,6),
    "factor_aplicado" DECIMAL(20,8),
    "ajuste_generado" DECIMAL(18,2),
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fiscal_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adjustment_calculations" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "fiscal_period_id" TEXT NOT NULL,
    "tipo" VARCHAR(30) NOT NULL,
    "fecha_calculo" TIMESTAMP(3) NOT NULL,
    "version_reglas" VARCHAR(50) NOT NULL,
    "version_indices" VARCHAR(50) NOT NULL,
    "estado" VARCHAR(30) NOT NULL DEFAULT 'BORRADOR',
    "ajuste_total_activos" DECIMAL(18,2),
    "ajuste_total_pasivos" DECIMAL(18,2),
    "efecto_neto_patrimonio" DECIMAL(18,2),
    "aprobado_por_id" TEXT,
    "aprobado_en" TIMESTAMP(3),
    "cerrado_en" TIMESTAMP(3),
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adjustment_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calculation_results" (
    "id" TEXT NOT NULL,
    "adjustment_calculation_id" TEXT NOT NULL,
    "fiscal_item_id" TEXT NOT NULL,
    "valor_base" DECIMAL(18,2) NOT NULL,
    "indice_base" DECIMAL(20,6) NOT NULL,
    "indice_cierre" DECIMAL(20,6) NOT NULL,
    "factor_aplicado" DECIMAL(20,8) NOT NULL,
    "valor_actualizado" DECIMAL(18,2) NOT NULL,
    "ajuste_generado" DECIMAL(18,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calculation_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batches" (
    "id" TEXT NOT NULL,
    "fiscal_period_id" TEXT NOT NULL,
    "tipo" VARCHAR(30) NOT NULL,
    "nombre_archivo" VARCHAR(255) NOT NULL,
    "archivo_id" TEXT,
    "filas_totales" INTEGER NOT NULL,
    "filas_validas" INTEGER NOT NULL,
    "filas_rechazadas" INTEGER NOT NULL,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'PROCESADO',
    "errores" JSONB,
    "importado_por_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "nombre_original" VARCHAR(255) NOT NULL,
    "nombre_almacenado" VARCHAR(255) NOT NULL,
    "tipo_mime" VARCHAR(100) NOT NULL,
    "tamano_bytes" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "subido_por_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_nombre_key" ON "roles"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_nombre_key" ON "permissions"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_recurso_accion_key" ON "permissions"("recurso", "accion");

-- CreateIndex
CREATE UNIQUE INDEX "companies_rif_key" ON "companies"("rif");

-- CreateIndex
CREATE INDEX "companies_estado_idx" ON "companies"("estado");

-- CreateIndex
CREATE INDEX "fiscal_periods_company_id_idx" ON "fiscal_periods"("company_id");

-- CreateIndex
CREATE INDEX "fiscal_periods_estado_idx" ON "fiscal_periods"("estado");

-- CreateIndex
CREATE INDEX "fiscal_periods_tipo_idx" ON "fiscal_periods"("tipo");

-- CreateIndex
CREATE INDEX "fiscal_periods_ejercicio_anterior_id_idx" ON "fiscal_periods"("ejercicio_anterior_id");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_periods_company_id_fecha_inicio_fecha_cierre_key" ON "fiscal_periods"("company_id", "fecha_inicio", "fecha_cierre");

-- CreateIndex
CREATE INDEX "price_indices_company_id_idx" ON "price_indices"("company_id");

-- CreateIndex
CREATE INDEX "price_indices_tipo_idx" ON "price_indices"("tipo");

-- CreateIndex
CREATE INDEX "price_indices_anio_idx" ON "price_indices"("anio");

-- CreateIndex
CREATE INDEX "price_indices_mes_idx" ON "price_indices"("mes");

-- CreateIndex
CREATE INDEX "price_indices_estado_idx" ON "price_indices"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "price_indices_company_id_tipo_fuente_anio_mes_version_key" ON "price_indices"("company_id", "tipo", "fuente", "anio", "mes", "version");

-- CreateIndex
CREATE INDEX "fiscal_items_company_id_idx" ON "fiscal_items"("company_id");

-- CreateIndex
CREATE INDEX "fiscal_items_fiscal_period_id_idx" ON "fiscal_items"("fiscal_period_id");

-- CreateIndex
CREATE INDEX "fiscal_items_tipo_idx" ON "fiscal_items"("tipo");

-- CreateIndex
CREATE INDEX "fiscal_items_clasificacion_monetaria_idx" ON "fiscal_items"("clasificacion_monetaria");

-- CreateIndex
CREATE INDEX "fiscal_items_categoria_fiscal_idx" ON "fiscal_items"("categoria_fiscal");

-- CreateIndex
CREATE INDEX "fiscal_items_cuenta_contable_idx" ON "fiscal_items"("cuenta_contable");

-- CreateIndex
CREATE INDEX "fiscal_items_estado_idx" ON "fiscal_items"("estado");

-- CreateIndex
CREATE INDEX "fiscal_items_fiscal_period_id_clasificacion_monetaria_idx" ON "fiscal_items"("fiscal_period_id", "clasificacion_monetaria");

-- CreateIndex
CREATE INDEX "fiscal_movements_fiscal_item_id_idx" ON "fiscal_movements"("fiscal_item_id");

-- CreateIndex
CREATE INDEX "fiscal_movements_fiscal_period_id_idx" ON "fiscal_movements"("fiscal_period_id");

-- CreateIndex
CREATE INDEX "fiscal_movements_tipo_idx" ON "fiscal_movements"("tipo");

-- CreateIndex
CREATE INDEX "fiscal_movements_fecha_idx" ON "fiscal_movements"("fecha");

-- CreateIndex
CREATE INDEX "adjustment_calculations_company_id_idx" ON "adjustment_calculations"("company_id");

-- CreateIndex
CREATE INDEX "adjustment_calculations_fiscal_period_id_idx" ON "adjustment_calculations"("fiscal_period_id");

-- CreateIndex
CREATE INDEX "adjustment_calculations_tipo_idx" ON "adjustment_calculations"("tipo");

-- CreateIndex
CREATE INDEX "adjustment_calculations_estado_idx" ON "adjustment_calculations"("estado");

-- CreateIndex
CREATE INDEX "calculation_results_adjustment_calculation_id_idx" ON "calculation_results"("adjustment_calculation_id");

-- CreateIndex
CREATE INDEX "calculation_results_fiscal_item_id_idx" ON "calculation_results"("fiscal_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "calculation_results_adjustment_calculation_id_fiscal_item_i_key" ON "calculation_results"("adjustment_calculation_id", "fiscal_item_id");

-- CreateIndex
CREATE INDEX "import_batches_fiscal_period_id_idx" ON "import_batches"("fiscal_period_id");

-- CreateIndex
CREATE INDEX "import_batches_tipo_idx" ON "import_batches"("tipo");

-- CreateIndex
CREATE INDEX "import_batches_estado_idx" ON "import_batches"("estado");

-- CreateIndex
CREATE INDEX "files_company_id_idx" ON "files"("company_id");

-- CreateIndex
CREATE INDEX "files_subido_por_id_idx" ON "files"("subido_por_id");

-- CreateIndex
CREATE INDEX "audit_logs_companyId_idx" ON "audit_logs"("companyId");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_user" ADD CONSTRAINT "role_user_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_user" ADD CONSTRAINT "role_user_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_role" ADD CONSTRAINT "permission_role_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_role" ADD CONSTRAINT "permission_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_user" ADD CONSTRAINT "company_user_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_user" ADD CONSTRAINT "company_user_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_periods" ADD CONSTRAINT "fiscal_periods_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_periods" ADD CONSTRAINT "fiscal_periods_ejercicio_anterior_id_fkey" FOREIGN KEY ("ejercicio_anterior_id") REFERENCES "fiscal_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_periods" ADD CONSTRAINT "fiscal_periods_aprobado_por_id_fkey" FOREIGN KEY ("aprobado_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_indices" ADD CONSTRAINT "price_indices_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_indices" ADD CONSTRAINT "price_indices_archivo_soporte_id_fkey" FOREIGN KEY ("archivo_soporte_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_indices" ADD CONSTRAINT "price_indices_aprobado_por_id_fkey" FOREIGN KEY ("aprobado_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_items" ADD CONSTRAINT "fiscal_items_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_items" ADD CONSTRAINT "fiscal_items_fiscal_period_id_fkey" FOREIGN KEY ("fiscal_period_id") REFERENCES "fiscal_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_items" ADD CONSTRAINT "fiscal_items_documento_soporte_id_fkey" FOREIGN KEY ("documento_soporte_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_movements" ADD CONSTRAINT "fiscal_movements_fiscal_item_id_fkey" FOREIGN KEY ("fiscal_item_id") REFERENCES "fiscal_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_movements" ADD CONSTRAINT "fiscal_movements_fiscal_period_id_fkey" FOREIGN KEY ("fiscal_period_id") REFERENCES "fiscal_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_movements" ADD CONSTRAINT "fiscal_movements_documento_soporte_id_fkey" FOREIGN KEY ("documento_soporte_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjustment_calculations" ADD CONSTRAINT "adjustment_calculations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjustment_calculations" ADD CONSTRAINT "adjustment_calculations_fiscal_period_id_fkey" FOREIGN KEY ("fiscal_period_id") REFERENCES "fiscal_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjustment_calculations" ADD CONSTRAINT "adjustment_calculations_aprobado_por_id_fkey" FOREIGN KEY ("aprobado_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculation_results" ADD CONSTRAINT "calculation_results_adjustment_calculation_id_fkey" FOREIGN KEY ("adjustment_calculation_id") REFERENCES "adjustment_calculations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calculation_results" ADD CONSTRAINT "calculation_results_fiscal_item_id_fkey" FOREIGN KEY ("fiscal_item_id") REFERENCES "fiscal_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_fiscal_period_id_fkey" FOREIGN KEY ("fiscal_period_id") REFERENCES "fiscal_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_archivo_id_fkey" FOREIGN KEY ("archivo_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_importado_por_id_fkey" FOREIGN KEY ("importado_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_subido_por_id_fkey" FOREIGN KEY ("subido_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Índices parciales MANUALES (Prisma no los expresa en el schema; no tocar
-- sin actualizar DATABASE.md §3 y las notas del schema.prisma).
-- R-204: un solo ejercicio no cerrado por empresa (corrección §0 #2).
CREATE UNIQUE INDEX "fiscal_periods_company_open"
  ON "fiscal_periods"("company_id")
  WHERE "estado" NOT IN ('CERRADO', 'ANULADO');
-- Índices globales price_indices (company_id NULL: los NULL no se consideran iguales).
CREATE UNIQUE INDEX "price_indices_global"
  ON "price_indices"("tipo", "fuente", "anio", "mes", "version")
  WHERE "company_id" IS NULL;

