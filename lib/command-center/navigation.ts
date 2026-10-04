export const commandCenterNavigationGroups = [
  { label: "Operate", items: [
    { href: "/command-center", label: "Home", key: "overview" },
    { href: "/command-center/today", label: "Today", key: "today" },
    { href: "/command-center/relationships", label: "Relationships", key: "relationships" },
    { href: "/command-center/live-desk", label: "Opportunity Review", key: "live-desk" },
  ] },
  { label: "Plan", items: [
    { href: "/command-center/growth", label: "Growth", key: "growth" },
    { href: "/command-center/campaigns", label: "Campaigns", key: "campaigns" },
    { href: "/command-center/brands", label: "Brands", key: "brands" },
    { href: "/command-center/markets", label: "Markets & Teams", key: "markets" },
  ] },
  { label: "Intelligence", items: [
    { href: "/command-center/sports-intelligence", label: "Sports Intelligence", key: "sports-intelligence" },
    { href: "/command-center/opportunities", label: "Opportunity Feed", key: "opportunities" },
    { href: "/command-center/ai-lab", label: "AI Lab", key: "ai-lab" },
    { href: "/command-center/sports", label: "Sports Data", key: "sports" },
    { href: "/command-center/analytics", label: "Analytics", key: "analytics" },
  ] },
  { label: "Distribution", items: [
    { href: "/command-center/queue", label: "Content Queue", key: "queue" },
    { href: "/command-center/engagement", label: "Engagement", key: "engagement" },
    { href: "/command-center/account-health", label: "Account Health", key: "account-health" },
  ] },
  { label: "Settings", items: [
    { href: "/command-center/settings", label: "Settings", key: "settings" },
  ] },
] as const;

export type CommandCenterNavigationItem = (typeof commandCenterNavigationGroups)[number]["items"][number];

export const commandCenterNavigation: CommandCenterNavigationItem[] = commandCenterNavigationGroups.flatMap((group): readonly CommandCenterNavigationItem[] => group.items);

export const scaffoldSections = commandCenterNavigation.filter(
  (item) => !["overview", "today", "sports-intelligence", "opportunities", "ai-lab", "queue", "brands", "markets", "campaigns", "relationships", "live-desk", "sports", "growth"].includes(item.key),
);
