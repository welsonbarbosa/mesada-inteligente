import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarCheck, HandCoins, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BalanceSummary, Empty, GoalCard, PageHeader, Section } from "@/components/app/bits";
import { ChildPicker, useNameOf } from "@/components/app/ChildPicker";
import { CloseWeekDialog, GoalDialog, PaymentDialog, ReserveDialog, ReviewDialog } from "@/components/app/ParentActions";
import { useBalance, useGoal, useMe, useSelectedChild, useSubmissions, useTasks } from "@/lib/family";
import { formatBRL } from "@/lib/money";
import { formatDateBR } from "@/lib/dates";

export const Route = createFileRoute("/_authenticated/inicio")({
  head: () => ({ meta: [{ title: "Início — Mesada Inteligente" }] }),
  component: Home,
});

function Home() {
  const me = useMe();
  return me.data?.member?.role === "parent" ? <ParentHome /> : <ChildHome />;
}

function ChildHome() {
  const me = useMe().data!;
  const childId = me.member!.user_id;
  const balance = useBalance(childId);
  const goal = useGoal(childId);
  const subs = useSubmissions();
  const [goalOpen, setGoalOpen] = useState(false);
  const recent = (subs.data ?? []).filter((s) => s.status !== "pending" && s.reviewed_at).slice(0, 3);
  const tasks = useTasks();
  const titleOf = (id: string) => tasks.data?.find((t) => t.id === id)?.title ?? "Tarefa";

  return (
    <div className="space-y-5">
      <PageHeader title={`Oi, ${me.member!.display_name}!`} subtitle={me.family!.name} />
      {balance.data && <BalanceSummary balance={balance.data} />}
      <Section title="Minha meta">
        <GoalCard goal={goal.data ?? null} saved={balance.data?.owed ?? 0} onEdit={() => setGoalOpen(true)} />
      </Section>
      <Section title="Respostas dos responsáveis" action={<Link to="/tarefas" className="text-sm font-medium text-primary">Ver tarefas</Link>}>
        {recent.length === 0 ? <Empty>Quando suas tarefas forem avaliadas, aparecem aqui.</Empty> : (
          <ul className="space-y-2">
            {recent.map((s) => (
              <li key={s.id} className="rounded-2xl bg-card p-3 shadow-card">
                <p className="text-sm font-semibold">{s.status === "approved" ? "✅" : "↩️"} {titleOf(s.task_id)}</p>
                <p className="text-xs text-muted-foreground">
                  {s.status === "approved" ? `Aprovada · +${formatBRL(s.reward_cents)}` : "Não aprovada — pode refazer e enviar de novo"}
                </p>
                {s.review_comment && <p className="mt-1 text-sm">“{s.review_comment}”</p>}
              </li>
            ))}
          </ul>
        )}
      </Section>
      {goalOpen && <GoalDialog open onOpenChange={setGoalOpen} childId={childId} initial={goal.data ?? null} />}
    </div>
  );
}

function ParentHome() {
  const me = useMe().data!;
  const { childId } = useSelectedChild();
  const child = me.members.find((m) => m.user_id === childId);
  const balance = useBalance(childId);
  const goal = useGoal(childId);
  const subs = useSubmissions();
  const tasks = useTasks();
  const nameOf = useNameOf();
  const [dialog, setDialog] = useState<null | "week" | "pay" | "reserve">(null);
  const [review, setReview] = useState<null | { id: string; title: string; approve: boolean }>(null);
  const pending = (subs.data ?? []).filter((s) => s.status === "pending");
  const titleOf = (id: string) => tasks.data?.find((t) => t.id === id)?.title ?? "Tarefa";

  if (!child) {
    return (
      <div className="space-y-5">
        <PageHeader title={`Olá, ${me.member!.display_name}`} subtitle={me.family!.name} />
        <div className="px-5"><Empty>Nenhuma criança na família ainda. Vá em <Link to="/ajustes" className="font-semibold text-primary">Ajustes</Link> e compartilhe o código de convite da criança.</Empty></div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title={`Olá, ${me.member!.display_name}`} subtitle={me.family!.name} />
      <ChildPicker />
      {balance.data && <BalanceSummary balance={balance.data} childName={child.display_name} />}
      <div className="grid grid-cols-3 gap-2 px-5">
        <Button variant="secondary" className="h-auto flex-col gap-1 py-3" onClick={() => setDialog("week")}><CalendarCheck className="size-5" />Fechar semana</Button>
        <Button variant="secondary" className="h-auto flex-col gap-1 py-3" onClick={() => setDialog("pay")}><HandCoins className="size-5" />Pagamento</Button>
        <Button variant="secondary" className="h-auto flex-col gap-1 py-3" onClick={() => setDialog("reserve")}><PiggyBank className="size-5" />Cofrinho</Button>
      </div>
      <Section title={`Aguardando aprovação (${pending.length})`}>
        {pending.length === 0 ? <Empty>Nada pendente por aqui. 🎈</Empty> : (
          <ul className="space-y-2">
            {pending.map((s) => (
              <li key={s.id} className="space-y-2 rounded-2xl bg-card p-3 shadow-card">
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{titleOf(s.task_id)}</p>
                    <p className="text-xs text-muted-foreground">{nameOf(s.child_id)} · período {formatDateBR(s.period_key)}</p>
                  </div>
                  <span className="text-sm font-bold text-success">+{formatBRL(s.reward_cents)}</span>
                </div>
                {s.child_note && <p className="text-sm">“{s.child_note}”</p>}
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" variant="outline" onClick={() => setReview({ id: s.id, title: titleOf(s.task_id), approve: false })}>Rejeitar</Button>
                  <Button size="sm" onClick={() => setReview({ id: s.id, title: titleOf(s.task_id), approve: true })}>Aprovar</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title={`Meta de ${child.display_name}`}>
        <GoalCard goal={goal.data ?? null} saved={balance.data?.owed ?? 0} />
      </Section>
      {balance.data && dialog === "week" && <CloseWeekDialog open onOpenChange={() => setDialog(null)} childId={child.user_id} childName={child.display_name} family={me.family!} />}
      {balance.data && dialog === "pay" && <PaymentDialog open onOpenChange={() => setDialog(null)} childId={child.user_id} childName={child.display_name} balance={balance.data} />}
      {balance.data && dialog === "reserve" && <ReserveDialog open onOpenChange={() => setDialog(null)} childId={child.user_id} childName={child.display_name} balance={balance.data} />}
      {review && <ReviewDialog open onOpenChange={() => setReview(null)} submissionId={review.id} title={review.title} approve={review.approve} />}
    </div>
  );
}
