export function capitalizarInicial(texto: string): string {
  return texto.replace(/\p{L}/u, (letra) => letra.toLocaleUpperCase('es'))
}
