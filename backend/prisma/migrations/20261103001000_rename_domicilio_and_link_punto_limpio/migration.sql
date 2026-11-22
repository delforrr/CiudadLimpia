BEGIN;

ALTER TABLE "Domicilio" RENAME TO "Direccion";
ALTER TABLE "Direccion" RENAME CONSTRAINT "Domicilio_pkey" TO "Direccion_pkey";
ALTER TABLE "Direccion" RENAME CONSTRAINT "Domicilio_clienteId_fkey" TO "Direccion_clienteId_fkey";
ALTER INDEX "Domicilio_clienteId_idx" RENAME TO "Direccion_clienteId_idx";
ALTER TABLE "Direccion" ALTER COLUMN "clienteId" DROP NOT NULL;

ALTER TABLE "PuntoLimpio"
    ADD COLUMN "direccionId" TEXT NOT NULL DEFAULT gen_random_uuid()::text;

INSERT INTO "Direccion" ("id", "direccion")
SELECT "direccionId", "direccion" FROM "PuntoLimpio";

ALTER TABLE "PuntoLimpio" ALTER COLUMN "direccionId" DROP DEFAULT;
ALTER TABLE "PuntoLimpio" DROP COLUMN "direccion";
ALTER TABLE "PuntoLimpio"
    ADD CONSTRAINT "PuntoLimpio_direccionId_fkey"
    FOREIGN KEY ("direccionId") REFERENCES "Direccion"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "PuntoLimpio_direccionId_idx" ON "PuntoLimpio"("direccionId");

COMMIT;
