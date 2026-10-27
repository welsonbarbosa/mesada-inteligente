import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, PageHeader, Section } from "@/components/app/bits";
import { MoneyField } from "@/components/app/ParentActions";
import { errMsg, useMe, useRefresh, useSubmissions, useTasks, type Task } from "@/lib/family";
import { formatBRL, parseBRL } from "@/lib/money";
import { currentPeriod } from "@/lib/dates";

export const Route = createFileRoute("/_authenticated/tarefas")({
  head: () => ({ meta: [{ title: "Tarefas — Mesada Inteligente" }] }),
  component: TasksPage,
});

const FREQ = { daily: "Diária", weekly: "Semanal" } as const;

function TasksPage() {
  const me = useMe();
  return me.data?.member?.role === "parent" ? <ParentTasks /> : <ChildTasks />;
}

function ChildTasks() {
  const me = useMe().data!;
  const tasks = useTasks();
  const subs = useSubmissions();
  const refresh = useRefresh();
  const [sending, setSending] = useState<Task | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const active = (tasks.data ?? []).filter((t) => t.active);

  function statusOf(t: Task) {
    const p = currentPeriod(t.frequency);
    const mine = (subs.data ?? []).filter((s) => s.task_id === t.id && s.child_id === me.member!.user_id && s.period_key === p);
    if (mine.some((s) => s.status === "approved")) return "approved";
    if (mine.some((s) => s.status === "pending")) return "pending";
    if (mine.some((s) => s.status === "rejected")) return "rejected";
    return "open";
  }

  async function send() {
    if (!sending) return;
    setBusy(true);
    const { error } = await supabase.rpc("submit_task", { _task_id: sending.id, _note: note });
    setBusy(false);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success("Enviado para aprovação! 🚀");
    setSending(null); setNote("");
    refresh();
  }

  const group = (f: "daily" | "weekly") => {
    const list = active.filter((t) => t.frequency === f);
    return (
      <Section title={f === "daily" ? "Hoje" : "Esta semana"}>
        {list.length === 0 ? <Empty>Nenhuma tarefa {f === "daily" ? "diária" : "semanal"}.</Empty> : (
          <ul className="space-y-2">
            {list.map((t) => {
              const st = statusOf(t);
              return (
                <li key={t.id} className="flex items-center justify-between gap-3 rounded-2xl bg-card p-3 shadow-card">
                  <div className="min-w-0">
                    <p className="font-semibold">{t.title}</p>
                    {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                    <p className="text-sm font-bold text-success">+{formatBRL(t.reward_cents)}</p>
                  </div>
                  {st === "approved" && <Badge className="bg-success text-success-foreground">Aprovada</Badge>}
                  {st === "pending" && <Badge variant="secondary">Aguardando</Badge>}
                  {(st === "open" || st === "rejected") && (
                    <Button size="sm" onClick={() => setSending(t)}>{st === "rejected" ? "Reenviar" : "Concluí"}</Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Minhas tarefas" subtitle="Faça, marque como concluída e peça aprovação." />
      {group("daily")}
      {group("weekly")}
      <Dialog open={!!sending} onOpenChange={(v) => !v && setSending(null)}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader><DialogTitle>Concluí: {sending?.title}</DialogTitle></DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="cn">Quer deixar um recado? (opcional)</Label>
            <Textarea id="cn" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <DialogFooter><Button className="w-full" disabled={busy} onClick={send}>Pedir aprovação</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ParentTasks() {
  const tasks = useTasks();
  const [editing, setEditing] = useState<Task | "new" | null>(null);
  const list = tasks.data ?? [];
  return (
    <div className="space-y-5">
      <PageHeader title="Tarefas extras" subtitle="Valores pagos além da mesada base."
        right={<Button size="sm" onClick={() => setEditing("new")}><Plus className="size-4" />Nova</Button>} />
      <Section title={`Todas (${list.length})`}>
        {list.length === 0 ? <Empty>Crie a primeira tarefa extra.</Empty> : (
          <ul className="space-y-2">
            {list.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 rounded-2xl bg-card p-3 shadow-card">
                <div className="min-w-0">
                  <p className="font-semibold">{t.title} {!t.active && <Badge variant="outline">Pausada</Badge>}</p>
                  <p className="text-xs text-muted-foreground">{FREQ[t.frequency]} · {formatBRL(t.reward_cents)}</p>
                </div>
                <Button size="icon" variant="ghost" aria-label={`Editar ${t.title}`} onClick={() => setEditing(t)}><Pencil className="size-4" /></Button>
              </li>
            ))}
          </ul>
        )}
      </Section>
      {editing && <TaskDialog task={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function TaskDialog({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const refresh = useRefresh();
  const [title, setTitle] = useState(task?.title ?? "");
  const [desc, setDesc] = useState(task?.description ?? "");
  const [amount, setAmount] = useState(task ? (task.reward_cents / 100).toFixed(2).replace(".", ",") : "");
  const [freq, setFreq] = useState<"daily" | "weekly">(task?.frequency ?? "daily");
  const [active, setActive] = useState(task?.active ?? true);
  const [busy, setBusy] = useState(false);

  async function save() {
    const cents = parseBRL(amount);
    if (cents === null) { toast.error("Valor inválido"); return; }
    setBusy(true);
    const { error } = await supabase.rpc("upsert_task", {
      _id: task?.id ?? (null as unknown as string), _title: title, _description: desc, _reward_cents: cents, _frequency: freq, _active: active,
    });
    setBusy(false);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success("Tarefa salva");
    refresh();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader><DialogTitle>{task ? "Editar tarefa" : "Nova tarefa"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label htmlFor="tt">Nome</Label><Input id="tt" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="td">Descrição</Label><Textarea id="td" maxLength={300} value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          <MoneyField id="tv" label="Valor (R$)" value={amount} onChange={setAmount} />
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Frequência">
            {(["daily", "weekly"] as const).map((f) => (
              <Button key={f} type="button" role="radio" aria-checked={freq === f} variant={freq === f ? "default" : "outline"} onClick={() => setFreq(f)}>{FREQ[f]}</Button>
            ))}
          </div>
          <div className="flex items-center justify-between rounded-xl border p-3">
            <Label htmlFor="ta">Ativa (desligue para pausar)</Label>
            <Switch id="ta" checked={active} onCheckedChange={setActive} />
          </div>
          <p className="text-xs text-muted-foreground">Mudar o valor não altera envios já feitos.</p>
        </div>
        <DialogFooter><Button className="w-full" disabled={busy || !title.trim()} onClick={save}>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
