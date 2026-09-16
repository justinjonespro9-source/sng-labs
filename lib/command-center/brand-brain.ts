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

export const teamM8tesBrandBrain: BrandBrainFormValue = {
  purpose: "Help single sports fans meet people who share their fandom and give them a natural starting point for dating, connection, and real-world sports experiences.",
  corePromise: "The game is better with your person.",
  coreProposition: "Team-M8tes is dating-forward sports-fandom social matching. Dating is central, sports fandom is the differentiator, and real-world connection is the desired outcome. It helps someone meet a person they might actually click with by starting with teams, sports, rivalries, and game-day life rather than only appearance, generic prompts, broad interests, or proximity.",
  audience: "Single sports fans—especially people who want to date someone who enjoys sports, share fandom with a partner, escape generic dating-app interactions, find an easier conversation starter, attend or watch games together, and treat sports compatibility as meaningful.",
  secondaryAudiences: ["Sports fans looking for game-day companionship", "Fans new to a city", "Fans attending games alone", "Fans traveling to away games", "People looking for watch partners", "Sports-focused social communities"],
  distributionAudiences: ["Team-focused creators", "Sports creators", "Local sports personalities", "Sports media", "Dating and relationship creators", "Fan communities", "Supporter groups", "Sports podcasts", "Sports bars and watch-party communities", "Lifestyle creators", "Sports organizations and potential partners"],
  jobsToBeDone: ["Help me meet someone I might actually click with by starting with something I already care about", "I'm single and tired of generic dating apps", "I'd love to meet someone who actually enjoys sports", "I want someone to go to the game with", "I want a date who would genuinely enjoy going to a game", "I don't want to watch the game alone", "I'm new to town and want to meet other fans", "I'm traveling to an away game and would like to connect with someone", "I'd rather meet someone through shared fandom than another generic profile", "Could a shared team give us an easier first conversation?", "Where is my person?", "Make dating and meeting someone feel less random by beginning with shared sports identity"],
  contentPillars: ["Shared Fandom", "Singles & Chemistry", "Game-Day Connection", "Compatibility Beyond a Photo", "Real-World Possibility"],
  voice: "Dating-forward and connection-broad: flirty, witty, playful, sports-native, confident, warm, conversational, and occasionally provocative. Comfortable with tasteful jokes about rivalries, compatibility, game-day priorities, first dates, and team loyalty. Never creepy, sleazy, desperate, objectifying, crude, or corporate.",
  voiceTraits: ["Flirty", "Witty", "Playful", "Sports-native", "Confident", "Warm", "Conversational", "Occasionally provocative"],
  communicationPatterns: ["Use shared fandom as an immediate point of compatibility", "Ask whether rivalry or team loyalty is a dating dealbreaker", "Turn games, tailgates, and watch parties into natural date ideas", "Use sports roster, lineup, and fantasy language for tasteful dating humor", "Move from matching toward making real plans", "Keep singles, dating, chemistry, attraction, matches, compatibility, and finding your person visible when appropriate", "Use human sports-native language instead of generic meaningful-connections language"],
  contentModes: [
    { name: "Acquire", goal: "Reach single sports fans and get them interested in Team-M8tes", example: "Single Vikings fans: your Sunday lineup might be missing someone." },
    { name: "Engage", goal: "Create discussion around sports, dating, and compatibility", example: "Could you date a Packers fan?" },
    { name: "Game-Day", goal: "Turn an upcoming or live sports event into a natural connection opportunity", example: "Going to the game but don't have anyone to go with?" },
    { name: "Match / Connect", goal: "Encourage people to discover potential matches through shared fandom", example: "Find someone who cares about Sunday as much as you do." },
    { name: "Date Idea", goal: "Turn games, watch parties, sports bars, tailgates, opening day, and playoffs into natural date ideas" },
    { name: "Culture / Humor", goal: "Build an entertaining identity at the intersection of sports fandom and dating" },
    { name: "Explain", goal: "Explain why shared fandom creates a different starting point for meeting someone" },
    { name: "Outreach", goal: "Address creators, media, communities, and potential partners with audience-specific messaging" },
  ],
  prohibitedContent: ["Fabricated users, matches, dates, relationships, success stories, testimonials, or activity", "Fabricated events, partnerships, or team/league/venue relationships", "Unsupported participation numbers such as thousands of singles", "Invented urgency or fake scarcity", "Guaranteed matches, dates, relationships, or romantic outcomes", "Objectification or degrading gender stereotypes", "Shaming people for being single or mocking loneliness", "Manipulative insecurity", "Harassment or unwanted-contact encouragement", "Hookup-service positioning", "Sleazy, sexually aggressive, predatory, crude, or lonely-hearts clickbait language", "Appearance-only positioning", "Generic corporate dating-app language"],
  factualRequirements: ["Never invent product or event activity to make marketing more compelling", "Use user, match, date, testimonial, participation, and event claims only when trusted supplied data supports them", "When activity is unknown or zero, use an invitation rather than implying people are already matching", "Treat attraction as valid while emphasizing compatibility beyond appearance"],
  affiliationRestrictions: ["Never imply affiliation with a team, league, venue, organization, or event unless trusted context explicitly establishes it"],
  aiOperatingInstructions: ["Remember that the primary audience is single sports fans", "Preserve the dating-forward identity while using broader social and game-day connection where context makes it useful", "Do not sanitize dating language into vague community or networking language", "Start with the human relationship or dating story rather than product features", "Use shared sports fandom as the differentiator", "Recognize games as natural opportunities for dates and connection", "Use sports-native humor and tasteful flirtation when appropriate", "Distinguish consumer messaging from creator, media, community, and partner outreach", "Localize naturally using trusted Market, Team, Event, and Activation context", "Never fabricate users, matches, dates, testimonials, activity, events, or partnerships", "Never imply team, league, venue, or event affiliation without trusted context", "Never promise romantic outcomes", "Avoid sleazy, sexualized, desperate, predatory, crude, or objectifying language", "Avoid generic corporate dating language", "Create a genuinely distinct human-connection angle when another SNG brand addresses the same event", "For creator outreach, prefer participate or discuss, then experience, collaborate, and amplify", "For media outreach, lead with sports fandom as compatibility, dating through shared identity, and game day as a natural date—not a request to cover a startup"],
};

export const rankEyeQBrandBrain: BrandBrainFormValue = {
  purpose: "Turn fantasy football rankings into a measurable competition. Players rank the field before games, actual performance determines the results, and RankEyeQ keeps score so fantasy insight can be proven over time.",
  corePromise: "Prove you know ball.",
  coreProposition: "Everybody has rankings. RankEyeQ keeps score. RankEyeQ is competition first and intelligence second: rankings are the playing field, while credibility, accountability, comparison, reputation, and receipts are the product. Humans, experts, and AI can be evaluated inside the same competitive framework.",
  audience: "Fantasy football players and NFL fans who believe they understand player performance and want to prove it—especially people who debate rankings, consume projections, make start/sit decisions, identify breakouts, challenge consensus, enjoy sports competition, and want recognition for being right consistently.",
  secondaryAudiences: ["Fantasy analysts", "Fantasy creators", "Sports creators", "Fantasy communities", "DFS players", "Sports prediction enthusiasts", "Data and statistics-oriented fans", "AI and sports-tech audiences"],
  distributionAudiences: ["Fantasy analysts", "Fantasy publications", "Fantasy podcasts", "Fantasy creators", "Sports creators", "Sports media", "Fantasy communities", "NFL fan communities", "Sports-data personalities", "AI and technology creators", "Sports-tech media", "Fantasy and gaming industry contacts"],
  jobsToBeDone: ["Let me prove whether my fantasy football insight is actually good", "I think I rank players better than the experts", "How good am I actually at fantasy rankings?", "Can I beat consensus?", "Can I beat AI?", "Can I beat the experts?", "Who is actually the best at ranking each position?", "Was last week skill or luck?", "Can I do it consistently?", "Who is getting hot?", "Who has been most accurate this season?", "What does the public think?", "Where do humans disagree with experts or AI?", "Can I build a reputation for knowing football?", "Turn I know football from an opinion into something I can prove"],
  contentPillars: ["Prove It", "Rank the Field", "Receipts", "Humans vs Experts vs AI", "Reputation"],
  voice: "Competitive, confident, challenging, sports-native, sharp, smart, data-aware, concise, credible, and occasionally provocative. Put the rankings on the board and invite people to show what they have. Challenge the ranking, never the person.",
  voiceTraits: ["Competitive", "Confident", "Challenging", "Sports-native", "Sharp", "Smart", "Data-aware", "Concise", "Credible", "Occasionally provocative"],
  communicationPatterns: ["Everybody has rankings. RankEyeQ keeps score.", "Challenge the audience to prove it", "Invite users to rank the field themselves rather than only consume rankings", "Use receipts and locked rankings as accountability territory", "Compare Humans, Experts, and AI without hostility", "Turn weekly performance into long-term reputation", "Use specific evidence and timeframes for competitive claims", "Challenge rankings rather than attacking people"],
  contentModes: [
    { name: "Acquire", goal: "Get fantasy players to participate and submit rankings", example: "You've seen the rankings. Now make yours." },
    { name: "Rank", goal: "Drive participation in a specific weekly position-ranking board", example: "Rank the RBs." },
    { name: "Challenge", goal: "Challenge users, creators, experts, or communities to compete", example: "Can you beat the experts?" },
    { name: "Results / Receipts", goal: "Use trusted finalized RankEyeQ data to show what happened" },
    { name: "Compare", goal: "Compare Humans, Experts, and AI using trusted supplied data" },
    { name: "Report / Insight", goal: "Use real RankEyeQ data to surface meaningful fantasy intelligence" },
    { name: "Reputation / Celebrate", goal: "Recognize strong weekly or sustained participant, expert, or AI performance" },
    { name: "Outreach", goal: "Recruit creators, analysts, publications, and communities to participate or be represented" },
  ],
  prohibitedContent: ["Fabricated rankings, submissions, users, experts, AI entries, or consensus", "Fabricated scores, player finishes, leaderboard positions, streaks, or perfect boards", "Fabricated historical performance, participation numbers, expert participation, partnerships, or product activity", "Broad superiority claims based on small samples", "Claims of direct expert participation without trusted context", "Gambling, sportsbook, betting, wagering, DFS-operator, tout, or prediction-market positioning", "Guaranteed predictive-accuracy claims", "Hostility or personal attacks toward users, experts, or AI", "Generic fantasy-advice-site positioning", "Corporate, jargon-heavy, or needlessly academic language"],
  factualRequirements: ["Make ranking, score, consensus, participation, result, and leaderboard claims only from trusted supplied data", "Use specific claims with a specific timeframe and actual evidence", "Distinguish prediction or submitted ranking from consensus and actual player result", "Use supplied product context for positions, ranking depth, timing, locks, reveal, scoring, lifecycle, leaderboards, consensus methodology, and eligibility", "Never invent product mechanics from general fantasy-football knowledge", "When trusted results do not exist, use invitation and challenge content instead of fake receipts"],
  affiliationRestrictions: ["Never imply an expert personally participates unless trusted context establishes it", "When rankings are sourced or represented through an allowed benchmark model, distinguish that from direct participation", "Never imply publication, creator, league, team, or partner affiliation without trusted context"],
  aiOperatingInstructions: ["Treat RankEyeQ as competition first and intelligence second", "Challenge users to rank the field rather than merely consume rankings", "Focus on proving fantasy insight through measurable results and accountability", "Use receipts as strategic territory", "Recognize Humans vs Experts vs AI as a major recurring editorial engine", "Use reputation and consistency as long-term storytelling", "Use sports-native, competitive language", "Make data-backed claims only from trusted supplied context", "Distinguish submitted predictions, consensus, and actual results", "Never fabricate rankings, scores, submissions, consensus, participation, expert activity, player performance, or results", "Never imply direct expert participation unless trusted context establishes it", "Avoid positioning RankEyeQ as gambling, DFS, sportsbook, betting, a tout service, or a prediction market", "Distinguish consumer messaging from expert, media, creator, and community outreach", "Localize to trusted NFL week, position, player, Campaign, Activation, and Opportunity context", "Create genuinely different editorial angles from other SNG brands addressing the same sports event", "Remember: rankings are the playing field; credibility, competition, and reputation are the product"],
};

export const fantasyTrackBrandBrain: BrandBrainFormValue = {
  purpose: "Turn fantasy player performance into live position races. Instead of only asking how many points one player will score, FantasyTrack asks which player will finish first across the entire eligible positional field.",
  corePromise: "Every player. One race. Who finishes first?",
  coreProposition: "The players are the field. The game is the race. FantasyTrack reframes fantasy performance from player-versus-projection into player-versus-player across a full position field, with the live leaderboard becoming the racetrack. For qualified industry audiences, its separate B2B thesis is that participant conviction can allow the field to price itself.",
  audience: "Fantasy football players and NFL fans who understand player performance and enjoy predicting which player will outperform the entire positional field—especially people who follow weekly scoring, live leaderboards, breakouts, long shots, DFS, player props, and the Sunday slate.",
  secondaryAudiences: ["DFS players", "Sports bettors", "Player-prop audiences", "Prediction-market users", "Fantasy analysts", "Sports creators", "Sports prediction enthusiasts", "Data and statistics-oriented sports fans"],
  distributionAudiences: ["Prediction-market operators", "Fantasy operators", "Gaming operators", "Sports betting companies", "Sports-tech companies", "Gaming-industry executives", "Sports-tech investors", "Strategic partners", "Sports business media", "Fantasy and gaming media", "Fantasy creators", "DFS and betting creators", "Sports creators"],
  jobsToBeDone: ["Let me predict which player will outperform the entire positional field and follow that prediction as a live race", "Who finishes RB1 this week?", "Who is my pick to win the QB race?", "Can my player beat the whole field?", "Who is leading right now?", "Is my player still alive?", "Who is making a run?", "Can the long shot hold on?", "Who is moving up the leaderboard?", "Who wins the afternoon?", "Can I identify the breakout before everyone else?", "What does the public think?", "Which players are being backed?", "Turn a full Sunday of scattered player performances into one simple story: who is winning the race?", "For industry audiences: enable participant conviction to establish effective pricing across a broad player field"],
  contentPillars: ["The Position Race", "Player vs Player", "Live Race", "Long Shots / Breakouts", "Public Conviction", "The Field Prices Itself"],
  voice: "Consumer voice is energetic, competitive, sports-native, fast-moving, clear, excited, smart, visual, concise, and race-oriented. It should feel like calling a race, not publishing a spreadsheet. B2B voice is innovative, mechanically credible, commercially aware, confident, curious, and never hype-heavy.",
  voiceTraits: ["Energetic", "Competitive", "Sports-native", "Fast-moving", "Clear", "Excited", "Smart", "Visual", "Concise", "Race-oriented"],
  communicationPatterns: ["Every player at the position becomes one competitive field", "Move from player-versus-projection to player-versus-player", "Invite the audience to pick a runner", "Use race language only when trusted state supports it", "Separate pre-race prediction, live-race movement, and finalized results", "Treat long-shot and public-conviction stories as data-dependent", "Keep consumer storytelling simple and visual", "Reserve the field-prices-itself thesis primarily for industry, partner, and investor contexts"],
  contentModes: [
    { name: "Acquire", goal: "Get fantasy players interested in entering a position race", example: "Every RB. One race. Who finishes first?" },
    { name: "Pick Your Runner", goal: "Drive pre-slate participation around position, field, selection, and conviction" },
    { name: "Pre-Race", goal: "Build anticipation using trusted field, participation, and position storylines" },
    { name: "Live Race", goal: "Turn trusted live fantasy scoring into accurate race commentary" },
    { name: "Results", goal: "Declare the winner and summarize the race using finalized trusted data" },
    { name: "Long Shot / Breakout", goal: "Highlight unexpected leaders or winners when trusted pricing or participation data supports it" },
    { name: "Public Conviction", goal: "Use trusted participation and pool data to explain what users believed" },
    { name: "Industry / B2B", goal: "Explain self-pricing field mechanics and strategic opportunity to qualified industry audiences" },
    { name: "Outreach", goal: "Recruit creators, media, operators, investors, and strategic relationships with audience-specific messaging" },
  ],
  prohibitedContent: ["Fabricated entries, users, selections, pool size, or pool distribution", "Fabricated odds, effective prices, payouts, ROI, favorites, long-shot status, or market movement", "Fabricated fantasy scores, leaderboard positions, lead changes, race results, or historical results", "Fabricated creator participation, partnerships, or product activity", "Unsupported first-ever, exclusivity, guaranteed-liquidity, no-risk, or operator-risk-elimination claims", "Promises of profit, guaranteed outcomes, easy money, or can't-miss wagers", "Chasing-losses or irresponsible financial language", "Manufactured wagering urgency", "Generic fantasy-advice, ranking, start/sit, DFS-lineup, isolated player-prop, or fixed-odds positioning", "Invented exacta, trifecta, box, prop, or future contest mechanics", "Unsupported legal or regulatory conclusions"],
  factualRequirements: ["Use trusted product context for sport, slate, position, eligible field, scoring, contest type, pool structure, lock timing, entries, pricing, scores, leaderboard, results, payouts, and ROI", "Never call a player a long shot without trusted pre-race pricing, participation, odds, or supplied context", "Never describe a lead change, comeback, or live leader without trusted live scoring", "Never manufacture public conviction or market movement", "Distinguish field open, pre-race, locked/start, live race, finish, and finalized result states", "If live or market data is unavailable, use invitation and prediction content instead", "Do not assume every FantasyTrack contest uses identical mechanics"],
  affiliationRestrictions: ["Never imply creator, operator, media, partner, league, or data-provider participation or affiliation without trusted context", "Do not claim that a partner requires FantasyTrack mechanics", "Do not claim exclusivity or regulatory approval without explicit trusted support"],
  aiOperatingInstructions: ["Treat player-versus-field competition as the defining consumer mechanic", "Make the position race easy to understand", "Treat the live leaderboard as a race only when trusted data supports it", "Use energetic, sports-native, race-oriented language", "Recognize long-shot leaders and lead changes as high-value opportunities only when trusted data supports them", "Use public-conviction and market data only when supplied", "Distinguish pre-race, live-race, and final-result states", "Never fabricate entries, odds, pool data, fantasy scores, leaders, payouts, ROI, or results", "Never invent product mechanics", "Distinguish the simple consumer race story from the B2B self-pricing-field story", "Use The field prices itself primarily for industry, partner, investor, and operator contexts", "Avoid generic fantasy-advice positioning", "Avoid reducing FantasyTrack to an isolated player-prop product", "Use responsible language around wagering, pricing, payouts, and risk", "Distinguish consumer messaging from creator, media, operator, partner, and investor outreach", "Create genuinely different editorial angles from RankEyeQ and Handicap Hero", "Remember: the players are the field; the game is the race"],
};
