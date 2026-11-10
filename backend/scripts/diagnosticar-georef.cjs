// Reproduce las diferencias observadas sin depender de red ni de PostgreSQL.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const backend = path.resolve(__dirname, '..');
require(path.join(backend, 'node_modules/ts-node')).register({
  project: path.join(backend, 'tsconfig.json'),
  transpileOnly: true,
  experimentalResolver: true,
});
const { GeocodificacionService } = require(
  path.join(backend, 'src/geocodificacion/geocodificacion.service.ts'),
);
const evidencia = JSON.parse(
  fs.readFileSync(
    path.join(backend, '../docs/research/georef-evidencia.json'),
    'utf8',
  ),
);

async function main() {
  const originalFetch = global.fetch;
  let diferencias = 0;
  try {
    for (const caso of evidencia.cases) {
      const pendientes = [...caso.captures];
      global.fetch = async (url) => {
        const captura = pendientes.shift();
        assert.ok(captura, 'Consulta inesperada');
        assert.equal(String(url), captura.url);
        return Response.json(captura.body, { status: captura.status });
      };
      const service = new GeocodificacionService({
        direccion: { findFirst: async () => null },
      });
      if (caso.error) {
        await assert.rejects(
          service.directa({ calle: caso.calle, altura: caso.altura }),
          (error) => error.getStatus() === caso.error.status,
        );
        console.log(
          `${caso.calle}: GeoRef ${caso.captures[0].status} → proxy ${caso.error.status}`,
        );
      } else {
        const directa = await service.directa({
          calle: caso.calle,
          altura: caso.altura,
        });
        assert.deepEqual(directa, caso.directa);
        if (!directa.sugerencias.length) {
          assert.ok(
            caso.captures[0].body.direcciones.some(
              (direccion) =>
                direccion.ubicacion.lat === null &&
                direccion.ubicacion.lon === null,
            ),
          );
          assert.equal(pendientes.length, 0);
          console.log(
            `${caso.calle} ${caso.altura}: dirección reconocida sin coordenadas → sugerencias vacías`,
          );
          continue;
        }
        const { lat, long } = directa.sugerencias[0];
        const inversa = await service.inversa({ lat, long });
        assert.deepEqual(inversa, caso.inversa);
        const simetrica =
          inversa.direccionSugerida?.calle === directa.sugerencias[0].calle &&
          inversa.direccionSugerida?.altura === directa.sugerencias[0].altura;
        if (!simetrica) diferencias++;
        console.log(
          `${caso.calle} ${caso.altura}: inversa ${JSON.stringify(inversa.direccionSugerida)}; simetría ${simetrica ? 'SÍ' : 'NO'}`,
        );
      }
      assert.equal(pendientes.length, 0, 'Captura sin reproducir');
    }
  } finally {
    global.fetch = originalFetch;
  }
  console.log(
    `Contrato capturado: OK. Diferencias directa/inversa: ${diferencias}.`,
  );
  if (process.argv.includes('--exigir-simetria')) {
    assert.equal(
      diferencias,
      0,
      'La búsqueda inversa no reconstruye siempre la dirección de la directa',
    );
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
