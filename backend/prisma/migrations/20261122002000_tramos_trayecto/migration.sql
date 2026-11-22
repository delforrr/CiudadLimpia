ALTER TABLE "Trayecto" ADD COLUMN "coberturaPorTramos" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "TramoTrayecto" (
    "trayectoId" TEXT NOT NULL,
    "calleId" TEXT NOT NULL,
    "desde" INTEGER NOT NULL,
    "hasta" INTEGER NOT NULL,
    CONSTRAINT "TramoTrayecto_pkey" PRIMARY KEY ("trayectoId", "desde"),
    CONSTRAINT "TramoTrayecto_limites_check" CHECK ("desde" >= 0 AND "hasta" > "desde"),
    CONSTRAINT "TramoTrayecto_trayectoId_fkey" FOREIGN KEY ("trayectoId") REFERENCES "Trayecto"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TramoTrayecto_calleId_fkey" FOREIGN KEY ("calleId") REFERENCES "Calle"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "TramoTrayecto_calleId_idx" ON "TramoTrayecto"("calleId");
