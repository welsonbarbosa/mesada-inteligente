import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { errMsg, useClosures, useRefresh, type Family } from "@/lib/family";
import { formatBRL, parseBRL, type Balance } from "@/lib/money";
import { addDays, formatDateBR, todaySP, weekStart } from "@/lib/dates";
import { cn } from "@/lib/utils";

function Shell({ open, onOpenChange, title, desc, children, footer }: {
  open: boolean; onOpenChange: (v: boolean) => void; title: string; desc?: string; children: ReactNode; footer: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {desc && <DialogDescription>{desc}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-3">{children}</div>
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MoneyField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} inputMode="decimal" placeholder="0,00" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function CloseWeekDialog({ open, onOpenChange, childId, childName, family }: {
  open: boolean; onOpenChange: (v: boolean) => void; childId: string; childName: string; family: Family;
}) {
  const refresh = useRefresh();
  const closures = useClosures(childId);
  const closed = new Set((closures.data ?? []).map((c) => c.week_start));
  const current = weekStart(todaySP());
  const weeks = useMemo(() => Array.from({ length: 5 }, (_, i) => addDays(current, -7 * i)), [current]);
  const [sel, setSel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const paused = !family.allowance_active || family.allowance_cents === 0;

  async function submit() {
    if (!sel) return;
    setBusy(true);
    const { error } = await supabase.rpc("close_week", { _child: childId, _week_start: sel });
    setBusy(false);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success(`Semana fechada: ${formatBRL(family.allowance_cents)} creditados para ${childName}`);
    setSel(null);
    onOpenChange(false);
    refresh();
  }

  return (
    <Shell open={open} onOpenChange={onOpenChange} title="Fechar semana"
      desc={`Credita a mesada base de ${formatBRL(family.allowance_cents)} para ${childName}. Cada semana só pode ser fechada uma vez.`}
      footer={<Button className="w-full" disabled={!sel || busy || paused} onClick={submit}>Confirmar fechamento</Button>}>
      {paused && <p className="rounded-xl bg-warning p-2 text-sm text-warning-foreground">A mesada está pausada ou zerada. Ajuste em Ajustes.</p>}
      <ul className="space-y-2" role="radiogroup" aria-label="Semana">
        {weeks.map((w) => {
          const done = closed.has(w);
          return (
            <li key={w}>
              <button type="button" role="radio" aria-checked={sel === w} disabled={done} onClick={() => setSel(w)}
                className={cn("flex w-full items-center justify-between rounded-xl border p-3 text-left text-sm",
                  sel === w && "border-primary bg-accent", done && "opacity-50")}>
                <span>{formatDateBR(w)} – {formatDateBR(addDays(w, 6))}{w === current && " (atual)"}</span>
                <span className="text-xs">{done ? "✓ Fechada" : "Aberta"}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Shell>
  );
}

export function PaymentDialog({ open, onOpenChange, childId, childName, balance }: {
  open: boolean; onOpenChange: (v: boolean) => void; childId: string; childName: string; balance: Balance;
}) {
  const refresh = useRefresh();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todaySP());
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [idem, setIdem] = useState(() => crypto.randomUUID());
  const cents = parseBRL(amount);

  async function submit() {
    if (!cents) { toast.error("Informe um valor válido"); return; }
    setBusy(true);
    const { error } = await supabase.rpc("record_payment", { _child: childId, _amount_cents: cents, _paid_on: date, _note: note, _idem: idem });
    setBusy(false);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success(`Pagamento de ${formatBRL(cents)} registrado`);
    setAmount(""); setNote(""); setIdem(crypto.randomUUID());
    onOpenChange(false);
    refresh();
  }

  return (
    <Shell open={open} onOpenChange={onOpenChange} title="Registrar pagamento"
      desc={`Registre o dinheiro que você entregou de verdade a ${childName}. Disponível para pagar: ${formatBRL(balance.available)}.`}
      footer={<Button className="w-full" disabled={busy || !cents} onClick={submit}>Registrar</Button>}>
      <MoneyField id="pay" label="Valor pago (R$)" value={amount} onChange={setAmount} />
      <div className="space-y-1.5">
        <Label htmlFor="pd">Data do pagamento</Label>
        <Input id="pd" type="date" max={todaySP()} value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pn">Observação</Label>
        <Textarea id="pn" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: em dinheiro, no sábado" />
      </div>
    </Shell>
  );
}

export function ReserveDialog({ open, onOpenChange, childId, childName, balance }: {
  open: boolean; onOpenChange: (v: boolean) => void; childId: string; childName: string; balance: Balance;
}) {
  const refresh = useRefresh();
  const [add, setAdd] = useState(true);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [idem, setIdem] = useState(() => crypto.randomUUID());
  const cents = parseBRL(amount);

  async function submit() {
    if (!cents) { toast.error("Informe um valor válido"); return; }
    setBusy(true);
    const { error } = await supabase.rpc("move_reserve", { _child: childId, _amount_cents: cents, _add: add, _note: note, _idem: idem });
    setBusy(false);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success(add ? "Valor reservado no cofrinho" : "Valor retirado do cofrinho");
    setAmount(""); setNote(""); setIdem(crypto.randomUUID());
    onOpenChange(false);
    refresh();
  }

  return (
    <Shell open={open} onOpenChange={onOpenChange} title="Cofrinho"
      desc={`Separa parte do saldo devido de ${childName} como reserva. Não movimenta dinheiro real.`}
      footer={<Button className="w-full" disabled={busy || !cents} onClick={submit}>{add ? "Guardar" : "Retirar"}</Button>}>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Operação">
        <Button type="button" role="radio" aria-checked={add} variant={add ? "default" : "outline"} onClick={() => setAdd(true)}>Guardar</Button>
        <Button type="button" role="radio" aria-checked={!add} variant={!add ? "default" : "outline"} onClick={() => setAdd(false)}>Retirar</Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {add ? `Máximo: ${formatBRL(balance.available)} (disponível)` : `Máximo: ${formatBRL(balance.reserved)} (no cofrinho)`}
      </p>
      <MoneyField id="res" label="Valor (R$)" value={amount} onChange={setAmount} />
      <div className="space-y-1.5">
        <Label htmlFor="rn">Observação</Label>
        <Input id="rn" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </Shell>
  );
}

export function GoalDialog({ open, onOpenChange, childId, initial }: {
  open: boolean; onOpenChange: (v: boolean) => void; childId: string; initial: { title: string; target_cents: number } | null;
}) {
  const refresh = useRefresh();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [amount, setAmount] = useState(initial ? (initial.target_cents / 100).toFixed(2).replace(".", ",") : "");
  const [busy, setBusy] = useState(false);
  const cents = parseBRL(amount);

  async function submit() {
    if (!cents || !title.trim()) { toast.error("Preencha o nome e o valor"); return; }
    setBusy(true);
    const { error } = await supabase.rpc("set_goal", { _child: childId, _title: title, _target_cents: cents });
    setBusy(false);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success("Meta salva!");
    onOpenChange(false);
    refresh();
  }

  return (
    <Shell open={open} onOpenChange={onOpenChange} title="Meta de compra" desc="O que você quer juntar dinheiro para comprar?"
      footer={<Button className="w-full" disabled={busy} onClick={submit}>Salvar meta</Button>}>
      <div className="space-y-1.5">
        <Label htmlFor="gt">O que é?</Label>
        <Input id="gt" maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Fone de ouvido" />
      </div>
      <MoneyField id="ga" label="Quanto custa? (R$)" value={amount} onChange={setAmount} />
    </Shell>
  );
}

export function ReviewDialog({ open, onOpenChange, submissionId, title, approve }: {
  open: boolean; onOpenChange: (v: boolean) => void; submissionId: string; title: string; approve: boolean;
}) {
  const refresh = useRefresh();
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const { error } = await supabase.rpc("review_submission", { _id: submissionId, _approve: approve, _comment: comment });
    setBusy(false);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success(approve ? "Tarefa aprovada e valor creditado" : "Tarefa rejeitada");
    setComment("");
    onOpenChange(false);
    refresh();
  }

  return (
    <Shell open={open} onOpenChange={onOpenChange} title={approve ? "Aprovar tarefa" : "Rejeitar tarefa"} desc={title}
      footer={<Button className="w-full" variant={approve ? "default" : "destructive"} disabled={busy || (!approve && !comment.trim())} onClick={submit}>
        {approve ? "Aprovar" : "Rejeitar"}
      </Button>}>
      <div className="space-y-1.5">
        <Label htmlFor="rc">{approve ? "Comentário (opcional)" : "Motivo (obrigatório)"}</Label>
        <Textarea id="rc" maxLength={300} value={comment} onChange={(e) => setComment(e.target.value)}
          placeholder={approve ? "Mandou bem!" : "Ex.: faltou arrumar a escrivaninha"} />
      </div>
    </Shell>
  );
}
