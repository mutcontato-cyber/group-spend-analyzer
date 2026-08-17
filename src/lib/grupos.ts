const BASE = "https://noiton-n8n.lm218l.easypanel.host/webhook-test";

export const GRUPOS_ENDPOINTS = {
  listar: `${BASE}/ver-grupos`,
  adicionar: `${BASE}/adicionar-grupo`,
  apagar: `${BASE}/apagar-grupo`,
} as const;

export type Grupo = {
  nome: string;
  id?: string | number;
  criadoEm?: string | null;
};

const NAME_KEYS = ["nome", "Nome", "grupo", "Grupo", "name", "titulo", "Título"];

function extrairNome(item: unknown): string | null {
  if (typeof item === "string") return item.trim() || null;
  if (item && typeof item === "object") {
    const obj = item as Record<string, unknown>;
    for (const k of NAME_KEYS) {
      const v = obj[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
  }
  return null;
}

/** Aceita array puro, {data:[...]}, {grupos:[...]}, objeto único ou lista de strings. */
export function normalizarGrupos(payload: unknown): Grupo[] {
  let rows: unknown[] = [];
  if (Array.isArray(payload)) rows = payload;
  else if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    const arr = [obj["data"], obj["grupos"], obj["Grupos"], obj["result"], obj["rows"]].find(
      (v) => Array.isArray(v),
    );
    if (Array.isArray(arr)) rows = arr;
    else rows = [payload];
  }

  const vistos = new Set<string>();
  const out: Grupo[] = [];
  for (const r of rows) {
    const nome = extrairNome(r);
    if (!nome || vistos.has(nome.toLowerCase())) continue;
    vistos.add(nome.toLowerCase());
    const obj = (r && typeof r === "object" ? r : {}) as Record<string, unknown>;
    const id = obj["id"];
    out.push({
      nome,
      ...(typeof id === "string" || typeof id === "number" ? { id } : {}),
      criadoEm: typeof obj["createdAt"] === "string" ? (obj["createdAt"] as string) : null,
    });
  }
  return out.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

async function parseResposta(res: Response) {
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      text?.slice(0, 200) || `Erro ${res.status} ao comunicar com o servidor.`,
    );
  }
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function listarGrupos(): Promise<Grupo[]> {
  const res = await fetch(GRUPOS_ENDPOINTS.listar, {
    headers: { accept: "application/json" },
  });
  return normalizarGrupos(await parseResposta(res));
}

export async function adicionarGrupo(nome: string): Promise<void> {
  const res = await fetch(GRUPOS_ENDPOINTS.adicionar, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ nome }),
  });
  await parseResposta(res);
}

export async function apagarGrupo(nome: string): Promise<void> {
  const res = await fetch(GRUPOS_ENDPOINTS.apagar, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ nome }),
  });
  await parseResposta(res);
}
