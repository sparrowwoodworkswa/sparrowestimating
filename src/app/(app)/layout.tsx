import { Shell } from "@/components/Shell";
import { getSettings } from "@/lib/data";

export const dynamic = "force-dynamic";
// Server actions here start AI work in the background (learning, proposal rewrites); give them room to finish.
export const maxDuration = 300;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <Shell companyName={s.company.name} logoUrl={s.company.logoUrl}>
      {children}
    </Shell>
  );
}
