-- Una sola sentencia conserva el error original y revierte toda la migración.
DO $migracion$
DECLARE
    ambiguas bigint;
    incompletas bigint;
    repetidos bigint;
BEGIN
    LOCK TABLE "Direccion", "Calle", "Cliente", "PuntoLimpio", "PuntoTrayecto" IN ACCESS EXCLUSIVE MODE;

    -- Usar el pin histórico de los puntos solo si todos los pines coinciden.
    WITH pines AS (
        SELECT "direccionId", "lat", "long" FROM "PuntoTrayecto"
        UNION
        SELECT "direccionId", "lat", "long" FROM "PuntoLimpio"
    ), unicos AS (
        SELECT "direccionId", min("lat") AS lat, min("long") AS long
        FROM pines
        GROUP BY "direccionId"
        HAVING count(*) = 1
    )
    UPDATE "Direccion" d
    SET "lat" = u.lat, "long" = u.long
    FROM unicos u
    WHERE u."direccionId" = d."id"
      AND d."calleId" IS NOT NULL AND d."altura" IS NOT NULL AND d."lat" IS NULL;

    -- Reutilizar un frente completo cuando coincide con el texto histórico.
    CREATE TEMP TABLE "DireccionEquivalente" ON COMMIT DROP AS
    SELECT anterior."id" AS origen, completa."id" AS destino
    FROM "Direccion" anterior
    JOIN "Direccion" completa ON completa."lat" IS NOT NULL
    JOIN "Calle" c ON c."id" = completa."calleId"
    WHERE anterior."calleId" IS NULL
      AND lower(normalize(btrim(regexp_replace(anterior."direccion", '[[:space:]]+', ' ', 'g'))))
          = lower(normalize(c."calle") || ' ' || completa."altura");

    SELECT count(*) INTO ambiguas
    FROM (
        SELECT origen
        FROM "DireccionEquivalente"
        GROUP BY origen
        HAVING count(*) > 1
    ) AS coincidencias;
    IF ambiguas > 0 THEN
        RAISE EXCEPTION 'Migración de direcciones: % direcciones históricas coinciden con más de un frente.', ambiguas
            USING HINT = 'Confirmá el frente de cada dirección histórica antes de reintentar.';
    END IF;

    SELECT count(*) INTO incompletas
    FROM "Direccion" d
    WHERE (d."calleId" IS NULL OR d."altura" IS NULL OR d."lat" IS NULL OR d."long" IS NULL)
      AND NOT EXISTS (SELECT 1 FROM "DireccionEquivalente" e WHERE e.origen = d."id");
    IF incompletas > 0 THEN
        RAISE EXCEPTION 'Migración de direcciones: % direcciones sin frente o pin confirmado.', incompletas
            USING HINT = 'Consultá docs/specs/trayectos/backend/prueba-local.md.';
    END IF;

    SELECT count(*) INTO repetidos
    FROM (
        SELECT d."clienteId", COALESCE(e.destino, d."id")
        FROM "Direccion" d
        LEFT JOIN "DireccionEquivalente" e ON e.origen = d."id"
        WHERE d."clienteId" IS NOT NULL
        GROUP BY d."clienteId", COALESCE(e.destino, d."id")
        HAVING count(*) > 1
    ) AS domicilios;
    IF repetidos > 0 THEN
        RAISE EXCEPTION 'Migración de direcciones: % vínculos de domicilio tienen más de una fila histórica.', repetidos
            USING HINT = 'Revisá los domicilios del mismo cliente que convergen a un solo frente.';
    END IF;

    -- CreateTable
    CREATE TABLE "ClienteDireccion" (
        "clienteId" TEXT NOT NULL,
        "direccionId" TEXT NOT NULL,
        "etiqueta" VARCHAR(100),

        CONSTRAINT "ClienteDireccion_pkey" PRIMARY KEY ("clienteId","direccionId")
    );

    -- CreateIndex
    CREATE INDEX "ClienteDireccion_direccionId_idx" ON "ClienteDireccion"("direccionId");

    -- AddForeignKey
    ALTER TABLE "ClienteDireccion" ADD CONSTRAINT "ClienteDireccion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

    -- AddForeignKey
    ALTER TABLE "ClienteDireccion" ADD CONSTRAINT "ClienteDireccion_direccionId_fkey" FOREIGN KEY ("direccionId") REFERENCES "Direccion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

    INSERT INTO "ClienteDireccion" ("clienteId", "direccionId", "etiqueta")
    SELECT d."clienteId", COALESCE(e.destino, d."id"), d."etiqueta"
    FROM "Direccion" d
    LEFT JOIN "DireccionEquivalente" e ON e.origen = d."id"
    WHERE d."clienteId" IS NOT NULL;

    UPDATE "PuntoLimpio" p SET "direccionId" = e.destino
    FROM "DireccionEquivalente" e WHERE p."direccionId" = e.origen;
    UPDATE "PuntoTrayecto" p SET "direccionId" = e.destino
    FROM "DireccionEquivalente" e WHERE p."direccionId" = e.origen;
    DELETE FROM "Direccion" d USING "DireccionEquivalente" e WHERE d."id" = e.origen;

    ALTER TABLE "Direccion" DROP CONSTRAINT "Direccion_formato_valido",
        ADD CONSTRAINT "Direccion_altura_valida" CHECK ("altura" > 0);

    -- DropForeignKey
    ALTER TABLE "Direccion" DROP CONSTRAINT "Direccion_clienteId_fkey";

    -- DropIndex
    DROP INDEX "Direccion_clienteId_idx";

    -- AlterTable
    ALTER TABLE "Direccion" DROP COLUMN "clienteId",
    DROP COLUMN "direccion",
    DROP COLUMN "etiqueta",
    ALTER COLUMN "calleId" SET NOT NULL,
    ALTER COLUMN "altura" SET NOT NULL,
    ALTER COLUMN "lat" SET NOT NULL,
    ALTER COLUMN "long" SET NOT NULL;

    -- AlterTable
    ALTER TABLE "PuntoLimpio" DROP COLUMN "lat",
    DROP COLUMN "long";

    -- AlterTable
    ALTER TABLE "PuntoTrayecto" DROP COLUMN "lat",
    DROP COLUMN "long";
END;
$migracion$;
