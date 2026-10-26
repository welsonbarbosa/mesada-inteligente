import { useMe, useSelectedChild } from "@/lib/family";
import { cn } from "@/lib/utils";

/** Para responsáveis: escolhe a criança. Some para quem tem só um filho. */
export function ChildPicker() {
  const me = useMe();
  const { childId, setChildId } = useSelectedChild();
  const kids = (me.data?.members ?? []).filter((m) => m.role === "child");
  if (kids.length < 2) return null;
  return (
    <div className="flex gap-2 overflow-x-auto px-5 pb-2" role="tablist" aria-label="Criança">
      {kids.map((k) => (
        <button key={k.user_id} role="tab" aria-selected={k.user_id === childId} onClick={() => setChildId(k.user_id)}
          className={cn("rounded-full border px-4 py-1.5 text-sm font-medium", k.user_id === childId ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>
          {k.display_name}
        </button>
      ))}
    </div>
  );
}

export function useNameOf() {
  const me = useMe();
  return (id: string) => me.data?.members.find((m) => m.user_id === id)?.display_name ?? "—";
}
