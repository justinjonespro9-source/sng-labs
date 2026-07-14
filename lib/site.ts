export const PRODUCTION_SITE_URL = "https://www.snglabs.com";

export const PUBLIC_CONTACT_EMAIL = "info@snglabs.com";

export const PENDING_PRODUCT_URLS = {
  handicapHero: "https://www.handicap-hero.com",
  stadiumSlop: "https://www.stadiumslop.com",
  teamM8tes: "https://www.team-m8tes.com",
};

/* -----------------------------------------------------------------------------
 * Company & contact
 * ---------------------------------------------------------------------------*/

export const company = {
  legalName: "SNG Labs LLC",
  displayName: "SNG Labs",
  location: "Minnesota, USA",
  email: PUBLIC_CONTACT_EMAIL,
  tagline: "Building the next generation of fan engagement.",
} as const;

export const contactMailto = `mailto:${PUBLIC_CONTACT_EMAIL}`;

export const siteAssets = {
  logo: "/sng-labs-logo.png",
  /** Full-bleed hero background — scene only, no baked-in UI. */
  innovationLabHero: "/innovation-lab-hero.jpg",
} as const;

/* -----------------------------------------------------------------------------
 * Navigation
 * ---------------------------------------------------------------------------*/

export const navLinks = [
  { href: "#products", label: "Products" },
  { href: "#innovation", label: "Innovation" },
  { href: "#about", label: "About" },
  { href: "#contact", label: "Contact" },
] as const;

export const partnerHref = "#partnership";
export const contactSectionHref = "#contact";

/* -----------------------------------------------------------------------------
 * Products
 * ---------------------------------------------------------------------------*/

export type ProductStatus = "Live" | "Patent Pending" | "In Development";

export type Product = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  status: ProductStatus;
  websiteUrl: string | null;
  ctaLabel: string;
  external: boolean;
  note?: string;
  accent: string;
};

export const products: Product[] = [
  {
    id: "handicap-hero",
    name: "Handicap Hero",
    tagline: "The Free Verified Handicapping Market",
    description:
      "Confidence-ranked sports predictions, public performance records, global leaderboards, and transparent proof of skill.",
    status: "Live",
    websiteUrl: PENDING_PRODUCT_URLS.handicapHero,
    ctaLabel: PENDING_PRODUCT_URLS.handicapHero
      ? "Visit Platform"
      : "Partnership Inquiries",
    external: Boolean(PENDING_PRODUCT_URLS.handicapHero),
    note: PENDING_PRODUCT_URLS.handicapHero
      ? undefined
      : "Public website URL pending — CTA routes to contact.",
    accent: "#b8d4c8",
  },
  {
    id: "stadium-slop",
    name: "Stadium Slop",
    tagline: "Discover the best food in sports.",
    description:
      "Real-time fan-powered concession reviews submitted during verified live-event windows.",
    status: "Live",
    websiteUrl: PENDING_PRODUCT_URLS.stadiumSlop,
    ctaLabel: PENDING_PRODUCT_URLS.stadiumSlop
      ? "Visit Platform"
      : "Partnership Inquiries",
    external: Boolean(PENDING_PRODUCT_URLS.stadiumSlop),
    note: PENDING_PRODUCT_URLS.stadiumSlop
      ? undefined
      : "Public website URL pending — CTA routes to contact.",
    accent: "#d4c4a8",
  },
  {
    id: "fantasytrack",
    name: "FantasyTrack",
    tagline: "The next betting format is not another line.",
    description:
      "Live performance markets where athletes compete against each other through dynamic, pool-based pricing.",
    status: "Patent Pending",
    websiteUrl: null,
    ctaLabel: "Partnership Inquiries",
    external: false,
    note: "No public website yet.",
    accent: "#a8bdd4",
  },
  {
    id: "eyes-on-the-prize",
    name: "Eyes on the Prize",
    tagline: "Verified attention. Transparent rewards.",
    description:
      "A platform where completed branded-video views become traceable entries in transparent promotional drawings.",
    status: "Patent Pending",
    websiteUrl: null,
    ctaLabel: "Partnership Inquiries",
    external: false,
    note: "No public website yet.",
    accent: "#c4d4a8",
  },
  {
    id: "team-m8tes",
    name: "Team-M8tes",
    tagline: "Sports-first social connection.",
    description:
      "A social matching platform designed to connect people through shared teams, rivalries, and sports culture.",
    status: "In Development",
    websiteUrl: PENDING_PRODUCT_URLS.teamM8tes,
    ctaLabel: PENDING_PRODUCT_URLS.teamM8tes
      ? "Visit Platform"
      : "In Development",
    external: Boolean(PENDING_PRODUCT_URLS.teamM8tes),
    note: PENDING_PRODUCT_URLS.teamM8tes
      ? undefined
      : "No public website yet — CTA routes to contact.",
    accent: "#d4b8a8",
  },
];

/** Resolves the actionable href for a product CTA. */
export function getProductHref(product: Product): string {
  return product.websiteUrl ?? contactSectionHref;
}

export const pillars = [
  {
    title: "Original Concepts",
    description:
      "Category-defining ideas built from first principles, not borrowed playbooks.",
  },
  {
    title: "Scalable Platforms",
    description:
      "Product systems designed to expand across teams, markets, and formats.",
  },
  {
    title: "Defensible Innovation",
    description:
      "Proprietary mechanics and patent-pending systems that compound over time.",
  },
] as const;

export const innovationCategories = [
  {
    title: "Verified Skill",
    description: "Public performance records that replace claims with proof.",
  },
  {
    title: "Verified Attention",
    description:
      "Reward systems tied to completed, measurable engagement.",
  },
  {
    title: "Verified Attendance",
    description: "Live-event participation grounded in time and place.",
  },
  {
    title: "Fan Identity",
    description:
      "Portable profiles built around preferences, participation, performance, and loyalty.",
  },
] as const;

export const ipPoints = [
  "Multiple patent-pending technologies",
  "Original consumer mechanics",
  "Cross-market platform potential",
  "Built for strategic partnerships and licensing",
] as const;

/* -----------------------------------------------------------------------------
 * SEO copy
 * ---------------------------------------------------------------------------*/

export const siteTitle =
  "SNG Labs | Building What Fan Engagement Becomes Next";

export const siteDescription =
  "SNG Labs is a Minnesota innovation studio building original platforms across sports technology, fan engagement, advertising, prediction markets, social connection, and verified participation.";

export const ogHeadline = "Building what fan engagement becomes next.";
