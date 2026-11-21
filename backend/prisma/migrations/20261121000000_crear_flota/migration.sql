-- CreateEnum
CREATE TYPE "Estado" AS ENUM ('ACTIVO', 'INACTIVO');

-- CreateTable
CREATE TABLE "Conductor" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Conductor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContratoConductor" (
    "idCamion" TEXT NOT NULL,
    "idConductor" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3),

    CONSTRAINT "ContratoConductor_pkey" PRIMARY KEY ("idCamion","idConductor","fechaInicio")
);

-- CreateTable
CREATE TABLE "Camion" (
    "id" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "estado" "Estado" NOT NULL DEFAULT 'ACTIVO',
    "patente" TEXT NOT NULL,

    CONSTRAINT "Camion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContratoConductor_idCamion_fechaInicio_idx" ON "ContratoConductor"("idCamion", "fechaInicio");

-- CreateIndex
CREATE INDEX "ContratoConductor_idConductor_fechaInicio_idx" ON "ContratoConductor"("idConductor", "fechaInicio");

-- CreateIndex
CREATE UNIQUE INDEX "Camion_patente_key" ON "Camion"("patente");

-- AddForeignKey
ALTER TABLE "ContratoConductor" ADD CONSTRAINT "ContratoConductor_idCamion_fkey" FOREIGN KEY ("idCamion") REFERENCES "Camion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContratoConductor" ADD CONSTRAINT "ContratoConductor_idConductor_fkey" FOREIGN KEY ("idConductor") REFERENCES "Conductor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
