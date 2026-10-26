import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Mesada Inteligente" },
      { name: "description", content: "Entre ou crie sua conta no Mesada Inteligente." },
      { property: "og:title", content: "Entrar — Mesada Inteligente" },
      { property: "og:description", content: "Entre ou crie sua conta no Mesada Inteligente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) navigate({ to: "/inicio", replace: true }); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => { if (s) navigate({ to: "/inicio", replace: true }); });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function signIn() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message === "Invalid login credentials" ? "E-mail ou senha incorretos" : error.message);
  }
  async function signUp() {
    if (password.length < 8) return toast.error("A senha precisa ter pelo menos 8 caracteres");
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/inicio" } });
    setBusy(false);
    if (error) return toast.error(error.message);
    if (!data.session) setSent(true);
  }
  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error("Não foi possível entrar com Google");
  }

  if (sent) {
    return (
      <main className="mx-auto max-w-md space-y-4 px-6 py-16 text-center safe-top">
        <h1 className="text-2xl font-bold">Confira seu e-mail 📬</h1>
        <p className="text-muted-foreground">Enviamos um link de confirmação para <strong>{email}</strong>. Depois de confirmar, volte e entre.</p>
        <Button variant="outline" onClick={() => setSent(false)}>Voltar</Button>
      </main>
    );
  }

  const fields = (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pw">Senha</Label>
        <Input id="pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
    </>
  );

  return (
    <main className="mx-auto max-w-md space-y-6 px-6 py-12 safe-top">
      <h1 className="text-3xl font-bold">Mesada Inteligente</h1>
      <Tabs defaultValue="in">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="in">Entrar</TabsTrigger>
          <TabsTrigger value="up">Criar conta</TabsTrigger>
        </TabsList>
        <TabsContent value="in" className="space-y-3 pt-3">
          {fields}
          <Button className="w-full" size="lg" disabled={busy || !email || !password} onClick={signIn}>Entrar</Button>
        </TabsContent>
        <TabsContent value="up" className="space-y-3 pt-3">
          {fields}
          <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres. Crianças podem usar um e-mail criado com ajuda dos responsáveis.</p>
          <Button className="w-full" size="lg" disabled={busy || !email || !password} onClick={signUp}>Criar conta</Button>
        </TabsContent>
      </Tabs>
      <div className="relative text-center text-xs text-muted-foreground"><span className="bg-background px-2">ou</span></div>
      <Button variant="outline" size="lg" className="w-full" onClick={google}>Continuar com Google</Button>
    </main>
  );
}
