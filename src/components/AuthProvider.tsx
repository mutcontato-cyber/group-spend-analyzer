import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import {
  lerSessao,
  limparSessao,
  salvarSessao,
  validarSessao,
  type Sessao,
  type Usuario,
} from "@/lib/auth";

type AuthContexto = {
  usuario: Usuario | null;
  carregando: boolean;
  entrar: (s: Sessao) => void;
  sair: () => void;
};

const Ctx = createContext<AuthContexto | null>(null);

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const s = lerSessao();
    if (!s) {
      setCarregando(false);
      return;
    }
    setUsuario(s.usuario);
    setCarregando(false);

    // revalida em segundo plano quando houver token
    if (s.token) {
      validarSessao(s.token).then((u) => {
        if (u) {
          setUsuario(u);
          salvarSessao({ ...s, usuario: u });
        }
      });
    }
  }, []);

  const entrar = useCallback((s: Sessao) => {
    salvarSessao(s);
    setUsuario(s.usuario);
  }, []);

  const sair = useCallback(() => {
    limparSessao();
    setUsuario(null);
  }, []);

  return <Ctx.Provider value={{ usuario, carregando, entrar, sair }}>{children}</Ctx.Provider>;
}
