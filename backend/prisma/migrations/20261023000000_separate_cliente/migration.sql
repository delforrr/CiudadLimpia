BEGIN;

CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Cliente_userId_key" ON "Cliente"("userId");

-- Reuse each account UUID to preserve all existing profile data without extensions.
INSERT INTO "Cliente" ("id", "userId", "name", "lastName")
SELECT "id", "id", "name", "lastName" FROM "User";

ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Domicilio" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    CONSTRAINT "Domicilio_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Domicilio_clienteId_idx" ON "Domicilio"("clienteId");
ALTER TABLE "Domicilio" ADD CONSTRAINT "Domicilio_clienteId_fkey"
FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "User" DROP COLUMN "name", DROP COLUMN "lastName";

COMMIT;
