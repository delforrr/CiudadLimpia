CREATE TABLE "ServicioRecoleccion" (
    "id" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "servicioId" TEXT NOT NULL,
    "camionId" TEXT NOT NULL,
    "trayectoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "recorrido" JSONB NOT NULL,
    "recorridoId" TEXT NOT NULL,
    "muestraEn" TIMESTAMP(3) NOT NULL,
    "progreso" JSONB,
    "visibleHasta" TIMESTAMP(3),
    CONSTRAINT "ServicioRecoleccion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ServicioRecoleccion_proveedorId_servicioId_key" ON "ServicioRecoleccion"("proveedorId", "servicioId");
CREATE INDEX "ServicioRecoleccion_trayectoId_idx" ON "ServicioRecoleccion"("trayectoId");
CREATE INDEX "ServicioRecoleccion_camionId_idx" ON "ServicioRecoleccion"("camionId");
CREATE INDEX "ServicioRecoleccion_visibleHasta_idx" ON "ServicioRecoleccion"("visibleHasta");

ALTER TABLE "ServicioRecoleccion" ADD CONSTRAINT "ServicioRecoleccion_camionId_fkey" FOREIGN KEY ("camionId") REFERENCES "Camion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServicioRecoleccion" ADD CONSTRAINT "ServicioRecoleccion_trayectoId_fkey" FOREIGN KEY ("trayectoId") REFERENCES "Trayecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
