ALTER TABLE "PuntoLimpio" ADD COLUMN "estado" "Estado" NOT NULL DEFAULT 'ACTIVO';
ALTER TABLE "TipoPuntoLimpio"
  ADD COLUMN "logo" TEXT,
  ADD COLUMN "colorFondo" VARCHAR(7);
