import { createServerFn } from "@tanstack/react-start";

const ENDPOINT =
  "https://noiton-n8n.lm218l.easypanel.host/webhook/puxar-planilha";

export const getDespesas = createServerFn({ method: "GET" }).handler(
  async (): Promise<unknown[]> => {
    const res = await fetch(ENDPOINT, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`Falha ao buscar planilha (${res.status})`);
    }
    const text = await res.text();
    if (!text.trim()) return [];
    const json = JSON.parse(text);
    if (Array.isArray(json)) return json;
    if (Array.isArray((json as { data?: unknown[] }).data)) {
      return (json as { data: unknown[] }).data;
    }
    return [json];
  },
);
