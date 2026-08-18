import { createServerFn } from "@tanstack/react-start";
import type { RawDespesa } from "./despesas";

const HOST = "https://noiton-n8n.lm218l.easypanel.host";
const ENDPOINTS = [`${HOST}/webhook/puxar-planilha`];

export const getDespesas = createServerFn({ method: "GET" }).handler(
  async (): Promise<RawDespesa[]> => {
    let last = 0;
    for (const url of ENDPOINTS) {
      const res = await fetch(url, { headers: { accept: "application/json" } });
      if (!res.ok) {
        last = res.status;
        continue;
      }
      const text = await res.text();
      if (!text.trim()) return [];
      const json = JSON.parse(text) as
        | RawDespesa[]
        | { data?: RawDespesa[] }
        | RawDespesa;
      if (Array.isArray(json)) return json;
      if (Array.isArray((json as { data?: RawDespesa[] }).data)) {
        return (json as { data: RawDespesa[] }).data;
      }
      return [json as RawDespesa];
    }
    throw new Error(`Falha ao buscar planilha (${last})`);
  },
);
