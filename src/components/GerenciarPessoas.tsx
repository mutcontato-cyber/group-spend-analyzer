import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, RefreshCw, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";

import {
  adicionarPessoa,
  apagarPessoa,
  formatarTelefone,
  listarPessoas,
  telefoneValido,
  type Pessoa,
} from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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

export function GerenciarPessoas({ grupos }: { grupos: string[] }) {
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [paraExcluir, setParaExcluir] = useState<Pessoa | null>(null);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["pessoas"],
    retry: false,
    queryFn: () => listarPessoas(),
  });

  const pessoas = data ?? [];

  const limpar = () => {
    setNome("");
    setTelefone("");
    setSelecionados([]);
  };

  const criar = useMutation({
    mutationFn: () => adicionarPessoa({ nome, telefone, grupos: selecionados }),
    onSuccess: async () => {
      toast.success("Pessoa adicionada com sucesso.");
      setAberto(false);
      limpar();
      await queryClient.invalidateQueries({ queryKey: ["pessoas"] });
    },
    onError: (e: Error) =>
      toast.error("Não foi possível adicionar a pessoa.", { description: e.message }),
  });

  const excluir = useMutation({
    mutationFn: (t: string) => apagarPessoa(t),
    onSuccess: async () => {
      toast.success("Pessoa removida.");
      setParaExcluir(null);
      await queryClient.invalidateQueries({ queryKey: ["pessoas"] });
    },
    onError: (e: Error) =>
      toast.error("Não foi possível remover a pessoa.", { description: e.message }),
  });

  const podeSalvar = nome.trim().length > 1 && telefoneValido(telefone) && selecionados.length > 0;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Gerenciar pessoas</h2>
          <p className="text-xs text-muted-foreground">
            Quem pode entrar no painel e a quais grupos tem acesso.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Atualizar
          </Button>
          <Button size="sm" onClick={() => setAberto(true)}>
            <Plus className="size-4" /> Adicionar pessoa
          </Button>
        </div>
      </div>

      <div className="surface-card p-5">
        {isLoading ? (
          <div className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Carregando pessoas...
          </div>
        ) : error ? (
          <div className="py-6">
            <p className="text-sm font-medium text-destructive">
              Não foi possível carregar as pessoas.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{(error as Error).message}</p>
            <Button className="mt-4" size="sm" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : pessoas.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <UserRound className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhuma pessoa cadastrada ainda.</p>
            <Button size="sm" className="mt-2" onClick={() => setAberto(true)}>
              <Plus className="size-4" /> Adicionar pessoa
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {pessoas.map((p) => (
              <li
                key={p.telefone}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {p.nome}
                    {p.papel === "admin" ? (
                      <Badge variant="secondary" className="ml-2 align-middle">
                        Admin
                      </Badge>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatarTelefone(p.telefone)}
                    {p.grupos.length ? ` · ${p.grupos.join(", ")}` : " · sem grupo"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setParaExcluir(p)}
                  disabled={excluir.isPending}
                >
                  <Trash2 className="size-4" /> Remover
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
              if (podeSalvar && !criar.isPending) criar.mutate();
            }}
          >
            <DialogHeader>
              <DialogTitle>Adicionar pessoa</DialogTitle>
              <DialogDescription>
                Ela entrará no painel com o número de WhatsApp informado.
              </DialogDescription>
            </DialogHeader>

            <div className="my-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pessoa-nome">Nome</Label>
                <Input
                  id="pessoa-nome"
                  value={nome}
                  autoFocus
                  placeholder="Ex.: Maria Silva"
                  onChange={(e) => setNome(e.target.value)}
                  disabled={criar.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pessoa-tel">WhatsApp</Label>
                <Input
                  id="pessoa-tel"
                  inputMode="tel"
                  value={telefone}
                  placeholder="(00) 00000-0000"
                  onChange={(e) => setTelefone(e.target.value)}
                  disabled={criar.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label>Grupos com acesso</Label>
                {grupos.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Cadastre um grupo antes de liberar acesso.
                  </p>
                ) : (
                  <div className="max-h-44 space-y-2 overflow-auto rounded-md border border-border p-3">
                    {grupos.map((g) => (
                      <label key={g} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={selecionados.includes(g)}
                          onCheckedChange={(v) =>
                            setSelecionados((prev) =>
                              v === true ? [...prev, g] : prev.filter((x) => x !== g),
                            )
                          }
                          disabled={criar.isPending}
                        />
                        <span className="truncate">{g}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
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
              <Button type="submit" disabled={!podeSalvar || criar.isPending}>
                {criar.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
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
            <AlertDialogTitle>Remover pessoa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover &quot;{paraExcluir?.nome}&quot;? Ela perderá o acesso
              ao painel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluir.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={excluir.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (paraExcluir && !excluir.isPending) excluir.mutate(paraExcluir.telefone);
              }}
            >
              {excluir.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
