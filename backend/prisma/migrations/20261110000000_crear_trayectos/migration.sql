BEGIN;

ALTER TABLE "Direccion"
    DROP CONSTRAINT "Direccion_formato_valido",
    ADD CONSTRAINT "Direccion_formato_valido" CHECK (
        ("calleId" IS NULL AND "altura" IS NULL AND "direccion" IS NOT NULL)
        OR (
            "calleId" IS NOT NULL AND "altura" IS NOT NULL AND "altura" > 0
            AND "direccion" IS NULL AND "clienteId" IS NULL
        )
        OR (
            "altura" IS NULL AND "direccion" IS NULL AND "clienteId" IS NULL
            AND "lat" IS NOT NULL AND "long" IS NOT NULL
        )
    );

CREATE TABLE "Localidad" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    CONSTRAINT "Localidad_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Localidad" ("id", "nombre") VALUES ('06826050', 'Trenque Lauquen');

CREATE TABLE "Trayecto" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "localidadId" TEXT NOT NULL,
    "geometria" JSONB NOT NULL,
    CONSTRAINT "Trayecto_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Trayecto_localidadId_fkey" FOREIGN KEY ("localidadId")
        REFERENCES "Localidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "Trayecto_localidadId_idx" ON "Trayecto"("localidadId");

CREATE TABLE "PuntoTrayecto" (
    "trayectoId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL CHECK ("orden" >= 0),
    "direccionId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL CHECK ("lat" BETWEEN -90 AND 90),
    "long" DOUBLE PRECISION NOT NULL CHECK ("long" BETWEEN -180 AND 180),
    CONSTRAINT "PuntoTrayecto_pkey" PRIMARY KEY ("trayectoId", "orden"),
    CONSTRAINT "PuntoTrayecto_trayectoId_fkey" FOREIGN KEY ("trayectoId")
        REFERENCES "Trayecto"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PuntoTrayecto_direccionId_fkey" FOREIGN KEY ("direccionId")
        REFERENCES "Direccion"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "PuntoTrayecto_direccionId_idx" ON "PuntoTrayecto"("direccionId");

COMMIT;
