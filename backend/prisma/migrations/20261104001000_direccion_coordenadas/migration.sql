ALTER TABLE "Direccion"
    ADD COLUMN "lat" DOUBLE PRECISION,
    ADD COLUMN "long" DOUBLE PRECISION,
    ADD CONSTRAINT "Direccion_coordenadas_validas" CHECK (
        ("lat" IS NULL AND "long" IS NULL)
        OR (
            "lat" IS NOT NULL AND "long" IS NOT NULL
            AND "lat" BETWEEN -90 AND 90
            AND "long" BETWEEN -180 AND 180
        )
    );
