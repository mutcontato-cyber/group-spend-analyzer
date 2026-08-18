const BASE = "https://noiton-n8n.lm218l.easypanel.host/webhook-test";

/**
 * Endpoints que precisam existir no n8n.
 *
 * 1) POST /enviar-codigo
 *    body:  { "telefone": "5562981873363", "codigo": "123456",
 *             "expiraEm": "2026-08-18T03:15:00.000Z", "validadeSegundos": 300 }
 *    O código é gerado pelo app e guardado em cache; o n8n só envia no WhatsApp.
 *    resp:  { "ok": true }
 *           { "ok": false, "mensagem": "..." }        // telefone não cadastrado
 *
 * 2) POST /validar-codigo
 *    body:  { "telefone": "5562981873363", "codigo": "123456", "lembrar": true }
 *    resp:  {
 *             "ok": true,
 *             "token": "<token de sessao>",
 *             "expiraEm": "2026-08-24T02:00:00.000Z",
 *             "usuario": { "nome": "Fulano", "telefone": "5562981873363",
 *                          "papel": "admin" | "membro", "grupos": ["Obra casa cristal"] }
 *           }
 *
 * 3) POST /validar-sessao      (opcional, usado ao reabrir o app)
 *    body:  { "token": "..." }
 *    resp:  { "ok": true, "usuario": { ... } }
 *
 * 4) GET  /ver-pessoas         -> [{ "nome": "...", "telefone": "...", "papel": "membro", "grupos": ["..."] }]
 * 5) POST /adicionar-pessoa    body: { "nome": "...", "telefone": "...", "papel": "membro", "grupos": ["..."] }
 * 6) POST /apagar-pessoa       body: { "telefone": "..." }
 */
export const AUTH_ENDPOINTS = {
  enviarCodigo: `${BASE}/enviar-codigo`,
  validarCodigo: `${BASE}/validar-codigo`,
  validarSessao: `${BASE}/validar-sessao`,
  listarPessoas: `${BASE}/ver-pessoas`,
  adicionarPessoa: `${BASE}/adicionar-pessoa`,
  apagarPessoa: `${BASE}/apagar-pessoa`,
} as const;

/** Telefone do administrador principal (fallback caso a API não informe o papel). */
export const ADMIN_TELEFONE = "5562981873363";

export const DIAS_LEMBRAR = 7;

export type Papel = "admin" | "membro";

export type Usuario = {
  nome: string;
  telefone: string;
  papel: Papel;
  grupos: string[];
};

export type Sessao = {
  token: string | null;
  usuario: Usuario;
  expiraEm: number | null; // epoch ms
};

/* ------------------------------- helpers -------------------------------- */

/** Mantém só dígitos e garante o DDI 55 (Brasil). */
export function normalizarTelefone(v: string): string {
  const d = (v ?? "").replace(/\D+/g, "");
  if (!d) return "";
  if (d.startsWith("55")) return d;
  if (d.length >= 10 && d.length <= 11) return `55${d}`;
  return d;
}

export function formatarTelefone(v: string): string {
  const d = normalizarTelefone(v).replace(/^55/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return v;
}

export function telefoneValido(v: string): boolean {
  const d = normalizarTelefone(v);
  return d.length >= 12 && d.length <= 13;
}

async function post(url: string, body: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: unknown = null;
  if (text.trim()) {
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
  }
  if (!res.ok) {
    const msg =
      (json && typeof json === "object" && typeof (json as Record<string, unknown>)["mensagem"] === "string"
        ? ((json as Record<string, unknown>)["mensagem"] as string)
        : null) ?? (typeof json === "string" ? json.slice(0, 200) : null);
    throw new Error(msg || `Erro ${res.status} ao comunicar com o servidor.`);
  }
  return json;
}

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function comoLista(v: unknown): string[] {
  if (Array.isArray(v))
    return v
      .map((x) =>
        typeof x === "string" ? x : typeof obj(x)["nome"] === "string" ? (obj(x)["nome"] as string) : "",
      )
      .map((s) => s.trim())
      .filter(Boolean);
  if (typeof v === "string")
    return v
      .split(/[,;|]/)
      .map((s) => s.trim())
      .filter(Boolean);
  return [];
}

/** Aceita variações de nomes de campo vindas do n8n. */
export function normalizarUsuario(raw: unknown, telefoneFallback = ""): Usuario {
  const o = obj(raw);
  const alvo = obj(o["usuario"] ?? o["user"] ?? o["pessoa"] ?? o);
  const telefone = normalizarTelefone(
    String(alvo["telefone"] ?? alvo["Telefone"] ?? alvo["whatsapp"] ?? alvo["phone"] ?? telefoneFallback ?? ""),
  );
  const papelRaw = String(alvo["papel"] ?? alvo["role"] ?? alvo["tipo"] ?? "").toLowerCase();
  const papel: Papel =
    papelRaw.includes("admin") || telefone === ADMIN_TELEFONE ? "admin" : "membro";
  const grupos = comoLista(
    alvo["grupos"] ?? alvo["Grupos"] ?? alvo["grupo"] ?? alvo["Grupo"] ?? alvo["groups"],
  );
  const nome = String(alvo["nome"] ?? alvo["Nome"] ?? alvo["name"] ?? "").trim();
  return {
    nome: nome || (papel === "admin" ? "Administrador" : formatarTelefone(telefone)),
    telefone,
    papel,
    grupos,
  };
}

/* --------------------------------- API ---------------------------------- */

/* -------------------- código gerado e guardado no cache ------------------- */

const CHAVE_CODIGO = "painel.codigo";
/** Validade do código gerado (5 minutos). */
export const CODIGO_VALIDADE_MS = 5 * 60 * 1000;

type CodigoCache = { telefone: string; codigo: string; expiraEm: number };

function gerarCodigo(): string {
  const n = Math.floor(Math.random() * 1_000_000);
  return String(n).padStart(6, "0");
}

function guardarCodigo(c: CodigoCache) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(CHAVE_CODIGO, JSON.stringify(c));
}

function lerCodigo(): CodigoCache | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(CHAVE_CODIGO);
  if (!raw) return null;
  try {
    const c = JSON.parse(raw) as CodigoCache;
    if (!c?.codigo || !c?.telefone || c.expiraEm < Date.now()) {
      window.sessionStorage.removeItem(CHAVE_CODIGO);
      return null;
    }
    return c;
  } catch {
    window.sessionStorage.removeItem(CHAVE_CODIGO);
    return null;
  }
}

export function limparCodigo() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(CHAVE_CODIGO);
}

export async function enviarCodigo(telefone: string): Promise<void> {
  const tel = normalizarTelefone(telefone);
  const codigo = gerarCodigo();
  const expiraEm = Date.now() + CODIGO_VALIDADE_MS;
  const resp = obj(
    await post(AUTH_ENDPOINTS.enviarCodigo, {
      telefone: tel,
      codigo,
      expiraEm: new Date(expiraEm).toISOString(),
      validadeSegundos: CODIGO_VALIDADE_MS / 1000,
    }),
  );
  if (resp["ok"] === false) {
    throw new Error(String(resp["mensagem"] ?? "Não foi possível enviar o código."));
  }
  guardarCodigo({ telefone: tel, codigo, expiraEm });
}

export async function validarCodigo(
  telefone: string,
  codigo: string,
  lembrar: boolean,
): Promise<Sessao> {
  const tel = normalizarTelefone(telefone);
  const informado = codigo.trim();

  // confere com o código guardado no cache
  const cache = lerCodigo();
  if (!cache) throw new Error("Código expirado. Peça um novo código.");
  if (cache.telefone !== tel) throw new Error("Código não corresponde a este número.");
  if (cache.codigo !== informado) throw new Error("Código incorreto.");

  const resp = obj(
    await post(AUTH_ENDPOINTS.validarCodigo, { telefone: tel, codigo: informado, lembrar }),
  );
  if (resp["ok"] === false) {
    throw new Error(String(resp["mensagem"] ?? "Código inválido."));
  }
  limparCodigo();
  const usuario = normalizarUsuario(resp, tel);
  const token = typeof resp["token"] === "string" ? (resp["token"] as string) : null;
  const expiraEm = lembrar ? Date.now() + DIAS_LEMBRAR * 24 * 60 * 60 * 1000 : null;
  return { token, usuario, expiraEm };
}

export async function validarSessao(token: string): Promise<Usuario | null> {
  try {
    const resp = obj(await post(AUTH_ENDPOINTS.validarSessao, { token }));
    if (resp["ok"] === false) return null;
    return normalizarUsuario(resp);
  } catch {
    // endpoint ainda não existe / offline: mantém a sessão local
    return null;
  }
}

export type Pessoa = Usuario;

export async function listarPessoas(): Promise<Pessoa[]> {
  const res = await fetch(AUTH_ENDPOINTS.listarPessoas, { headers: { accept: "application/json" } });
  const text = await res.text();
  if (!res.ok) throw new Error(text.slice(0, 200) || `Erro ${res.status} ao listar pessoas.`);
  let json: unknown = [];
  if (text.trim()) {
    try {
      json = JSON.parse(text);
    } catch {
      json = [];
    }
  }
  let rows: unknown[] = [];
  if (Array.isArray(json)) rows = json;
  else {
    const o = obj(json);
    const arr = [o["data"], o["pessoas"], o["usuarios"], o["rows"], o["result"]].find((v) =>
      Array.isArray(v),
    );
    rows = Array.isArray(arr) ? arr : [];
  }
  return rows
    .map((r) => normalizarUsuario(r))
    .filter((p) => p.telefone)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function adicionarPessoa(p: {
  nome: string;
  telefone: string;
  grupos: string[];
  papel?: Papel;
}): Promise<void> {
  await post(AUTH_ENDPOINTS.adicionarPessoa, {
    nome: p.nome.trim(),
    telefone: normalizarTelefone(p.telefone),
    papel: p.papel ?? "membro",
    grupos: p.grupos,
  });
}

export async function apagarPessoa(telefone: string): Promise<void> {
  await post(AUTH_ENDPOINTS.apagarPessoa, { telefone: normalizarTelefone(telefone) });
}

/* ------------------------------ persistência ----------------------------- */

const CHAVE = "painel.sessao";

export function salvarSessao(s: Sessao) {
  if (typeof window === "undefined") return;
  const store = s.expiraEm ? window.localStorage : window.sessionStorage;
  store.setItem(CHAVE, JSON.stringify(s));
  (s.expiraEm ? window.sessionStorage : window.localStorage).removeItem(CHAVE);
}

export function lerSessao(): Sessao | null {
  if (typeof window === "undefined") return null;
  for (const store of [window.localStorage, window.sessionStorage]) {
    const raw = store.getItem(CHAVE);
    if (!raw) continue;
    try {
      const s = JSON.parse(raw) as Sessao;
      if (s?.expiraEm && s.expiraEm < Date.now()) {
        store.removeItem(CHAVE);
        continue;
      }
      if (s?.usuario?.telefone) return s;
    } catch {
      store.removeItem(CHAVE);
    }
  }
  return null;
}

export function limparSessao() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CHAVE);
  window.sessionStorage.removeItem(CHAVE);
}
