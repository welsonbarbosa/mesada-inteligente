/** Data de hoje (YYYY-MM-DD) no fuso de São Paulo. */
export function todaySP(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

/** Segunda-feira da semana de uma data YYYY-MM-DD. */
export function weekStart(iso: string): string {
  const d = new Date(iso + "T12:00:00Z");
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function formatDateBR(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** Período atual de uma tarefa (igual ao servidor). */
export function currentPeriod(freq: "daily" | "weekly"): string {
  const t = todaySP();
  return freq === "daily" ? t : weekStart(t);
}
