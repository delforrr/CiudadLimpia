export async function httpRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      ...options,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...options.headers },
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor. Intentá nuevamente.')
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string | string[]
    } | null
    throw new Error(
      body?.message
        ? Array.isArray(body.message)
          ? body.message.join('. ')
          : body.message
        : 'No se pudo completar la solicitud',
    )
  }
  return response.status === 204
    ? (undefined as T)
    : (response.json() as Promise<T>)
}
