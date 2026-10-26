import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { errMsg, useRefresh } from "@/lib/family";

export function Onboarding() {
  const refresh = useRefresh();
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [family, setFamily] = useState("");
  const [code, setCode] = useState("");

  async function run(fn: () => PromiseLike<{ error: unknown }>, ok: string) {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) return toast.error(errMsg(error));
    toast.success(ok);
    refresh();
  }

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-6 px-5 py-10 safe-top">
      <div>
        <h1 className="text-3xl font-bold">Bem-vindo(a)! 👋</h1>
        <p className="text-muted-foreground">Para começar, crie a família ou entre com um código de convite.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="dn">Como você quer ser chamado(a)?</Label>
        <Input id="dn" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Ex.: Mãe, Pai, Luiza" />
      </div>
      <Tabs defaultValue="create">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">Sou responsável</TabsTrigger>
          <TabsTrigger value="join">Tenho um código</TabsTrigger>
        </TabsList>
        <TabsContent value="create" className="space-y-3 pt-3">
          <div className="space-y-1.5">
            <Label htmlFor="fn">Nome da família</Label>
            <Input id="fn" value={family} onChange={(e) => setFamily(e.target.value)} maxLength={60} placeholder="Ex.: Família Barbosa" />
          </div>
          <Button
            className="w-full" size="lg" disabled={busy || !name.trim() || !family.trim()}
            onClick={() => run(() => supabase.rpc("create_family", { _family_name: family, _display_name: name }), "Família criada!")}
          >
            Criar família
          </Button>
          <p className="text-xs text-muted-foreground">Depois você recebe um código para a criança e outro para o segundo responsável.</p>
        </TabsContent>
        <TabsContent value="join" className="space-y-3 pt-3">
          <div className="space-y-1.5">
            <Label htmlFor="code">Código de convite</Label>
            <Input id="code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6}
              placeholder="ABC123" className="text-center font-mono text-xl tracking-[0.4em]" autoCapitalize="characters" />
          </div>
          <Button
            className="w-full" size="lg" disabled={busy || !name.trim() || code.length !== 6}
            onClick={() => run(() => supabase.rpc("join_family", { _code: code, _display_name: name }), "Você entrou na família!")}
          >
            Entrar na família
          </Button>
          <p className="text-xs text-muted-foreground">O código define se você entra como criança ou responsável.</p>
        </TabsContent>
      </Tabs>
      <Button variant="ghost" className="w-full" onClick={() => supabase.auth.signOut()}>Sair</Button>
    </main>
  );
}
