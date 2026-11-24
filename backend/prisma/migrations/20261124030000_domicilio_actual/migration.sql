CREATE TABLE "PreferenciaDomicilio" (
  "clienteId" TEXT PRIMARY KEY,
  "direccionId" TEXT NOT NULL,
  CONSTRAINT "PreferenciaDomicilio_clienteId_direccionId_fkey"
    FOREIGN KEY ("clienteId", "direccionId")
    REFERENCES "ClienteDireccion"("clienteId", "direccionId")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PreferenciaDomicilio_clienteId_direccionId_key"
  ON "PreferenciaDomicilio"("clienteId", "direccionId");
