const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatBRL(cents: number): string {
  return fmt.format(cents / 100);
}

/** Converte "20", "20,50", "1.234,56", "R$ 5" em centavos inteiros. Retorna null se inválido. */
export function parseBRL(input: string): number | null {
  let s = input.replace(/R\$/gi, "").replace(/\s/g, "");
  if (!s) return null;
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (!/^\d+\.\d{1,2}$/.test(s)) {
    s = s.replace(/\./g, "");
  }
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) return null;
  const cents = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0") || "0");
  return Number.isSafeInteger(cents) ? cents : null;
}

export type LedgerKind = "allowance" | "task_reward" | "payment" | "reserve_add" | "reserve_remove";

export interface Balance {
  earned: number;
  paid: number;
  reserved: number;
  owed: number;
  available: number;
}

/** Mesma regra do servidor: devido = acumulado − pago; disponível = devido − reservado. */
export function computeBalance(entries: { kind: LedgerKind; amount_cents: number }[]): Balance {
  let earned = 0, paid = 0, reserved = 0;
  for (const e of entries) {
    if (e.kind === "allowance" || e.kind === "task_reward") earned += e.amount_cents;
    else if (e.kind === "payment") paid += e.amount_cents;
    else if (e.kind === "reserve_add") reserved += e.amount_cents;
    else if (e.kind === "reserve_remove") reserved -= e.amount_cents;
  }
  const owed = earned - paid;
  return { earned, paid, reserved, owed, available: owed - reserved };
}

export const KIND_LABEL: Record<LedgerKind, string> = {
  allowance: "Mesada semanal",
  task_reward: "Tarefa aprovada",
  payment: "Pagamento recebido",
  reserve_add: "Guardado no cofrinho",
  reserve_remove: "Retirado do cofrinho",
};
