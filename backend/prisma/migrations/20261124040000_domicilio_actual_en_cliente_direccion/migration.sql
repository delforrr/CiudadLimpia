BEGIN;

LOCK TABLE "PreferenciaDomicilio" IN ACCESS EXCLUSIVE MODE;

ALTER TABLE "ClienteDireccion"
  ADD COLUMN "esActual" BOOLEAN NOT NULL DEFAULT false;

UPDATE "ClienteDireccion" AS domicilio
SET "esActual" = true
FROM "PreferenciaDomicilio" AS preferencia
WHERE domicilio."clienteId" = preferencia."clienteId"
  AND domicilio."direccionId" = preferencia."direccionId";

CREATE UNIQUE INDEX "ClienteDireccion_clienteId_actual_key"
  ON "ClienteDireccion"("clienteId") WHERE ("esActual" = true);

DROP TABLE "PreferenciaDomicilio";

COMMIT;
