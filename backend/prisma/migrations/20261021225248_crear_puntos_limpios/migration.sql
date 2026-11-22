-- CreateEnum
CREATE TYPE "TipoPuntoLimpio" AS ENUM ('PUNTO_LIMPIO', 'BOTELLERO', 'BOTELLERO_LATERO');

-- CreateTable
CREATE TABLE "PuntoLimpio" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoPuntoLimpio" NOT NULL,
    "direccion" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "long" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PuntoLimpio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Residuo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Residuo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PuntoLimpioToResiduo" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PuntoLimpioToResiduo_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Residuo_nombre_key" ON "Residuo"("nombre");

-- CreateIndex
CREATE INDEX "_PuntoLimpioToResiduo_B_index" ON "_PuntoLimpioToResiduo"("B");

-- AddForeignKey
ALTER TABLE "_PuntoLimpioToResiduo" ADD CONSTRAINT "_PuntoLimpioToResiduo_A_fkey" FOREIGN KEY ("A") REFERENCES "PuntoLimpio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PuntoLimpioToResiduo" ADD CONSTRAINT "_PuntoLimpioToResiduo_B_fkey" FOREIGN KEY ("B") REFERENCES "Residuo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PuntoLimpio"
  ADD CONSTRAINT "PuntoLimpio_lat_check"
    CHECK ("lat" BETWEEN -90 AND 90),
  ADD CONSTRAINT "PuntoLimpio_long_check"
    CHECK ("long" BETWEEN -180 AND 180);