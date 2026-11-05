BEGIN;

ALTER TABLE "Direccion" ALTER COLUMN "direccion" DROP NOT NULL;

UPDATE "Direccion"
SET "direccion" = NULL
WHERE "calleId" IS NOT NULL AND "altura" IS NOT NULL;

ALTER TABLE "Direccion" ADD CONSTRAINT "Direccion_formato_valido" CHECK (
    ("calleId" IS NULL AND "altura" IS NULL AND "direccion" IS NOT NULL)
    OR (
        "calleId" IS NOT NULL AND "altura" IS NOT NULL AND "altura" > 0
        AND "direccion" IS NULL AND "clienteId" IS NULL
    )
);

COMMIT;
