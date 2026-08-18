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
  Check,
  ChevronsUpDown,
  Filter,
  LayoutDashboard,
  Loader2,
  LogOut,
  Receipt,
  RefreshCw,
  ShoppingBasket,
  Users,
  UserRound,
  Wallet,
  FolderCog,
} from "lucide-react";

import { getDespesas } from "@/lib/despesas.functions";
import { normalizar, MESES, brl, recebedorEhConhecido, nomesProdutos, formatarDataHora, type Despesa } from "@/lib/despesas";
import { GerenciarGrupos } from "@/components/GerenciarGrupos";
import { GerenciarPessoas } from "@/components/GerenciarPessoas";
import { MetaGasto } from "@/components/MetaGasto";
import { AuthProvider, useAuth } from "@/components/AuthProvider";
import { LoginWhatsApp } from "@/components/LoginWhatsApp";
import { listarGrupos, type Grupo as GrupoCadastrado } from "@/lib/grupos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

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
  component: PainelPage,
});

function PainelPage() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}

function Gate() {
  const { usuario, carregando, entrar } = useAuth();

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (!usuario) return <LoginWhatsApp onEntrar={entrar} />;

  return <Dashboard />;
}

const TODOS = "todos";
const WEBHOOK_URLS = [
  "https://noiton-n8n.lm218l.easypanel.host/webhook-test/puxar-planilha",
];


type SectionId =
  | "visao"
  | "lancamentos"
  | "itens"
  | "recebedores"
  | "grupos"
  | "pessoas";

const SECTIONS: {
  id: SectionId;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}[] = [
  { id: "visao", label: "Visão geral", icon: LayoutDashboard },
  { id: "lancamentos", label: "Lançamentos", icon: Receipt },
  { id: "itens", label: "Itens mais comprados", icon: ShoppingBasket },
  { id: "recebedores", label: "Recebedores", icon: Users },
  { id: "grupos", label: "Gerenciar grupos", icon: FolderCog, adminOnly: true },
  { id: "pessoas", label: "Gerenciar pessoas", icon: UserRound, adminOnly: true },
];

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string | undefined;
}) {
  return (
    <div className="px-4 py-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="mt-1 text-lg font-medium tabular-nums">{value}</p>
      {hint ? (
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function Dashboard() {
  const { usuario, sair } = useAuth();
  const isAdmin = usuario?.papel === "admin";
  const secoesVisiveis = SECTIONS.filter((s) => !s.adminOnly || isAdmin);
  const fetchDespesas = useServerFn(getDespesas);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["despesas"],
    retry: false,
    queryFn: async () => {
      for (const url of WEBHOOK_URLS) {
        try {
          const res = await fetch(url, {
            headers: { accept: "application/json" },
          });
          if (res.ok) {
            const json = await res.json();
            if (Array.isArray(json)) return json;
            if (Array.isArray(json?.data)) return json.data;
          }
        } catch {
          /* tenta próximo / servidor */
        }
      }

      return await fetchDespesas();
    },
    select: (rows) => normalizar(rows),
  });

  const { data: gruposCadastrados, refetch: refetchGrupos } = useQuery<GrupoCadastrado[]>({
    queryKey: ["grupos"],
    queryFn: () => listarGrupos(),
    retry: false,
  });

  const despesas: Despesa[] = data ?? [];
  const grupos = useMemo(() => {
    const map = new Map<string, string>();
    // despesas primeiro: preserva o nome exatamente como está na planilha
    for (const d of despesas) if (d.grupo) map.set(d.grupo.toLowerCase(), d.grupo);
    for (const g of gruposCadastrados ?? []) {
      if (!map.has(g.nome.toLowerCase())) map.set(g.nome.toLowerCase(), g.nome);
    }
    let lista = Array.from(map.values()).sort((a, b) => a.localeCompare(b, "pt-BR"));
    if (!isAdmin) {
      const permitidos = new Set((usuario?.grupos ?? []).map((g) => g.toLowerCase()));
      lista = lista.filter((g) => permitidos.has(g.toLowerCase()));
    }
    return lista;
  }, [despesas, gruposCadastrados, isAdmin, usuario]);

  const hoje = new Date();
  const [section, setSection] = useState<SectionId>("visao");
  const [grupo, setGrupo] = useState<string | null>(null);
  const [ano, setAno] = useState<string>(String(hoje.getFullYear()));
  const [mes, setMes] = useState<string>(String(hoje.getMonth() + 1));
  const [dia, setDia] = useState<string>(TODOS);
  const [busca, setBusca] = useState("");
  const [metodo, setMetodo] = useState<string>(TODOS);

  const grupoAtivo = grupo ?? grupos[0] ?? null;
  const doGrupo = useMemo(
    () =>
      despesas.filter(
        (d) =>
          d.grupo.toLowerCase() === (grupoAtivo ?? "").toLowerCase(),
      ),
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
      label:
        label === "Sem data" ? label : label.slice(8) + "/" + label.slice(5, 7),
      valor: Number(valor.toFixed(2)),
      raw: label,
    })).sort((a, b) => a.raw.localeCompare(b.raw));
  }, [filtradas]);

  const porMetodo = useMemo(() => {
    const map = new Map<string, number>();
    filtradas.forEach((d) =>
      map.set(d.metodo, (map.get(d.metodo) ?? 0) + d.valor),
    );
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

  const tooltipStyle = {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    color: "var(--popover-foreground)",
  };

  const filtros = (
    <section className="surface-card grid gap-3 p-4 md:grid-cols-5">
      <div>
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
  );

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar collapsible="icon">
          <SidebarHeader className="gap-3 p-3">
            <div className="flex items-center gap-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                <Wallet className="size-4" />
              </div>
              <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="truncate text-sm font-semibold">Painel financeiro</p>
                <p className="truncate text-xs opacity-70">Análise de gastos</p>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center justify-between gap-2 rounded-md border border-sidebar-border bg-sidebar-accent px-3 py-2 text-left text-sm text-sidebar-accent-foreground transition-colors hover:opacity-90 group-data-[collapsible=icon]:hidden">
                  <span className="min-w-0">
                    <span className="block text-[10px] uppercase tracking-wider opacity-60">
                      Grupo
                    </span>
                    <span className="block truncate">
                      {grupoAtivo ?? "Sem grupos"}
                    </span>
                  </span>
                  <ChevronsUpDown className="size-4 shrink-0 opacity-70" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Alternar grupo</DropdownMenuLabel>
                {grupos.map((g) => (
                  <DropdownMenuItem key={g} onSelect={() => setGrupo(g)}>
                    <span className="truncate">{g}</span>
                    {g === grupoAtivo ? (
                      <Check className="ml-auto size-4 text-primary" />
                    ) : null}
                  </DropdownMenuItem>
                ))}
                {grupos.length === 0 ? (
                  <DropdownMenuItem disabled>Nenhum grupo</DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Funções</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {secoesVisiveis.map((s) => (
                    <SidebarMenuItem key={s.id}>
                      <SidebarMenuButton
                        isActive={section === s.id}
                        tooltip={s.label}
                        onClick={() => setSection(s.id)}
                      >
                        <s.icon className="size-4" />
                        <span>{s.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="gap-2 p-3">
            <div className="min-w-0 px-1 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-medium">{usuario?.nome}</p>
              <p className="truncate text-xs opacity-70">
                {isAdmin ? "Administrador" : "Acesso ao grupo"}
              </p>
            </div>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              <span className="group-data-[collapsible=icon]:hidden">
                Atualizar dados
              </span>
            </Button>
            <Button variant="ghost" className="w-full justify-start" onClick={sair}>
              <LogOut className="size-4" />
              <span className="group-data-[collapsible=icon]:hidden">Sair</span>
            </Button>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="min-w-0">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-6" />
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold">
                {SECTIONS.find((s) => s.id === section)?.label}
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                {grupoAtivo ?? "—"} · {periodoLabel}
              </p>
            </div>
          </header>

          <main className="space-y-5 p-4 md:p-6">
            {section === "grupos" && isAdmin ? (
              <GerenciarGrupos
                onGruposAlterados={() => {
                  refetch();
                  refetchGrupos();
                }}
              />
            ) : section === "pessoas" && isAdmin ? (
              <GerenciarPessoas grupos={grupos} />
            ) : isLoading ? (
              <div className="surface-card flex items-center gap-3 p-10 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" /> Carregando
                lançamentos...
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
                {grupoAtivo ? (
                  <MetaGasto
                    key={grupoAtivo}
                    grupo={grupoAtivo}
                    total={total}
                    periodoLabel={periodoLabel}
                  />
                ) : null}

                {filtros}

                <section className="surface-card grid divide-y divide-border sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-4 sm:[&>*+*]:border-l sm:[&>*+*]:border-border">
                  <Kpi
                    label="Gasto no período"
                    value={brl(total)}
                    hint={periodoLabel}
                  />
                  <Kpi
                    label="Lançamentos"
                    value={String(filtradas.length)}
                    hint={`${comComprovante} com comprovante`}
                  />
                  <Kpi label="Ticket médio" value={brl(ticket)} />
                  <Kpi
                    label="Recebedores"
                    value={String(recebedores.length)}
                    hint={recebedores[0]?.nome}
                  />
                </section>




                {section === "visao" ? (
                  <section className="grid gap-4 lg:grid-cols-3">
                    <div className="surface-card p-5 lg:col-span-2">
                      <h2 className="text-sm font-medium">Gastos por data</h2>
                      <div className="mt-4 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={porDia}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="var(--border)"
                            />
                            <XAxis
                              dataKey="label"
                              stroke="var(--muted-foreground)"
                              fontSize={12}
                            />
                            <YAxis
                              stroke="var(--muted-foreground)"
                              fontSize={12}
                            />
                            <Tooltip
                              formatter={(v: number) => brl(v)}
                              contentStyle={tooltipStyle}
                            />
                            <Bar
                              dataKey="valor"
                              fill="var(--chart-1)"
                              radius={[6, 6, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="surface-card p-5">
                      <h2 className="text-sm font-medium">
                        Por método de pagamento
                      </h2>
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
                                <Cell
                                  key={i}
                                  fill={chartColors[i % chartColors.length]}
                                />
                              ))}
                            </Pie>
                            <Legend />
                            <Tooltip
                              formatter={(v: number) => brl(v)}
                              contentStyle={tooltipStyle}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </section>
                ) : null}

                {section === "lancamentos" ? (
                  <section className="surface-card px-5 py-1">
                    {filtradas.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nenhum lançamento neste período.
                      </p>
                    ) : (
                      filtradas.map((d) => (
                        <details
                          key={d.id}
                          className="border-b border-border px-1 py-3 last:border-0"
                        >
                          <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                            <span className="flex flex-wrap items-center gap-2 text-sm">
                              <span className="font-medium">
                                {recebedorEhConhecido(d.recebedor)
                                  ? d.recebedor
                                  : nomesProdutos(d.itens)}
                              </span>
                              <Badge variant="outline">{d.metodo}</Badge>
                              {d.comprovante ? (
                                <Badge>Comprovante</Badge>
                              ) : (
                                <Badge variant="destructive">
                                  Sem comprovante
                                </Badge>
                              )}
                            </span>
                            <span className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground">
                              {formatarDataHora(d)}
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
                  </section>
                ) : null}

                {section === "itens" ? (
                  <section className="surface-card px-5 py-1">
                    {itensRank.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nenhum item detalhado no período.
                      </p>
                    ) : (
                      itensRank.map((it) => (
                        <div
                          key={it.nome}
                          className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-1 py-3 text-sm last:border-0"
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
                      ))
                    )}
                  </section>
                ) : null}

                {section === "recebedores" ? (
                  <section className="surface-card px-5 py-1">
                    {recebedores.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nenhum recebedor neste período.
                      </p>
                    ) : (
                      recebedores.map((r) => (
                        <div
                          key={r.nome}
                          className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-1 py-3 text-sm last:border-0"
                        >
                          <span>{r.nome || "—"}</span>
                          <span className="flex items-center gap-6 text-muted-foreground">
                            <span>{r.n} lançamentos</span>
                            <span className="font-medium text-foreground tabular-nums">
                              {brl(r.total)}
                            </span>
                          </span>
                        </div>
                      ))
                    )}
                  </section>
                ) : null}
              </>
            )}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
