import Link from "next/link";
import { signOut } from "@/auth";
import { commandCenterNavigation } from "@/lib/command-center/navigation";

type SidebarProps = {
  user: { name: string | null; email: string | null; role: string };
};

export function CommandCenterSidebar({ user }: SidebarProps) {
  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <aside className="border-b border-white/8 bg-[#0b0d0e] lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 lg:border-b-0 lg:border-r">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-6 py-6 lg:block lg:px-7 lg:py-8">
          <Link href="/command-center" className="font-display text-lg font-semibold tracking-tight text-white">
            SNG <span className="text-[#b8d4c8]">Command Center</span>
          </Link>
          <span className="rounded-full border border-[#b8d4c8]/20 bg-[#b8d4c8]/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#b8d4c8]">
            Private
          </span>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-4 pb-4 lg:flex-1 lg:flex-col lg:overflow-visible lg:px-4 lg:pb-6" aria-label="Command Center">
          {commandCenterNavigation.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="whitespace-nowrap rounded-lg px-3 py-2.5 text-sm text-[#a5a8a6] transition hover:bg-white/[0.05] hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden border-t border-white/8 p-5 lg:block">
          <p className="truncate text-sm font-medium text-white">{user.name ?? "SNG operator"}</p>
          <p className="mt-1 truncate text-xs text-[#777b78]">{user.email}</p>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#b8d4c8]">{user.role}</span>
            <form action={handleSignOut}>
              <button className="text-xs text-[#8e9290] transition hover:text-white" type="submit">Sign out</button>
            </form>
          </div>
        </div>
      </div>
    </aside>
  );
}
