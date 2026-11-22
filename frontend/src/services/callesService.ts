import { httpRequest } from './http.ts';

export type CalleCatalogo = { id: string; calle: string };

export const callesService = {
  buscar: (buscar: string, signal: AbortSignal) =>
    httpRequest<CalleCatalogo[]>(`/calles?${new URLSearchParams({ buscar })}`, { signal }),
};
