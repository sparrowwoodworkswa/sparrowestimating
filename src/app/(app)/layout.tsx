import { Shell } from "@/components/Shell";
import { getSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <Shell companyName={s.company.name} logoUrl={s.company.logoUrl}>
      {children}
    </Shell>
  );
}
