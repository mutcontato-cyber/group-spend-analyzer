import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  ArrowUpRight,
  Filter,
  Loader2,
  Receipt,
  RefreshCw,
  ShoppingBasket,
  Users,
  Wallet,
} from "lucide-react";

import { getDespesas } from "@/lib/despesas.functions";
import { normalizar, MESES, brl, type Despesa } from "@/lib/despesas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard Financeiro | Controle de Gastos por Grupo" },
      {
        name: "description",
        content:
          "Painel financeiro que analisa gastos por grupo, período, recebedores e itens mais comprados, com dados sincronizados da planilha.",
      },
      { property: "og:title", content: "Dashboard Financeiro por Grupo" },
      {
        property: "og:description",
        content:
          "Analise gastos por mês, ano e dia, veja itens mais comprados e recebedores em cada grupo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const TODOS = "todos";
const WEBHOOK_URL =
  "https://noiton-n8n.lm218l.easypanel.host/webhook/puxar-planilha";

function Kpi({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  hint?: string | undefined;
}) {
  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <Icon className="size-4 text-primary" />
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function Dashboard() {
  const fetchDespesas = useServerFn(getDespesas);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["despesas"],
    retry: false,
    queryFn: async () => {
      // 1) tenta direto do navegador (o n8n pode não ser acessível pelo servidor)
      try {
        const res = await fetch(WEBHOOK_URL, {
          headers: { accept: "application/json" },
        });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json)) return json;
          if (Array.isArray(json?.data)) return json.data;
        }
      } catch {
        /* segue para o fallback no servidor */
      }
      // 2) fallback via servidor (evita bloqueio de CORS)
      return await fetchDespesas();
    },
    select: (rows) => normalizar(rows),
  });

  const despesas: Despesa[] = data ?? [];
  const grupos = useMemo(
    () => Array.from(new Set(despesas.map((d) => d.grupo))).sort(),
    [despesas],
  );

  const hoje = new Date();
  const [grupo, setGrupo] = useState<string | null>(null);
  const [ano, setAno] = useState<string>(String(hoje.getFullYear()));
  const [mes, setMes] = useState<string>(String(hoje.getMonth() + 1));
  const [dia, setDia] = useState<string>(TODOS);
  const [busca, setBusca] = useState("");
  const [metodo, setMetodo] = useState<string>(TODOS);

  const grupoAtivo = grupo ?? grupos[0] ?? null;
  const doGrupo = useMemo(
    () => despesas.filter((d) => d.grupo === grupoAtivo),
    [despesas, grupoAtivo],
  );

  const anos = useMemo(
    () =>
      Array.from(
        new Set(doGrupo.map((d) => d.ano).filter((a): a is number => !!a)),
      ).sort((a, b) => b - a),
    [doGrupo],
  );
  const metodos = useMemo(
    () => Array.from(new Set(doGrupo.map((d) => d.metodo))).sort(),
    [doGrupo],
  );

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return doGrupo.filter((d) => {
      if (ano !== TODOS && String(d.ano ?? "") !== ano) return false;
      if (mes !== TODOS && String(d.mes ?? "") !== mes) return false;
      if (dia !== TODOS && String(d.dia ?? "") !== dia) return false;
      if (metodo !== TODOS && d.metodo !== metodo) return false;
      if (
        q &&
        !`${d.recebedor} ${d.itensRaw} ${d.metodo}`.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [doGrupo, ano, mes, dia, metodo, busca]);

  const total = filtradas.reduce((s, d) => s + d.valor, 0);
  const comComprovante = filtradas.filter((d) => d.comprovante).length;
  const ticket = filtradas.length ? total / filtradas.length : 0;

  const porDia = useMemo(() => {
    const map = new Map<string, number>();
    filtradas.forEach((d) => {
      const k = d.data ?? "Sem data";
      map.set(k, (map.get(k) ?? 0) + d.valor);
    });
    return Array.from(map, ([label, valor]) => ({
      label: label === "Sem data" ? label : label.slice(8) + "/" + label.slice(5, 7),
      valor: Number(valor.toFixed(2)),
      raw: label,
    })).sort((a, b) => a.raw.localeCompare(b.raw));
  }, [filtradas]);

  const porMetodo = useMemo(() => {
    const map = new Map<string, number>();
    filtradas.forEach((d) => map.set(d.metodo, (map.get(d.metodo) ?? 0) + d.valor));
    return Array.from(map, ([name, value]) => ({
      name,
      value: Number(value.toFixed(2)),
    }));
  }, [filtradas]);

  const recebedores = useMemo(() => {
    const map = new Map<string, { total: number; n: number }>();
    filtradas.forEach((d) => {
      const cur = map.get(d.recebedor) ?? { total: 0, n: 0 };
      map.set(d.recebedor, { total: cur.total + d.valor, n: cur.n + 1 });
    });
    return Array.from(map, ([nome, v]) => ({ nome, ...v })).sort(
      (a, b) => b.total - a.total,
    );
  }, [filtradas]);

  const itensRank = useMemo(() => {
    const map = new Map<string, { qtd: number; total: number; vezes: number }>();
    filtradas.forEach((d) =>
      d.itens.forEach((it) => {
        const key = it.nome.toUpperCase();
        const cur = map.get(key) ?? { qtd: 0, total: 0, vezes: 0 };
        map.set(key, {
          qtd: cur.qtd + (it.qtd ?? 0),
          total: cur.total + (it.total ?? 0),
          vezes: cur.vezes + 1,
        });
      }),
    );
    return Array.from(map, ([nome, v]) => ({ nome, ...v })).sort(
      (a, b) => b.vezes - a.vezes || b.total - a.total,
    );
  }, [filtradas]);

  const chartColors = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ];

  const periodoLabel =
    (mes === TODOS ? "Todos os meses" : MESES[Number(mes) - 1]) +
    " · " +
    (ano === TODOS ? "todos os anos" : ano) +
    (dia === TODOS ? "" : ` · dia ${dia}`);

  return (
    <main className="min-h-screen px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="surface-hero flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-primary">
              Painel financeiro
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Análise de gastos</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Dados sincronizados da planilha · {periodoLabel}
            </p>
          </div>
          <Button variant="secondary" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Atualizar
          </Button>
        </header>

        {isLoading ? (
          <div className="surface-card flex items-center gap-3 p-10 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" /> Carregando lançamentos...
          </div>
        ) : error ? (
          <div className="surface-card p-8">
            <p className="font-medium text-destructive">
              Não foi possível carregar a planilha.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {(error as Error).message}
            </p>
            <Button className="mt-4" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : (
          <>
            <nav className="flex flex-wrap gap-2">
              {grupos.map((g) => (
                <button
                  key={g}
                  onClick={() => setGrupo(g)}
                  className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                    g === grupoAtivo
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {g}
                </button>
              ))}
            </nav>

            <section className="surface-card grid gap-3 p-4 md:grid-cols-5">
              <div className="md:col-span-1">
                <label className="text-xs text-muted-foreground">Ano</label>
                <Select value={ano} onValueChange={setAno}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TODOS}>Todos</SelectItem>
                    {anos.map((a) => (
                      <SelectItem key={a} value={String(a)}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Mês</label>
                <Select value={mes} onValueChange={setMes}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TODOS}>Todos</SelectItem>
                    {MESES.map((m, i) => (
                      <SelectItem key={m} value={String(i + 1)}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Dia</label>
                <Select value={dia} onValueChange={setDia}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TODOS}>Todos</SelectItem>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Pagamento</label>
                <Select value={metodo} onValueChange={setMetodo}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TODOS}>Todos</SelectItem>
                    {metodos.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Buscar</label>
                <div className="relative mt-1">
                  <Filter className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Recebedor ou item"
                    className="pl-9"
                  />
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-4">
              <Kpi
                label="Gasto no período"
                value={brl(total)}
                icon={Wallet}
                hint={periodoLabel}
              />
              <Kpi
                label="Lançamentos"
                value={String(filtradas.length)}
                icon={Receipt}
                hint={`${comComprovante} com comprovante`}
              />
              <Kpi label="Ticket médio" value={brl(ticket)} icon={ArrowUpRight} />
              <Kpi
                label="Recebedores"
                value={String(recebedores.length)}
                icon={Users}
                hint={recebedores[0]?.nome}
              />
            </section>

            <section className="grid gap-4 lg:grid-cols-3">
              <div className="surface-card p-5 lg:col-span-2">
                <h2 className="text-sm font-medium">Gastos por data</h2>
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={porDia}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                      <Tooltip
                        formatter={(v: number) => brl(v)}
                        contentStyle={{
                          background: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          color: "var(--popover-foreground)",
                        }}
                      />
                      <Bar dataKey="valor" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="surface-card p-5">
                <h2 className="text-sm font-medium">Por método de pagamento</h2>
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={porMetodo}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        {porMetodo.map((_, i) => (
                          <Cell key={i} fill={chartColors[i % chartColors.length]} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip
                        formatter={(v: number) => brl(v)}
                        contentStyle={{
                          background: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          color: "var(--popover-foreground)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            <Tabs defaultValue="lancamentos" className="surface-card p-5">
              <TabsList>
                <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
                <TabsTrigger value="itens">Itens mais comprados</TabsTrigger>
                <TabsTrigger value="recebedores">Recebedores</TabsTrigger>
              </TabsList>

              <TabsContent value="lancamentos" className="mt-4">
                <div className="space-y-3">
                  {filtradas.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhum lançamento neste período.
                    </p>
                  ) : (
                    filtradas.map((d) => (
                      <details
                        key={d.id}
                        className="rounded-lg border border-border bg-secondary/40 p-4"
                      >
                        <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                          <span className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="font-medium">{d.recebedor}</span>
                            <Badge variant="outline">{d.metodo}</Badge>
                            {d.comprovante ? (
                              <Badge>Comprovante</Badge>
                            ) : (
                              <Badge variant="destructive">Sem comprovante</Badge>
                            )}
                          </span>
                          <span className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground">
                              {d.data ?? "sem data"} {d.hora}
                            </span>
                            <span className="font-semibold tabular-nums">
                              {brl(d.valor)}
                            </span>
                          </span>
                        </summary>
                        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                          {d.itens.length ? (
                            d.itens.map((it, i) => (
                              <div key={i} className="flex justify-between gap-4">
                                <span>
                                  {it.nome}
                                  {it.qtd
                                    ? ` · ${it.qtd} ${it.unidade ?? ""}`
                                    : ""}
                                </span>
                                <span className="tabular-nums">
                                  {it.total != null ? brl(it.total) : "—"}
                                </span>
                              </div>
                            ))
                          ) : (
                            <span>Sem itens detalhados.</span>
                          )}
                        </div>
                      </details>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="itens" className="mt-4">
                {itensRank.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum item detalhado no período.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {itensRank.map((it) => (
                      <div
                        key={it.nome}
                        className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-4 py-3 text-sm"
                      >
                        <span className="flex items-center gap-2">
                          <ShoppingBasket className="size-4 text-primary" />
                          {it.nome}
                        </span>
                        <span className="flex items-center gap-6 text-muted-foreground">
                          <span>{it.vezes}x compras</span>
                          <span>{it.qtd ? it.qtd.toFixed(2) : "—"} qtd</span>
                          <span className="font-medium text-foreground tabular-nums">
                            {it.total ? brl(it.total) : "—"}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="recebedores" className="mt-4">
                <div className="space-y-2">
                  {recebedores.map((r) => (
                    <div
                      key={r.nome}
                      className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 px-4 py-3 text-sm"
                    >
                      <span>{r.nome}</span>
                      <span className="flex items-center gap-6 text-muted-foreground">
                        <span>{r.n} lançamentos</span>
                        <span className="font-medium text-foreground tabular-nums">
                          {brl(r.total)}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </main>
  );
}
