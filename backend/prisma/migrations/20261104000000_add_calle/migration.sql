CREATE TABLE "Calle" (
    "id" TEXT NOT NULL,
    "calle" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    CONSTRAINT "Calle_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Direccion"
    ADD COLUMN "calleId" TEXT,
    ADD COLUMN "altura" INTEGER;

CREATE UNIQUE INDEX "Calle_clave_key" ON "Calle"("clave");
CREATE UNIQUE INDEX "Direccion_calleId_altura_key" ON "Direccion"("calleId", "altura");

ALTER TABLE "Direccion"
    ADD CONSTRAINT "Direccion_calleId_fkey"
    FOREIGN KEY ("calleId") REFERENCES "Calle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
