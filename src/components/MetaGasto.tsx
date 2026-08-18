import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Target, Pencil } from "lucide-react";
import { toast } from "sonner";

import { brl } from "@/lib/despesas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const STORAGE_KEY = "metas-gastos-v1";

type Metas = Record<string, number>;

function lerMetas(): Metas {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Metas) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function salvarMetas(metas: Metas) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(metas));
  } catch {
    /* ignora */
  }
}

export function MetaGasto({
  grupo,
  total,
  periodoLabel,
}: {
  grupo: string;
  total: number;
  periodoLabel: string;
}) {
  const chave = grupo.toLowerCase();
  const [metas, setMetas] = useState<Metas>({});
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState("");

  useEffect(() => {
    setMetas(lerMetas());
  }, []);

  const meta = metas[chave] ?? 0;
  const pct = meta > 0 ? (total / meta) * 100 : 0;
  const restante = meta - total;

  const status = useMemo(() => {
    if (meta <= 0) return "sem-meta" as const;
    if (pct >= 100) return "estourou" as const;
    if (pct >= 80) return "atencao" as const;
    return "ok" as const;
  }, [meta, pct]);

  useEffect(() => {
    if (status === "estourou") {
      toast.error(`Meta de ${grupo} ultrapassada`, {
        id: `meta-${chave}-estourou`,
        description: `${brl(total)} gastos de ${brl(meta)} (${pct.toFixed(0)}%).`,
      });
    } else if (status === "atencao") {
      toast.warning(`Você já usou ${pct.toFixed(0)}% da meta de ${grupo}`, {
        id: `meta-${chave}-atencao`,
        description: `Restam ${brl(Math.max(restante, 0))} para o limite.`,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, chave]);

  function salvar() {
    const valor = Number(rascunho.replace(/\./g, "").replace(",", "."));
    const proximo = { ...metas };
    if (!rascunho.trim() || !Number.isFinite(valor) || valor <= 0) {
      delete proximo[chave];
      toast.success("Meta removida.");
    } else {
      proximo[chave] = valor;
      toast.success(`Meta de ${brl(valor)} definida para ${grupo}.`);
    }
    setMetas(proximo);
    salvarMetas(proximo);
    setAberto(false);
  }

  const acento =
    status === "estourou"
      ? "text-destructive"
      : status === "atencao"
        ? "text-amber-400"
        : "text-primary-foreground";

  const barra =
    status === "estourou"
      ? "bg-destructive"
      : status === "atencao"
        ? "bg-amber-400"
        : "bg-primary";

  const editar = (
    <Dialog
      open={aberto}
      onOpenChange={(o) => {
        setAberto(o);
        if (o) setRascunho(meta ? String(meta) : "");
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-current opacity-80 hover:bg-white/10 hover:opacity-100"
        >
          <Pencil className="size-4" />
          {meta > 0 ? "Editar meta" : "Definir meta"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Meta de gastos — {grupo}</DialogTitle>
          <DialogDescription>
            Defina o limite em reais para o período selecionado. Deixe vazio
            para remover a meta.
          </DialogDescription>
        </DialogHeader>
        <Input
          autoFocus
          inputMode="decimal"
          placeholder="Ex.: 2000"
          value={rascunho}
          onChange={(e) => setRascunho(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && salvar()}
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => setAberto(false)}>
            Cancelar
          </Button>
          <Button onClick={salvar}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <section className="surface-hero p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] opacity-70">
          <Target className="size-4" />
          <span>Meta · {periodoLabel}</span>
        </div>
        {editar}
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-x-10 gap-y-4">
        <div>
          <p className="text-xs uppercase tracking-wider opacity-60">
            Já gastei
          </p>
          <p className="mt-1 text-4xl font-semibold tabular-nums md:text-5xl">
            {brl(total)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider opacity-60">Meta</p>
          <p className="mt-1 text-2xl font-medium tabular-nums opacity-80 md:text-3xl">
            {meta > 0 ? brl(meta) : "—"}
          </p>
        </div>
        {meta > 0 ? (
          <div className="ml-auto text-right">
            <p className={`text-3xl font-semibold tabular-nums ${acento}`}>
              {pct.toFixed(0)}%
            </p>
            <p className="text-xs opacity-70">
              {restante >= 0
                ? `restam ${brl(restante)}`
                : `excedeu ${brl(Math.abs(restante))}`}
            </p>
          </div>
        ) : null}
      </div>

      {meta > 0 ? (
        <>
          <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-white/15">
            <div
              className={`h-full rounded-full transition-all ${barra}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm opacity-90">
            {status === "estourou" ? (
              <>
                <AlertTriangle className="size-4 text-destructive" />
                <span>Meta ultrapassada em {brl(Math.abs(restante))}.</span>
              </>
            ) : status === "atencao" ? (
              <>
                <AlertTriangle className="size-4 text-amber-400" />
                <span>Atenção: restam apenas {brl(restante)}.</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" />
                <span>Dentro da meta.</span>
              </>
            )}
          </div>
        </>
      ) : (
        <p className="mt-5 text-sm opacity-70">
          Nenhuma meta definida para este grupo. Defina um limite (ex.: R$
          2.000) e acompanhe o quanto já foi gasto.
        </p>
      )}
    </section>
  );
}
