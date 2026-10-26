import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BalanceSummary, GoalCard, LedgerList, Section } from "@/components/app/bits";
import { computeBalance, formatBRL, type LedgerKind } from "@/lib/money";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Modo demonstração — Mesada Inteligente" },
      { name: "description", content: "Veja como funciona o Mesada Inteligente com dados fictícios." },
      { property: "og:title", content: "Modo demonstração — Mesada Inteligente" },
      { property: "og:description", content: "Veja como funciona o Mesada Inteligente com dados fictícios." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Demo,
});

// Dados fictícios, apenas em memória. Nada aqui é salvo nem lido do servidor.
const L = (id: string, kind: LedgerKind, amount_cents: number, note: string, occurred_on: string) =>
  ({ id, kind, amount_cents, note, occurred_on, created_at: occurred_on + "T12:00:00Z", created_by: "demo" });
const ENTRIES = [
  L("5", "reserve_add", 1500, "Para o fone", "2026-10-20"),
  L("4", "payment", 1000, "Em dinheiro", "2026-10-19"),
  L("3", "task_reward", 500, "Lavar a louça", "2026-10-18"),
  L("2", "task_reward", 300, "Arrumar o quarto", "2026-10-16"),
  L("1", "allowance", 2000, "Mesada da semana de 12/10/2026", "2026-10-18"),
];
const TASKS = [
  { t: "Arrumar a cama", v: 100, f: "Diária", s: "Aprovada" },
  { t: "Lavar a louça do jantar", v: 300, f: "Diária", s: "Aguardando" },
  { t: "Ler 30 páginas", v: 500, f: "Semanal", s: "Disponível" },
];

function Demo() {
  const [view, setView] = useState<"child" | "parent">("child");
  const balance = computeBalance(ENTRIES);
  return (
    <main className="mx-auto max-w-md space-y-5 pb-10">
      <div role="status" className="sticky top-0 z-10 bg-warning px-5 py-2 text-center text-sm font-semibold text-warning-foreground safe-top">
        MODO DEMONSTRAÇÃO · dados fictícios · nada é salvo
      </div>
      <div className="flex items-center justify-between px-5">
        <h1 className="text-2xl font-bold">{view === "child" ? "Oi, Luiza!" : "Olá, Mãe"}</h1>
        <Button asChild size="sm" variant="ghost"><Link to="/">Sair do demo</Link></Button>
      </div>
      <div className="grid grid-cols-2 gap-2 px-5" role="tablist">
        <Button role="tab" aria-selected={view === "child"} variant={view === "child" ? "default" : "outline"} onClick={() => setView("child")}>Visão da criança</Button>
        <Button role="tab" aria-selected={view === "parent"} variant={view === "parent" ? "default" : "outline"} onClick={() => setView("parent")}>Visão dos pais</Button>
      </div>
      <BalanceSummary balance={balance} childName={view === "parent" ? "Luiza" : undefined} />
      <Section title="Meta"><GoalCard goal={{ title: "Fone de ouvido", target_cents: 8000 }} saved={balance.owed} /></Section>
      <Section title={view === "child" ? "Minhas tarefas" : "Aguardando aprovação"}>
        <ul className="space-y-2">
          {(view === "child" ? TASKS : TASKS.filter((t) => t.s === "Aguardando")).map((t) => (
            <li key={t.t} className="flex items-center justify-between rounded-2xl bg-card p-3 shadow-card">
              <div><p className="font-semibold">{t.t}</p><p className="text-xs text-muted-foreground">{t.f} · +{formatBRL(t.v)}</p></div>
              <Badge variant="secondary">{t.s}</Badge>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Extrato"><LedgerList entries={ENTRIES} /></Section>
      <div className="space-y-2 px-5">
        <p className="text-center text-sm text-muted-foreground">Gostou? Crie sua conta para usar com dados reais — eles ficam totalmente separados deste demo.</p>
        <Button asChild size="lg" className="w-full"><Link to="/auth">Criar minha família</Link></Button>
      </div>
    </main>
  );
}
