import Link from "next/link";
import { PageHeader } from "@/components/command-center/page-header";

export default function SettingsPage() {
  return <div><PageHeader title="Settings" description="Command Center configuration and integration controls." />
    <section className="mt-8 grid gap-4 md:grid-cols-2">
      <Link href="/command-center/settings/integrations" className="rounded-2xl border border-white/8 bg-[#101214] p-6 hover:border-[#b8d4c8]/30"><p className="text-xs uppercase tracking-[.14em] text-[#b8d4c8]">Social Accounts V1</p><h2 className="mt-2 font-display text-xl text-white">Integrations</h2><p className="mt-3 text-sm leading-6 text-[#929795]">Inspect platform applications, authorizations, discovered accounts, capabilities, and connection health.</p></Link>
    </section>
  </div>;
}

