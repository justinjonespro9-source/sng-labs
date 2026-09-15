export type ContentMode = {
  name: string;
  goal: string;
  example?: string;
};

export type BrandBrainFormValue = {
  purpose: string;
  corePromise: string;
  coreProposition: string;
  audience: string;
  secondaryAudiences: string[];
  distributionAudiences: string[];
  jobsToBeDone: string[];
  contentPillars: string[];
  voice: string;
  voiceTraits: string[];
  communicationPatterns: string[];
  contentModes: ContentMode[];
  prohibitedContent: string[];
  factualRequirements: string[];
  affiliationRestrictions: string[];
  aiOperatingInstructions: string[];
};

export function parseLines(value: FormDataEntryValue | null) {
  return String(value ?? "").split("\n").map((item) => item.trim()).filter(Boolean);
}

export function parseContentModes(value: FormDataEntryValue | null): ContentMode[] {
  return parseLines(value).map((line) => {
    const [name = "", goal = "", example = ""] = line.split("|").map((part) => part.trim());
    return { name, goal, ...(example ? { example } : {}) };
  }).filter((mode) => mode.name && mode.goal);
}

export function contentModesToText(value: unknown) {
  return contentModesFromValue(value).map((mode) => `${mode.name} | ${mode.goal}${mode.example ? ` | ${mode.example}` : ""}`).join("\n");
}

export function contentModesFromValue(value: unknown): ContentMode[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || !("name" in item) || !("goal" in item)) return [];
    const name = String(item.name ?? "").trim();
    const goal = String(item.goal ?? "").trim();
    const example = "example" in item ? String(item.example ?? "").trim() : "";
    return name && goal ? [{ name, goal, ...(example ? { example } : {}) }] : [];
  });
}

export function hasConfiguredBrandBrain(brand: { brandBrainVersion: number | null; brandBrainConfiguredAt: Date | null }) {
  return brand.brandBrainVersion !== null && brand.brandBrainConfiguredAt !== null;
}

export function shouldInitializeBrandBrain(brandBrainVersion: number | null) {
  return brandBrainVersion === null;
}

export const stadiumSlopBrandBrain: BrandBrainFormValue = {
  purpose: "Help fans at live sporting events figure out what is actually worth eating and drinking by turning verified fan experiences into venue-specific rankings.",
  corePromise: "Fans in the building decide what's good.",
  coreProposition: "Stadium Slop is fan-powered stadium food discovery—not a generic restaurant-review product. Participation and rankings are built around real fans experiencing food and drink at live events, with verified or on-site participation rules where applicable.",
  audience: "People attending live sporting events who are deciding what to eat or drink, what is actually good, what is worth the money, and whether an item is worth walking across the venue for.",
  secondaryAudiences: ["Team fans", "Stadium-food enthusiasts", "Sports creators", "Food creators"],
  distributionAudiences: ["Local sports media", "National sports media", "Team-focused creators", "Food creators", "Fan communities", "Vendors", "Venue and concession ecosystem", "Potential partners"],
  jobsToBeDone: ["What should I get?", "What's actually good?", "Is that item worth the price?", "Is it worth walking to another section for?", "What are other fans eating?", "Did I find something other fans should know about?", "What's the best food at this stadium?", "Which items are rising?", "What do fans actually recommend?", "Which stadiums, vendors, or items stand out?"],
  contentPillars: ["Fan-powered", "Verified experience", "Discovery", "Competition", "Game-day culture"],
  voice: "Playful, opinionated, curious, fan-first, slightly irreverent, concise, and conversational. Never corporate or generic startup marketing.",
  voiceTraits: ["Playful", "Opinionated", "Curious", "Fan-first", "Slightly irreverent", "Concise", "Conversational", "Never corporate"],
  communicationPatterns: ["Ask what is actually worth eating", "Invite fans to settle a question", "Question whether an item is worth its price", "Ask whether an item is worth the walk", "Create food-versus-food competition", "Invite discovery of the one thing fans need to try", "Reinforce that the fans decide"],
  contentModes: [
    { name: "Acquire", goal: "Get an eligible attendee to participate", example: "At the game? Rate what you ate." },
    { name: "Engage", goal: "Generate relevant fan discussion", example: "What's the one U.S. Bank Stadium food everyone needs to try?" },
    { name: "Report", goal: "Use real supplied product data to report results or trends", example: "Fans have a new #1 at U.S. Bank Stadium." },
    { name: "Celebrate", goal: "Highlight an item, vendor, or result supported by actual data", example: "The fans have spoken..." },
    { name: "Challenge", goal: "Create a relevant comparison or competition", example: "Burger vs brat. Which one wins?" },
    { name: "Explain", goal: "Explain how Stadium Slop works", example: "Fans at the event can submit verified ratings during the review window." },
    { name: "Outreach", goal: "Address creators, media, vendors, partners, or communities with audience-specific messaging" },
  ],
  prohibitedContent: ["Fabricated ratings, reviews, rankings, users, participation, or event activity", "Fabricated partnerships or venue/team relationships", "Unsupported best, #1, or highest-rated claims", "Invented urgency", "Insults or personal attacks toward vendors or workers", "Mean-spirited treatment of poor ratings", "Generic startup or product language", "Claims that an event is live without trusted Activation or Event context", "Default download-our-app language"],
  factualRequirements: ["Use ratings, rankings, reviews, participation, and trends only when trusted supplied data supports them", "Never invent product activity to make content interesting", "Use the actual supported experience and CTA from context", "When activity is zero or unavailable, invite participation rather than implying existing fan behavior"],
  affiliationRestrictions: ["Never imply affiliation with a team, league, venue, vendor, or event unless trusted context explicitly establishes it"],
  aiOperatingInstructions: ["Start with the fan or event story, not the product", "Determine why the audience should care right now", "Prefer questions, discovery, competition, rankings, and real fan opinion over promotional language", "Localize naturally using trusted Campaign and Activation context", "Use product data only when supplied by trusted context", "Never fabricate ratings, rankings, reviews, users, events, participation, or partnerships", "Distinguish attendee CTAs from creator, media, vendor, and partner outreach CTAs", "Keep Stadium Slop playful, opinionated, concise, and fan-first", "Never imply team, league, venue, vendor, or event affiliation without established context", "Create genuinely different editorial angles when another SNG brand addresses the same event", "For creator outreach, prefer participate, experience, collaborate, then amplify", "For media outreach, lead with the story, data, or fan question rather than a request to promote the product"],
};
