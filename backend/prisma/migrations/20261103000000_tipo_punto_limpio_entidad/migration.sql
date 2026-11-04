BEGIN;

-- El enum y la tabla no pueden compartir nombre en PostgreSQL.
ALTER TYPE "TipoPuntoLimpio" RENAME TO "TipoPuntoLimpio_old";

-- CreateTable
CREATE TABLE "TipoPuntoLimpio" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "TipoPuntoLimpio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TipoPuntoLimpio_nombre_key" ON "TipoPuntoLimpio"("nombre");

-- Conservar los tipos existentes como filas de la nueva entidad.
INSERT INTO "TipoPuntoLimpio" ("id", "nombre") VALUES
    (gen_random_uuid(), 'Punto limpio'),
    (gen_random_uuid(), 'Botellero'),
    (gen_random_uuid(), 'Botellero y latero');

ALTER TABLE "PuntoLimpio" ADD COLUMN "tipoId" TEXT;

UPDATE "PuntoLimpio"
SET "tipoId" = CASE "tipo"::text
    WHEN 'PUNTO_LIMPIO' THEN (SELECT "id" FROM "TipoPuntoLimpio" WHERE "nombre" = 'Punto limpio')
    WHEN 'BOTELLERO' THEN (SELECT "id" FROM "TipoPuntoLimpio" WHERE "nombre" = 'Botellero')
    WHEN 'BOTELLERO_LATERO' THEN (SELECT "id" FROM "TipoPuntoLimpio" WHERE "nombre" = 'Botellero y latero')
END;

ALTER TABLE "PuntoLimpio" ALTER COLUMN "tipoId" SET NOT NULL;
ALTER TABLE "PuntoLimpio" DROP COLUMN "tipo";
DROP TYPE "TipoPuntoLimpio_old";

-- AddForeignKey
ALTER TABLE "PuntoLimpio" ADD CONSTRAINT "PuntoLimpio_tipoId_fkey" FOREIGN KEY ("tipoId") REFERENCES "TipoPuntoLimpio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "PuntoLimpio_tipoId_idx" ON "PuntoLimpio"("tipoId");

-- CreateTable
CREATE TABLE "_TipoPuntoLimpioToResiduo" (
    "tipoPuntoLimpioId" TEXT NOT NULL,
    "residuoId" TEXT NOT NULL,

    CONSTRAINT "_TipoPuntoLimpioToResiduo_pkey" PRIMARY KEY ("tipoPuntoLimpioId","residuoId")
);

-- CreateIndex
CREATE INDEX "_TipoPuntoLimpioToResiduo_residuoId_idx" ON "_TipoPuntoLimpioToResiduo"("residuoId");

-- AddForeignKey
ALTER TABLE "_TipoPuntoLimpioToResiduo" ADD CONSTRAINT "_TipoPuntoLimpioToResiduo_tipoPuntoLimpioId_fkey" FOREIGN KEY ("tipoPuntoLimpioId") REFERENCES "TipoPuntoLimpio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TipoPuntoLimpioToResiduo" ADD CONSTRAINT "_TipoPuntoLimpioToResiduo_residuoId_fkey" FOREIGN KEY ("residuoId") REFERENCES "Residuo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
