BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Trayecto") THEN
    RAISE EXCEPTION 'Hay trayectos previos. Prepará una asignación de zona por trayecto antes de migrar.';
  END IF;
END $$;

CREATE TABLE "Zona" (
  "id" TEXT PRIMARY KEY,
  "nombre" TEXT NOT NULL,
  "clave" TEXT NOT NULL,
  "descripcion" TEXT NOT NULL DEFAULT '',
  "localidadId" TEXT NOT NULL,
  CONSTRAINT "Zona_localidadId_fkey" FOREIGN KEY ("localidadId") REFERENCES "Localidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Zona_localidadId_clave_key" ON "Zona"("localidadId", "clave");
CREATE UNIQUE INDEX "Zona_id_localidadId_key" ON "Zona"("id", "localidadId");

-- Sectores publicados por Higiene Urbana de Trenque Lauquen.
-- https://www.trenquelauquen.gov.ar/noticias/la-recoleccion-de-residuos-se-prestara-con-normalidad-este-lunes-23-feriado-por-el-dia-de-la-soberania-nacional/
INSERT INTO "Zona" ("id", "nombre", "clave", "localidadId") VALUES
  ('3b37670f-24b7-4a4b-afdf-1b13ca5af001', 'Zona Urbana', 'zona urbana', '06826050'),
  ('3b37670f-24b7-4a4b-afdf-1b13ca5af002', 'Ampliación Urbana', 'ampliacion urbana', '06826050'),
  ('3b37670f-24b7-4a4b-afdf-1b13ca5af003', 'Zona de Quintas', 'zona de quintas', '06826050');

ALTER TABLE "Trayecto" ADD COLUMN "zonaId" TEXT NOT NULL;
ALTER TABLE "Trayecto" ADD CONSTRAINT "Trayecto_zonaId_localidadId_fkey"
  FOREIGN KEY ("zonaId", "localidadId") REFERENCES "Zona"("id", "localidadId")
  ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Trayecto_zonaId_localidadId_idx" ON "Trayecto"("zonaId", "localidadId");

COMMIT;
