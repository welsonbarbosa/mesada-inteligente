import { Link } from "@tanstack/react-router";
import { Home, ListChecks, ReceiptText, Settings } from "lucide-react";

const items = [
  { to: "/inicio", label: "Início", Icon: Home },
  { to: "/tarefas", label: "Tarefas", Icon: ListChecks },
  { to: "/extrato", label: "Extrato", Icon: ReceiptText },
  { to: "/ajustes", label: "Ajustes", Icon: Settings },
] as const;

export function BottomNav() {
  return (
    <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur safe-bottom">
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {items.map(({ to, label, Icon }) => (
          <li key={to}>
            <Link
              to={to}
              className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground"
              activeProps={{ className: "text-primary", "aria-current": "page" }}
            >
              <Icon className="size-6" aria-hidden />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
