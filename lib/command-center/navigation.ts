export const commandCenterNavigation = [
  { href: "/command-center", label: "Overview", key: "overview" },
  { href: "/command-center/today", label: "Today", key: "today" },
  { href: "/command-center/sports-intelligence", label: "Sports Intelligence", key: "sports-intelligence" },
  { href: "/command-center/opportunities", label: "Opportunity Feed", key: "opportunities" },
  { href: "/command-center/ai-lab", label: "AI Lab", key: "ai-lab" },
  { href: "/command-center/queue", label: "Content Queue", key: "queue" },
  { href: "/command-center/brands", label: "Brands", key: "brands" },
  { href: "/command-center/markets", label: "Markets & Teams", key: "markets" },
  { href: "/command-center/campaigns", label: "Campaigns", key: "campaigns" },
  { href: "/command-center/relationships", label: "Relationships", key: "relationships" },
  { href: "/command-center/live-desk", label: "Opportunity Review", key: "live-desk" },
  { href: "/command-center/sports", label: "Sports Data", key: "sports" },
  { href: "/command-center/engagement", label: "Engagement", key: "engagement" },
  { href: "/command-center/analytics", label: "Analytics", key: "analytics" },
  { href: "/command-center/account-health", label: "Account Health", key: "account-health" },
  { href: "/command-center/settings", label: "Settings", key: "settings" },
] as const;

export const scaffoldSections = commandCenterNavigation.filter(
  (item) => !["overview", "today", "sports-intelligence", "opportunities", "ai-lab", "queue", "brands", "markets", "campaigns", "relationships", "live-desk", "sports"].includes(item.key),
);
