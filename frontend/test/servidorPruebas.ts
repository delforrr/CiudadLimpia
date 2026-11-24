import { createServer } from 'vite'

export function crearServidorPruebas(external: string[]) {
  return createServer({
    configFile: false,
    appType: 'custom',
    server: { middlewareMode: true, ws: false, hmr: false },
    optimizeDeps: { noDiscovery: true },
    ssr: { external },
  })
}
