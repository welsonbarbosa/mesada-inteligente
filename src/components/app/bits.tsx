import type { ReactNode } from "react";
import { PiggyBank, Wallet, HandCoins, Clock, Target, Pencil } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { formatBRL, KIND_LABEL, type Balance, type LedgerKind } from "@/lib/money";
import { formatDateBR } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-3 px-5 pb-3 safe-top">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="space-y-2 px-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed bg-card p-4 text-center text-sm text-muted-foreground">{children}</p>;
}

export function BalanceSummary({ balance, childName }: { balance: Balance; childName?: string | undefined }) {
  return (
    <div className="space-y-3 px-5">
      <div className="rounded-3xl bg-hero p-5 shadow-card">
        <p className="flex items-center gap-2 text-sm opacity-90">
          <Wallet className="size-4" aria-hidden /> Saldo disponível{childName ? ` de ${childName}` : ""}
        </p>
        <p className="mt-1 font-display text-4xl font-bold" aria-live="polite">{formatBRL(balance.available)}</p>
        <p className="mt-2 text-xs opacity-85">
          Ainda devido no total: <strong>{formatBRL(balance.owed)}</strong> (disponível + cofrinho)
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat icon={<PiggyBank className="size-4" />} label="No cofrinho" value={balance.reserved} />
        <Stat icon={<HandCoins className="size-4" />} label="Acumulado" value={balance.earned} />
        <Stat icon={<Clock className="size-4" />} label="Já pago" value={balance.paid} />
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Saldo virtual: o dinheiro fica com os responsáveis até ser pago. O cofrinho é uma reserva combinada, não um dinheiro guardado no app.
      </p>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-card p-3 shadow-card">
      <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">{icon}{label}</p>
      <p className="mt-1 text-sm font-bold">{formatBRL(value)}</p>
    </div>
  );
}

export function GoalCard({ goal, saved, onEdit }: { goal: { title: string; target_cents: number } | null; saved: number; onEdit?: () => void }) {
  if (!goal) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-soft p-4">
        <div className="flex items-center gap-2 text-sm"><Target className="size-5 text-primary" /> Nenhuma meta de compra ainda.</div>
        {onEdit && <Button size="sm" onClick={onEdit}>Criar meta</Button>}
      </div>
    );
  }
  const pct = Math.min(100, Math.round((Math.max(0, saved) / goal.target_cents) * 100));
  return (
    <div className="space-y-2 rounded-2xl bg-soft p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Meta de compra</p>
          <p className="font-display text-lg font-bold">{goal.title}</p>
        </div>
        {onEdit && (
          <Button size="icon" variant="ghost" onClick={onEdit} aria-label="Editar meta"><Pencil className="size-4" /></Button>
        )}
      </div>
      <Progress value={pct} aria-label={`Progresso da meta: ${pct}%`} />
      <p className="text-sm">
        <strong>{formatBRL(Math.max(0, saved))}</strong> de {formatBRL(goal.target_cents)} · {pct}%
        {pct < 100 ? ` · faltam ${formatBRL(goal.target_cents - Math.max(0, saved))}` : " · meta alcançada! 🎉"}
      </p>
    </div>
  );
}

const POSITIVE: LedgerKind[] = ["allowance", "task_reward"];

export function LedgerList({
  entries, nameOf,
}: {
  entries: { id: string; kind: LedgerKind; amount_cents: number; note: string | null; occurred_on: string; created_at: string; created_by: string }[];
  nameOf?: (userId: string) => string;
}) {
  if (!entries.length) return <Empty>Nenhum lançamento ainda.</Empty>;
  return (
    <ul className="divide-y overflow-hidden rounded-2xl bg-card shadow-card">
      {entries.map((e) => {
        const pos = POSITIVE.includes(e.kind);
        const isPay = e.kind === "payment";
        return (
          <li key={e.id} className="flex items-start justify-between gap-3 p-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{KIND_LABEL[e.kind]}</p>
              {e.note && <p className="truncate text-xs text-muted-foreground">{e.note}</p>}
              <p className="text-[11px] text-muted-foreground">
                {formatDateBR(e.occurred_on)}
                {nameOf && ` · por ${nameOf(e.created_by)} em ${new Date(e.created_at).toLocaleString("pt-BR")}`}
              </p>
            </div>
            <span className={cn("shrink-0 text-sm font-bold", pos ? "text-success" : isPay ? "text-foreground" : "text-primary")}>
              {pos ? "+" : isPay ? "−" : e.kind === "reserve_add" ? "🐷 " : "↩ "}{formatBRL(e.amount_cents)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
