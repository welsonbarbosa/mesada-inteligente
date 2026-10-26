import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Balance, LedgerKind } from "./money";

export type Role = "parent" | "child";
export interface Member { id: string; user_id: string; role: Role; display_name: string; family_id: string }
export interface Family { id: string; name: string; allowance_cents: number; allowance_active: boolean }
export interface Task {
  id: string; title: string; description: string | null; reward_cents: number;
  frequency: "daily" | "weekly"; active: boolean;
}
export interface Submission {
  id: string; task_id: string; child_id: string; period_key: string; reward_cents: number;
  status: "pending" | "approved" | "rejected"; child_note: string | null; review_comment: string | null;
  created_at: string; reviewed_at: string | null;
}
export interface LedgerEntry {
  id: string; child_id: string; kind: LedgerKind; amount_cents: number; note: string | null;
  occurred_on: string; created_at: string; created_by: string; idempotency_key: string;
}
export interface Goal { child_id: string; title: string; target_cents: number }

export function errMsg(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: string }).message);
  return "Algo deu errado. Tente de novo.";
}

async function must<T>(p: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw error;
  return data;
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const me = await must(supabase.from("family_members").select("*").eq("user_id", u.user.id).maybeSingle());
      if (!me) return { userId: u.user.id, email: u.user.email ?? "", member: null, family: null, members: [] as Member[] };
      const [family, members] = await Promise.all([
        must(supabase.from("families").select("*").eq("id", me.family_id).single()),
        must(supabase.from("family_members").select("*").eq("family_id", me.family_id).order("created_at")),
      ]);
      return { userId: u.user.id, email: u.user.email ?? "", member: me as Member, family: family as Family, members: members as Member[] };
    },
  });
}

export function useTasks() {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: async () => (await must(supabase.from("tasks").select("*").order("created_at"))) as Task[],
  });
}

export function useSubmissions() {
  return useQuery({
    queryKey: ["submissions"],
    queryFn: async () =>
      (await must(supabase.from("task_submissions").select("*").order("created_at", { ascending: false }).limit(300))) as Submission[],
  });
}

export function useLedger(childId: string | undefined) {
  return useQuery({
    enabled: !!childId,
    queryKey: ["ledger", childId],
    queryFn: async () =>
      (await must(
        supabase.from("ledger_entries").select("*").eq("child_id", childId!).order("created_at", { ascending: false }).limit(500),
      )) as LedgerEntry[],
  });
}

export function useBalance(childId: string | undefined) {
  return useQuery({
    enabled: !!childId,
    queryKey: ["balance", childId],
    queryFn: async () => {
      const rows = await must(supabase.rpc("child_balance", { _child: childId! }));
      const r = (rows as Record<string, number>[])[0] ?? {};
      const n = (k: string) => Number(r[k] ?? 0);
      return { earned: n("earned"), paid: n("paid"), reserved: n("reserved"), owed: n("owed"), available: n("available") } as Balance;
    },
  });
}

export function useGoal(childId: string | undefined) {
  return useQuery({
    enabled: !!childId,
    queryKey: ["goal", childId],
    queryFn: async () => (await must(supabase.from("goals").select("*").eq("child_id", childId!).maybeSingle())) as Goal | null,
  });
}

export function useClosures(childId: string | undefined) {
  return useQuery({
    enabled: !!childId,
    queryKey: ["closures", childId],
    queryFn: async () =>
      (await must(supabase.from("week_closures").select("week_start").eq("child_id", childId!))) as { week_start: string }[],
  });
}

export function useInvites(enabled: boolean) {
  return useQuery({
    enabled,
    queryKey: ["invites"],
    queryFn: async () => await must(supabase.from("family_invites").select("*").maybeSingle()),
  });
}

export function useRefresh() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}

/** Criança selecionada (para pais com mais de um filho). */
const ChildCtx = createContext<{ childId: string | undefined; setChildId: (id: string) => void }>({
  childId: undefined,
  setChildId: () => {},
});

export function SelectedChildProvider({ children }: { children: ReactNode }) {
  const me = useMe();
  const [childId, setChildId] = useState<string | undefined>();
  useEffect(() => {
    const d = me.data;
    if (!d?.member) return;
    if (d.member.role === "child") setChildId(d.member.user_id);
    else if (!childId || !d.members.some((m) => m.user_id === childId)) {
      setChildId(d.members.find((m) => m.role === "child")?.user_id);
    }
  }, [me.data, childId]);
  return <ChildCtx.Provider value={{ childId, setChildId }}>{children}</ChildCtx.Provider>;
}

export function useSelectedChild() {
  return useContext(ChildCtx);
}
