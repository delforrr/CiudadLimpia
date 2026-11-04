BEGIN;

-- Renombrar conserva las relaciones existentes.
ALTER TABLE "_PuntoLimpioToResiduo" RENAME COLUMN "A" TO "puntoLimpioId";
ALTER TABLE "_PuntoLimpioToResiduo" RENAME COLUMN "B" TO "residuoId";

ALTER TABLE "_PuntoLimpioToResiduo" RENAME CONSTRAINT "_PuntoLimpioToResiduo_AB_pkey" TO "_PuntoLimpioToResiduo_pkey";
ALTER TABLE "_PuntoLimpioToResiduo" RENAME CONSTRAINT "_PuntoLimpioToResiduo_A_fkey" TO "_PuntoLimpioToResiduo_puntoLimpioId_fkey";
ALTER TABLE "_PuntoLimpioToResiduo" RENAME CONSTRAINT "_PuntoLimpioToResiduo_B_fkey" TO "_PuntoLimpioToResiduo_residuoId_fkey";

ALTER INDEX "_PuntoLimpioToResiduo_B_index" RENAME TO "_PuntoLimpioToResiduo_residuoId_idx";

COMMIT;
