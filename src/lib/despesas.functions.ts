import { createServerFn } from "@tanstack/react-start";
import type { RawDespesa } from "./despesas";

const ENDPOINT =
  "https://noiton-n8n.lm218l.easypanel.host/webhook-test/puxar-planilha";

export const getDespesas = createServerFn({ method: "GET" }).handler(
  async (): Promise<RawDespesa[]> => {
    const res = await fetch(ENDPOINT, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`Falha ao buscar planilha (${res.status})`);
    }
    const text = await res.text();
    if (!text.trim()) return [];
    const json = JSON.parse(text) as RawDespesa[] | { data?: RawDespesa[] } | RawDespesa;
    if (Array.isArray(json)) return json;
    if (Array.isArray((json as { data?: RawDespesa[] }).data)) {
      return (json as { data: RawDespesa[] }).data;
    }
    return [json as RawDespesa];
  },
);
