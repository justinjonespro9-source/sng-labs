export const commandCenterNavigation = [
  { href: "/command-center", label: "Overview", key: "overview" },
  { href: "/command-center/opportunities", label: "Opportunity Feed", key: "opportunities" },
  { href: "/command-center/queue", label: "Content Queue", key: "queue" },
  { href: "/command-center/calendar", label: "Calendar", key: "calendar" },
  { href: "/command-center/brands", label: "Brands", key: "brands" },
  { href: "/command-center/markets", label: "Markets & Teams", key: "markets" },
  { href: "/command-center/campaigns", label: "Campaigns", key: "campaigns" },
  { href: "/command-center/relationships", label: "Relationships", key: "relationships" },
  { href: "/command-center/live-desk", label: "Live Desk", key: "live-desk" },
  { href: "/command-center/engagement", label: "Engagement", key: "engagement" },
  { href: "/command-center/analytics", label: "Analytics", key: "analytics" },
  { href: "/command-center/account-health", label: "Account Health", key: "account-health" },
  { href: "/command-center/settings", label: "Settings", key: "settings" },
] as const;

export const scaffoldSections = commandCenterNavigation.filter(
  (item) => !["overview", "opportunities", "queue", "brands", "markets", "campaigns", "relationships"].includes(item.key),
);
