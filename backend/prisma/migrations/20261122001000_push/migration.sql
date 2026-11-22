CREATE TYPE "EstadoEntregaPush" AS ENUM ('PENDIENTE', 'ENVIADO', 'CANCELADO');

CREATE TABLE "SuscripcionPush" (
    "id" TEXT NOT NULL,
    "endpoint" VARCHAR(2000) NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "direccionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "SuscripcionPush_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EntregaPush" (
    "id" TEXT NOT NULL,
    "prestacionId" TEXT NOT NULL,
    "suscripcionId" TEXT NOT NULL,
    "versionSuscripcion" INTEGER NOT NULL,
    "estado" "EstadoEntregaPush" NOT NULL DEFAULT 'PENDIENTE',
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "intentoEnvio" BOOLEAN NOT NULL DEFAULT false,
    "venceEn" TIMESTAMP(3) NOT NULL,
    "proximoIntentoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EntregaPush_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SuscripcionPush_endpoint_key" ON "SuscripcionPush"("endpoint");
CREATE INDEX "SuscripcionPush_clienteId_direccionId_idx" ON "SuscripcionPush"("clienteId", "direccionId");
CREATE UNIQUE INDEX "EntregaPush_prestacionId_suscripcionId_key" ON "EntregaPush"("prestacionId", "suscripcionId");
CREATE INDEX "EntregaPush_suscripcionId_idx" ON "EntregaPush"("suscripcionId");
CREATE INDEX "EntregaPush_estado_proximoIntentoEn_idx" ON "EntregaPush"("estado", "proximoIntentoEn");

ALTER TABLE "SuscripcionPush" ADD CONSTRAINT "SuscripcionPush_clienteId_direccionId_fkey" FOREIGN KEY ("clienteId", "direccionId") REFERENCES "ClienteDireccion"("clienteId", "direccionId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EntregaPush" ADD CONSTRAINT "EntregaPush_prestacionId_fkey" FOREIGN KEY ("prestacionId") REFERENCES "ServicioRecoleccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EntregaPush" ADD CONSTRAINT "EntregaPush_suscripcionId_fkey" FOREIGN KEY ("suscripcionId") REFERENCES "SuscripcionPush"("id") ON DELETE CASCADE ON UPDATE CASCADE;
