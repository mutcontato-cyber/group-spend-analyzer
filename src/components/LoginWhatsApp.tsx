import { useState } from "react";
import { Loader2, MessageCircle, ShieldCheck, Wallet } from "lucide-react";
import { toast } from "sonner";

import {
  enviarCodigo,
  formatarTelefone,
  telefoneValido,
  validarCodigo,
  type Sessao,
} from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export function LoginWhatsApp({ onEntrar }: { onEntrar: (s: Sessao) => void }) {
  const [etapa, setEtapa] = useState<"telefone" | "codigo">("telefone");
  const [telefone, setTelefone] = useState("");
  const [codigo, setCodigo] = useState("");
  const [lembrar, setLembrar] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const pedirCodigo = async () => {
    if (!telefoneValido(telefone)) {
      toast.error("Informe um número de WhatsApp válido com DDD.");
      return;
    }
    setEnviando(true);
    try {
      await enviarCodigo(telefone);
      setEtapa("codigo");
      toast.success("Código enviado no seu WhatsApp.");
    } catch (e) {
      toast.error("Não foi possível enviar o código.", { description: (e as Error).message });
    } finally {
      setEnviando(false);
    }
  };

  const confirmar = async () => {
    if (codigo.trim().length < 4) {
      toast.error("Digite o código recebido.");
      return;
    }
    setEnviando(true);
    try {
      const sessao = await validarCodigo(telefone, codigo, lembrar);
      onEntrar(sessao);
      toast.success(`Bem-vindo, ${sessao.usuario.nome}!`);
    } catch (e) {
      toast.error("Código inválido.", { description: (e as Error).message });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wallet className="size-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold">Painel financeiro</h1>
            <p className="text-xs text-muted-foreground">Acesso por WhatsApp</p>
          </div>
        </div>

        {etapa === "telefone" ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!enviando) void pedirCodigo();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="telefone">Seu WhatsApp</Label>
              <Input
                id="telefone"
                inputMode="tel"
                autoFocus
                placeholder="(00) 00000-0000"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                disabled={enviando}
              />
              <p className="text-xs text-muted-foreground">
                Enviaremos um código de confirmação para este número.
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={enviando}>
              {enviando ? <Loader2 className="size-4 animate-spin" /> : <MessageCircle className="size-4" />}
              Receber código
            </Button>
          </form>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!enviando) void confirmar();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="codigo">Código enviado para {formatarTelefone(telefone)}</Label>
              <Input
                id="codigo"
                inputMode="numeric"
                autoFocus
                maxLength={8}
                placeholder="000000"
                className="text-center text-lg tracking-[0.4em]"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D+/g, ""))}
                disabled={enviando}
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={lembrar}
                onCheckedChange={(v) => setLembrar(v === true)}
                disabled={enviando}
              />
              Lembrar de mim por 7 dias
            </label>

            <Button type="submit" className="w-full" disabled={enviando}>
              {enviando ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
              Entrar
            </Button>
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                className="text-muted-foreground underline-offset-4 hover:underline"
                onClick={() => setEtapa("telefone")}
                disabled={enviando}
              >
                Trocar número
              </button>
              <button
                type="button"
                className="text-primary underline-offset-4 hover:underline"
                onClick={() => void pedirCodigo()}
                disabled={enviando}
              >
                Reenviar código
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
