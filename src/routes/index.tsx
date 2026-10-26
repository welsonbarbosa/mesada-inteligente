import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Sparkles, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mesada Inteligente — mesada e tarefas em família" },
      { name: "description", content: "Mesada semanal, tarefas extras, cofrinho e metas de compra para pais e filhos." },
      { property: "og:title", content: "Mesada Inteligente" },
      { property: "og:description", content: "Mesada semanal, tarefas extras, cofrinho e metas de compra para pais e filhos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10 safe-top">
      <div className="flex-1 space-y-6">
        <img src="/icon-512.png" alt="" width={88} height={88} className="rounded-3xl shadow-card" />
        <h1 className="text-4xl font-bold leading-tight">
          Mesada <span className="text-primary">Inteligente</span>
        </h1>
        <p className="text-lg text-muted-foreground">
          Mesada semanal + tarefas extras, com metas de compra e um extrato que todo mundo entende.
        </p>
        <ul className="space-y-3 text-sm">
          <li className="flex gap-3"><Sparkles className="size-5 shrink-0 text-primary" /> Tarefas diárias e semanais aprovadas pelos responsáveis.</li>
          <li className="flex gap-3"><PiggyBank className="size-5 shrink-0 text-primary" /> Cofrinho e meta de compra com progresso.</li>
          <li className="flex gap-3"><ShieldCheck className="size-5 shrink-0 text-primary" /> Saldo virtual: nada de banco ou Pix, só controle.</li>
        </ul>
      </div>
      <div className="space-y-3 pt-8">
        <Button asChild size="lg" className="w-full"><Link to="/auth">Entrar ou criar conta</Link></Button>
        <Button asChild size="lg" variant="outline" className="w-full"><Link to="/demo">Ver modo demonstração</Link></Button>
      </div>
    </main>
  );
}
