export type RawDespesa = {
  Grupo?: string | null;
  Comprovante?: boolean | null;
  data?: string | null;
  hora?: string | null;
  metodo_pagamento?: string | null;
  valor?: string | number | null;
  recebedor?: string | null;
  itens?: string | null;
  id?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type Item = {
  nome: string;
  qtd: number | null;
  unidade: string | null;
  unitario: number | null;
  total: number | null;
};

export type Despesa = {
  id: number;
  grupo: string;
  comprovante: boolean;
  data: string | null;
  ano: number | null;
  mes: number | null;
  dia: number | null;
  hora: string;
  metodo: string;
  valor: number;
  recebedor: string;
  itens: Item[];
  itensRaw: string;
  criadoEm: string | null;
};

const num = (v: unknown): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v !== "string") return 0;
  const cleaned = v.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}\b)/g, "");
  const n = parseFloat(cleaned.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

function parseItens(raw: string): Item[] {
  if (!raw?.trim()) return [];

  // Formato JSON: [{"produto":"...","quantidade":1,"unidade":"","preco_unitario":0,"preco_total":0}]
  const t = raw.trim();
  if (t.startsWith("[") || t.startsWith("{")) {
    try {
      const parsed = JSON.parse(t);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      const itens = arr
        .filter((o) => o && typeof o === "object")
        .map((o: Record<string, unknown>) => {
          const nome =
            (typeof o["produto"] === "string" && o["produto"]) ||
            (typeof o["nome"] === "string" && o["nome"]) ||
            (typeof o["item"] === "string" && o["item"]) ||
            "Item";
          const qtd = o["quantidade"] ?? o["qtd"];
          const unidade = o["unidade"] ?? o["unit"];
          const unitario = o["preco_unitario"] ?? o["precoUnitario"] ?? o["valor_unitario"];
          const total = o["preco_total"] ?? o["precoTotal"] ?? o["valor_total"];
          return {
            nome: String(nome).trim(),
            qtd: qtd == null || qtd === "" ? null : num(qtd),
            unidade:
              typeof unidade === "string" && unidade.trim() ? unidade.trim() : null,
            unitario: unitario == null || unitario === "" ? null : num(unitario),
            total: total == null || total === "" ? null : num(total),
          };
        });
      // JSON válido (mesmo vazio) não deve cair no parser de texto
      return itens;
    } catch {
      /* segue para o parser de texto */
    }
  }

  const hasStructured = raw.includes("Qtd:");
  const parts = hasStructured
    ? raw.split("\n")
    : raw.split(/\n|,(?![^()]*\))/);


  return parts
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const segs = line.split("|").map((s) => s.trim());
      const nome = segs[0] ?? line;
      const get = (label: string) =>
        segs.find((s) => s.toLowerCase().startsWith(label))?.split(":")[1]?.trim() ??
        null;
      const qtdRaw = get("qtd");
      const unitRaw = get("unit");
      const totalRaw = get("total");
      let qtd: number | null = null;
      let unidade: string | null = null;
      if (qtdRaw) {
        const m = qtdRaw.match(/([\d.,]+)\s*([A-Za-zÀ-ú]*)/);
        if (m) {
          qtd = num(m[1]);
          unidade = m[2] || null;
        }
      }
      return {
        nome,
        qtd,
        unidade,
        unitario: unitRaw ? num(unitRaw) : null,
        total: totalRaw ? num(totalRaw) : null,
      };
    });
}

export function normalizar(rows: unknown[]): Despesa[] {
  const base = (rows as RawDespesa[])
    .filter((r) => r && typeof r === "object")
    .map((r, i) => {
      let dataStr = (r.data ?? "").trim();
      let horaStr = (r.hora ?? "").trim();
      // Fallback: usa createdAt quando data/hora vierem vazios
      const criado = r.createdAt ? new Date(r.createdAt) : null;
      const criadoValido = criado && !Number.isNaN(criado.getTime()) ? criado : null;
      if (!dataStr && criadoValido) {
        const p = (n: number) => String(n).padStart(2, "0");
        dataStr = `${criadoValido.getFullYear()}-${p(criadoValido.getMonth() + 1)}-${p(criadoValido.getDate())}`;
      }
      if (!horaStr && criadoValido) {
        const p = (n: number) => String(n).padStart(2, "0");
        horaStr = `${p(criadoValido.getHours())}:${p(criadoValido.getMinutes())}:${p(criadoValido.getSeconds())}`;
      }
      const m = dataStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
      const itensRaw = (r.itens ?? "").trim();
      return {
        id: r.id ?? i,
        grupo: (r.Grupo ?? "").trim() || "Sem grupo",
        comprovante: Boolean(r.Comprovante),
        data: m ? dataStr.slice(0, 10) : null,
        ano: m ? Number(m[1]) : null,
        mes: m ? Number(m[2]) : null,
        dia: m ? Number(m[3]) : null,
        hora: horaStr,
        metodo: (r.metodo_pagamento ?? "").trim() || "Não informado",
        valor: num(r.valor),
        recebedor: (r.recebedor ?? "").trim() || "Não informado",
        itens: parseItens(itensRaw),
        itensRaw,
        criadoEm: r.createdAt ?? null,
      };
    });
  return mesclarFragmentos(base);
}

const tempoDe = (d: Despesa): number => {
  if (d.criadoEm) {
    const t = new Date(d.criadoEm).getTime();
    if (!Number.isNaN(t)) return t;
  }
  if (d.data) {
    const t = new Date(`${d.data}T${d.hora || "00:00:00"}`).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return 0;
};

/**
 * O n8n às vezes grava o mesmo gasto em duas linhas:
 * uma só com o valor (sem itens) e outra só com o produto (valor 0).
 * Aqui juntamos as duas em um único lançamento.
 */
export function mesclarFragmentos(lista: Despesa[], janelaMs = 10_000): Despesa[] {
  const ordenada = [...lista].sort((a, b) => tempoDe(a) - tempoDe(b));
  const usados = new Set<number>();
  const resultado: Despesa[] = [];

  ordenada.forEach((atual, i) => {
    if (usados.has(i)) return;
    const soValor = atual.valor > 0 && atual.itens.length === 0;
    const soItem = atual.valor === 0 && atual.itens.length > 0;
    if (soValor || soItem) {
      for (let j = i + 1; j < ordenada.length; j++) {
        if (usados.has(j)) continue;
        const outro = ordenada[j]!;
        const dt = Math.abs(tempoDe(outro) - tempoDe(atual));
        if (dt > janelaMs) break;
        if (outro.grupo.toLowerCase() !== atual.grupo.toLowerCase()) continue;
        const par =
          (soValor && outro.valor === 0 && outro.itens.length > 0) ||
          (soItem && outro.valor > 0 && outro.itens.length === 0);
        if (!par) continue;
        const comValor = soValor ? atual : outro;
        const comItens = soValor ? outro : atual;
        usados.add(i);
        usados.add(j);
        resultado.push({
          ...comValor,
          itens: comItens.itens.map((it) =>
            it.total == null && it.unitario == null && comItens.itens.length === 1
              ? { ...it, total: comValor.valor }
              : it,
          ),
          itensRaw: comItens.itensRaw,
          recebedor: recebedorEhConhecido(comValor.recebedor)
            ? comValor.recebedor
            : comItens.recebedor,
          comprovante: comValor.comprovante || comItens.comprovante,
        });
        break;
      }
      if (usados.has(i)) return;
    }
    usados.add(i);
    resultado.push(atual);
  });

  return resultado.sort((a, b) => tempoDe(b) - tempoDe(a));
}


export const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export const RECEBEDOR_DESCONHECIDO = new Set([
  "Não informado",
  "Sem comprovante",
  "",
]);

export function recebedorEhConhecido(recebedor: string | null | undefined): boolean {
  if (recebedor == null) return false;
  const t = recebedor.trim();
  return t.length > 0 && !RECEBEDOR_DESCONHECIDO.has(t);
}

export function nomesProdutos(
  itens: Item[],
  fallback = "Sem descrição",
  separador = " · ",
): string {
  if (!itens.length) return fallback;
  const nomes = itens.map((it) => it.nome.trim()).filter(Boolean);
  if (!nomes.length) return fallback;
  return Array.from(new Set(nomes)).join(separador);
}

export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
