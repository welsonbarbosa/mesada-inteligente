import { createFileRoute } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Empty, LedgerList, PageHeader, Section } from "@/components/app/bits";
import { ChildPicker, useNameOf } from "@/components/app/ChildPicker";
import { useLedger, useMe, useSelectedChild, useSubmissions, useTasks } from "@/lib/family";
import { formatBRL } from "@/lib/money";
import { formatDateBR } from "@/lib/dates";

export const Route = createFileRoute("/_authenticated/extrato")({
  head: () => ({ meta: [{ title: "Extrato — Mesada Inteligente" }] }),
  component: Statement,
});

const ST = { pending: "Aguardando", approved: "Aprovada", rejected: "Rejeitada" } as const;

function Statement() {
  const me = useMe().data!;
  const isParent = me.member!.role === "parent";
  const { childId } = useSelectedChild();
  const ledger = useLedger(childId);
  const subs = useSubmissions();
  const tasks = useTasks();
  const nameOf = useNameOf();
  const titleOf = (id: string) => tasks.data?.find((t) => t.id === id)?.title ?? "Tarefa";
  const history = (subs.data ?? []).filter((s) => s.child_id === childId).slice(0, 30);

  return (
    <div className="space-y-5">
      <PageHeader title="Extrato" subtitle={isParent ? "Histórico auditável — lançamentos não podem ser editados." : "Tudo que entrou e saiu."} />
      {isParent && <ChildPicker />}
      <Section title="Lançamentos">
        {childId ? <LedgerList entries={ledger.data ?? []} nameOf={nameOf} /> : <Empty>Nenhuma criança na família.</Empty>}
      </Section>
      <Section title="Envios de tarefas">
        {history.length === 0 ? <Empty>Nenhum envio ainda.</Empty> : (
          <ul className="divide-y overflow-hidden rounded-2xl bg-card shadow-card">
            {history.map((s) => (
              <li key={s.id} className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{titleOf(s.task_id)}</p>
                  <Badge variant={s.status === "approved" ? "default" : s.status === "rejected" ? "destructive" : "secondary"}>{ST[s.status]}</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Período {formatDateBR(s.period_key)} · {formatBRL(s.reward_cents)} · enviado em {new Date(s.created_at).toLocaleString("pt-BR")}
                </p>
                {s.review_comment && <p className="text-xs">Comentário: “{s.review_comment}”</p>}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
