import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/app/BottomNav";
import { Onboarding } from "@/components/app/Onboarding";
import { SelectedChildProvider, useMe } from "@/lib/family";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: Layout,
});

function Layout() {
  const me = useMe();
  if (me.isLoading) return <div className="p-10 text-center text-muted-foreground">Carregando…</div>;
  if (me.error) return <div className="p-10 text-center text-destructive">Não foi possível carregar seus dados.</div>;
  if (!me.data?.member) return <Onboarding />;
  return (
    <SelectedChildProvider>
      <div className="mx-auto min-h-screen max-w-md pb-28">
        <Outlet />
      </div>
      <BottomNav />
    </SelectedChildProvider>
  );
}
