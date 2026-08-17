import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, RefreshCw, Trash2, FolderOpen } from "lucide-react";
import { toast } from "sonner";

import {
  adicionarGrupo,
  apagarGrupo,
  listarGrupos,
  type Grupo,
} from "@/lib/grupos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function GerenciarGrupos({
  onGruposAlterados,
}: {
  onGruposAlterados?: () => void;
}) {
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [paraExcluir, setParaExcluir] = useState<Grupo | null>(null);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["grupos"],
    retry: false,
    queryFn: listarGrupos,
  });

  const grupos = data ?? [];

  const atualizar = async () => {
    await queryClient.invalidateQueries({ queryKey: ["grupos"] });
    onGruposAlterados?.();
  };

  const criar = useMutation({
    mutationFn: (n: string) => adicionarGrupo(n),
    onSuccess: async () => {
      toast.success("Grupo adicionado com sucesso.");
      setAberto(false);
      setNome("");
      await atualizar();
    },
    onError: (e: Error) =>
      toast.error("Não foi possível adicionar o grupo.", {
        description: e.message,
      }),
  });

  const excluir = useMutation({
    mutationFn: (n: string) => apagarGrupo(n),
    onSuccess: async () => {
      toast.success("Grupo excluído com sucesso.");
      setParaExcluir(null);
      await atualizar();
    },
    onError: (e: Error) =>
      toast.error("Não foi possível excluir o grupo.", {
        description: e.message,
      }),
  });

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Gerenciar grupos</h2>
          <p className="text-xs text-muted-foreground">
            Cadastre ou remova os grupos usados nos lançamentos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Atualizar
          </Button>
          <Button size="sm" onClick={() => setAberto(true)}>
            <Plus className="size-4" /> Adicionar grupo
          </Button>
        </div>
      </div>

      <div className="surface-card p-5">
        {isLoading ? (
          <div className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Carregando grupos...
          </div>
        ) : error ? (
          <div className="py-6">
            <p className="text-sm font-medium text-destructive">
              Não foi possível carregar os grupos.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {(error as Error).message}
            </p>
            <Button className="mt-4" size="sm" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : grupos.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <FolderOpen className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhum grupo cadastrado ainda.
            </p>
            <Button size="sm" className="mt-2" onClick={() => setAberto(true)}>
              <Plus className="size-4" /> Adicionar grupo
            </Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {grupos.map((g) => (
              <li
                key={g.nome}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-secondary/50 px-4 py-3 text-sm"
              >
                <span className="min-w-0 truncate font-medium">{g.nome}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setParaExcluir(g)}
                  disabled={excluir.isPending}
                >
                  <Trash2 className="size-4" /> Excluir
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog
        open={aberto}
        onOpenChange={(o) => {
          if (!criar.isPending) setAberto(o);
        }}
      >
        <DialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const valor = nome.trim();
              if (!valor || criar.isPending) return;
              criar.mutate(valor);
            }}
          >
            <DialogHeader>
              <DialogTitle>Adicionar grupo</DialogTitle>
              <DialogDescription>
                Informe o nome do novo grupo de gastos.
              </DialogDescription>
            </DialogHeader>
            <div className="my-4 space-y-2">
              <Label htmlFor="nome-grupo">Nome do grupo</Label>
              <Input
                id="nome-grupo"
                value={nome}
                autoFocus
                placeholder="Ex.: Obra casa cristal"
                onChange={(e) => setNome(e.target.value)}
                disabled={criar.isPending}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAberto(false)}
                disabled={criar.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={criar.isPending || !nome.trim()}>
                {criar.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={paraExcluir !== null}
        onOpenChange={(o) => {
          if (!o && !excluir.isPending) setParaExcluir(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir grupo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o grupo &quot;{paraExcluir?.nome}
              &quot;? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluir.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={excluir.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (paraExcluir && !excluir.isPending)
                  excluir.mutate(paraExcluir.nome);
              }}
            >
              {excluir.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
