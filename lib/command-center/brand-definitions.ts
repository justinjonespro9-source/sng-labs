export type BrandDefinition = {
  key: string;
  name: string;
  kind: "CORPORATE" | "PRODUCT";
  shortName: string;
  accent: string;
  description: string;
  audience: string;
  voice: string;
  objectives: string[];
  preferredContent: string[];
  prohibitedContent: string[];
  callToActionRules: string;
  visualDirection: string;
  defaultCadenceNotes: string;
};

export const brandDefinitions: BrandDefinition[] = [
  {
    key: "sng-labs",
    name: "SNG LABS",
    shortName: "SNG",
    kind: "CORPORATE",
    accent: "#b8d4c8",
    description: "Founder and studio-level perspective across the SNG portfolio.",
    audience: "Partners, investors, operators, media, and the Minnesota innovation community.",
    voice: "Clear, credible, inventive, and founder-led. Explain why the work matters.",
    objectives: ["Build studio credibility", "Create partnership interest", "Show portfolio momentum"],
    preferredContent: ["Founder insight", "Product milestones", "Category analysis", "Partnership stories"],
    prohibitedContent: ["Duplicate product posts", "Unverified traction claims", "Empty corporate celebration"],
    callToActionRules: "Use partnership or conversation CTAs only when the story earns them.",
    visualDirection: "Dark premium studio system with restrained mint accents.",
    defaultCadenceNotes: "Lower volume than product accounts; publish only material studio-level stories.",
  },
  {
    key: "rank-eye-q",
    name: "RankEyeQ",
    shortName: "REQ",
    kind: "PRODUCT",
    accent: "#66e0d0",
    description: "Weekly fantasy ranking competition and proof-of-insight platform.",
    audience: "Fantasy players, analysts, creators, publishers, and competitive football fans.",
    voice: "Competitive, smart, evidence-led, and comfortable challenging consensus.",
    objectives: ["Drive weekly ranking participation", "Celebrate proven skill", "Create rankings debate"],
    preferredContent: ["Consensus movement", "Human versus expert versus AI", "Weekly receipts", "Perfect boards"],
    prohibitedContent: ["Betting framing", "Projection presented as fact", "Mocking individual participants"],
    callToActionRules: "Invite the audience to rank, compare, or prove their eye for talent.",
    visualDirection: "Editorial sports-data presentation with scorecards and rank movement.",
    defaultCadenceNotes: "Concentrate around rankings open, reveal, live results, and final receipts.",
  },
  {
    key: "handicap-hero",
    name: "Handicap Hero",
    shortName: "HH",
    kind: "PRODUCT",
    accent: "#f5bf55",
    description: "Free confidence-ranked sports prediction cards with verified records.",
    audience: "Sports predictors, betting-adjacent fans, handicappers, and competitive pickers age 18+.",
    voice: "Confident, transparent, playful, and accountable to the record.",
    objectives: ["Fill weekly contests", "Highlight deep cards", "Build verified handicapper identity"],
    preferredContent: ["Surviving cards", "Beat the Bots", "Streaks", "Results and receipts"],
    prohibitedContent: ["Guaranteed-win language", "Chasing losses", "Direct wagering encouragement"],
    callToActionRules: "Keep CTAs free-to-play and focused on proving prediction skill.",
    visualDirection: "High-energy card and leaderboard graphics without sportsbook mimicry.",
    defaultCadenceNotes: "Match contest openings, lock reminders, live survival, and grading.",
  },
  {
    key: "fantasytrack",
    name: "FantasyTrack",
    shortName: "FT",
    kind: "PRODUCT",
    accent: "#72a8ff",
    description: "Live position races powered by dynamic pool-based pricing.",
    audience: "Fantasy players, prediction-market operators, sportsbooks, and sports-data partners.",
    voice: "Market-smart, kinetic, analytical, and focused on the race across the field.",
    objectives: ["Explain the new format", "Show market movement", "Attract strategic partners"],
    preferredContent: ["Live race changes", "Field pricing", "Long-shot leaders", "Market mechanics"],
    prohibitedContent: ["Misleading odds claims", "Implied guaranteed returns", "Unsupported liquidity claims"],
    callToActionRules: "Separate fan education from partner-facing market commentary.",
    visualDirection: "Live race boards, movement trails, and clean market-data visuals.",
    defaultCadenceNotes: "Event-driven; avoid posting every minor price change.",
  },
  {
    key: "stadium-slop",
    name: "Stadium Slop",
    shortName: "SS",
    kind: "PRODUCT",
    accent: "#ff8b5c",
    description: "Verified, fan-powered food and drink reviews at live events.",
    audience: "Game-going fans, food explorers, venues, concessionaires, and local media.",
    voice: "Hungry, funny, local, candid, and helpful without being cruel.",
    objectives: ["Drive on-site reviews", "Surface useful discoveries", "Build venue participation"],
    preferredContent: ["Hot Tonight", "Worth the Walk", "Rating battles", "New venue menus"],
    prohibitedContent: ["Pile-ons", "Unverified food-safety claims", "Low-score humiliation"],
    callToActionRules: "Ask fans at the event to rate what they actually tried.",
    visualDirection: "Food-forward photography, score cards, napkin ratings, and venue context.",
    defaultCadenceNotes: "Post around active event windows and meaningful leaderboard movement.",
  },
  {
    key: "team-m8tes",
    name: "Team-M8tes",
    shortName: "TM",
    kind: "PRODUCT",
    accent: "#db7dff",
    description: "Sports-fandom social matching built around teams, games, and shared culture.",
    audience: "Fans seeking sports-centered friendship, community, and social connection.",
       voice: "Welcoming, social, spirited, inclusive, and safely community-first.",
    objectives: ["Create fandom conversation", "Encourage respectful connection", "Support launch growth"],
    preferredContent: ["Game-day prompts", "Rivalry conversation", "Fan compatibility", "Community stories"],
    prohibitedContent: ["Dating-first positioning", "Harassment bait", "Unsafe meet-up framing"],
    callToActionRules: "Frame participation around fandom and safe social connection.",
    visualDirection: "Warm fan-culture scenes, matchup motifs, and human connection.",
    defaultCadenceNotes: "Use the sports calendar selectively; avoid generic game spam.",
  },
  {
    key: "eyez-on-the-prize",
    name: "Eyez on the Prize",
    shortName: "EYEZ",
    kind: "PRODUCT",
    accent: "#d4b06a",
    description: "Verified attention converted into transparent promotional entries.",
    audience: "Brands, creators, teams, agencies, and consumers interested in transparent rewards.",
    voice: "Premium, transparent, optimistic, and precise about how participation works.",
    objectives: ["Explain verified attention", "Show campaign activity", "Build sponsor interest"],
    preferredContent: ["Campaign launches", "Entry milestones", "Drawing proof", "Winner stories"],
    prohibitedContent: ["Pay-to-enter implications", "Vague winner claims", "Sweepstakes shortcuts"],
    callToActionRules: "Clearly state free entry mechanics and campaign eligibility where relevant.",
    visualDirection: "Deep navy, teal, ivory ticket forms, and gold reserved for wins.",
    defaultCadenceNotes: "Campaign-led rather than always-on; transparency posts remain evergreen.",
  },
];
