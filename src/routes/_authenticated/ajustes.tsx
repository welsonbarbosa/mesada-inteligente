import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageHeader, Section } from "@/components/app/bits";
import { MoneyField } from "@/components/app/ParentActions";
import { errMsg, useInvites, useMe, useRefresh } from "@/lib/family";
import { formatBRL, parseBRL } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/ajustes")({
  head: () => ({ meta: [{ title: "Ajustes — Mesada Inteligente" }] }),
  component: Settings,
});

function Settings() {
  const me = useMe().data!;
  const isParent = me.member!.role === "parent";
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Ajustes" subtitle={`${me.member!.display_name} · ${isParent ? "Responsável" : "Criança"} · ${me.email}`} />
      {isParent && <AllowanceSettings />}
      {isParent && <Invites />}
      <Section title="Família">
        <ul className="divide-y rounded-2xl bg-card shadow-card">
          {me.members.map((m) => (
            <li key={m.id} className="flex justify-between p-3 text-sm">
              <span className="font-medium">{m.display_name}</span>
              <span className="text-muted-foreground">{m.role === "parent" ? "Responsável" : "Criança"}</span>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Instalar no iPhone">
        <ol className="list-decimal space-y-1 rounded-2xl bg-soft p-4 pl-8 text-sm">
          <li>Abra este app no <strong>Safari</strong>.</li>
          <li>Toque em <strong>Compartilhar</strong> (quadrado com seta para cima).</li>
          <li>Escolha <strong>Adicionar à Tela de Início</strong> e confirme.</li>
        </ol>
      </Section>
      <div className="px-5"><Button variant="outline" className="w-full" onClick={signOut}>Sair da conta</Button></div>
    </div>
  );
}

function AllowanceSettings() {
  const fam = useMe().data!.family!;
  const refresh = useRefresh();
  const [amount, setAmount] = useState((fam.allowance_cents / 100).toFixed(2).replace(".", ","));
  const [active, setActive] = useState(fam.allowance_active);
  const [busy, setBusy] = useState(false);

  async function save() {
    const cents = parseBRL(amount);
    if (cents === null) return toast.error("Valor inválido");
    setBusy(true);
    const { error } = await supabase.rpc("set_allowance", { _cents: cents, _active: active });
    setBusy(false);
    if (error) return toast.error(errMsg(error));
    toast.success(`Mesada base: ${formatBRL(cents)}/semana`);
    refresh();
  }

  return (
    <Section title="Mesada base semanal">
      <div className="space-y-3 rounded-2xl bg-card p-4 shadow-card">
        <MoneyField id="al" label="Valor por semana (R$)" value={amount} onChange={setAmount} />
        <div className="flex items-center justify-between">
          <Label htmlFor="aa">Mesada ativa</Label>
          <Switch id="aa" checked={active} onCheckedChange={setActive} />
        </div>
        <p className="text-xs text-muted-foreground">Independe das tarefas. Creditada quando você toca em “Fechar semana”. Mudanças valem para os próximos fechamentos.</p>
        <Button className="w-full" disabled={busy} onClick={save}>Salvar mesada</Button>
      </div>
    </Section>
  );
}

function Invites() {
  const inv = useInvites(true);
  const refresh = useRefresh();
  async function regen() {
    if (!confirm("Gerar novos códigos? Os atuais deixam de funcionar.")) return;
    const { error } = await supabase.rpc("regenerate_invites");
    if (error) return toast.error(errMsg(error));
    toast.success("Novos códigos gerados");
    refresh();
  }
  return (
    <Section title="Códigos de convite" action={<Button size="sm" variant="ghost" onClick={regen}>Gerar novos</Button>}>
      <div className="grid grid-cols-2 gap-2">
        <Code label="Para a criança" code={inv.data?.child_code} />
        <Code label="Outro responsável" code={inv.data?.parent_code} />
      </div>
      <p className="text-xs text-muted-foreground">A pessoa cria a conta, toca em “Tenho um código” e digita o código.</p>
    </Section>
  );
}

function Code({ label, code }: { label: string; code?: string }) {
  return (
    <button type="button" className="rounded-2xl bg-card p-3 text-left shadow-card"
      onClick={() => code && navigator.clipboard?.writeText(code).then(() => toast.success("Código copiado"))}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono text-xl font-bold tracking-widest">{code ?? "······"}</p>
      <p className="text-[10px] text-muted-foreground">Toque para copiar</p>
    </button>
  );
}
