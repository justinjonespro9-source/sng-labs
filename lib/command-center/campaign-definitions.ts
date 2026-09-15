export const growthProgramDefinitions = [
  {
    key: "fan-game-day-experience",
    name: "Fan Game-Day Experience",
    description: "Turn live fandom, venues, and game-day moments into participation and connection.",
    operatingDescription: "Market → Team → Event / Activation",
    brandKeys: ["stadium-slop", "team-m8tes", "eyez-on-the-prize"],
  },
  {
    key: "skill-and-prediction",
    name: "Skill & Prediction",
    description: "Build recurring competition, identity, and participation around sports knowledge and prediction.",
    operatingDescription: "Audience → Sport → Week → Slate / Contest",
    brandKeys: ["rank-eye-q", "handicap-hero", "fantasytrack"],
  },
] as const;

export const campaignDefinitions = [
  ["nfl-stadium-food-rankings", "fan-game-day-experience", "NFL Stadium Food Rankings", "stadium-slop", "PARTICIPATION", "Establish Stadium Slop as the national fan-powered authority on NFL stadium food.", "NFL game attendees, creators, local sports media, food creators, and fan communities", "Rate what you ate.", "Verified fan ratings reveal what is actually worth eating at NFL stadiums.", "Verified ratings and reviews per event and venue", ["Verified ratings", "Unique raters", "Rated items", "Referral sessions", "Creator activations", "Media coverage"]],
  ["fan-food-awards", "fan-game-day-experience", "Fan Food Awards", "stadium-slop", "MEDIA_EARNED", "Turn fan rating data into a shareable season-long earned-media property.", "NFL fans, sports media, food creators, venues, and vendors", "See what fans ranked best.", "The fans decide the best stadium food.", "Credible award-ready rating coverage and earned distribution", ["Eligible rated items", "Unique raters", "Media mentions", "Shares"]],
  ["nfl-game-day-connections", "fan-game-day-experience", "NFL Game-Day Connections", "team-m8tes", "USER_ACQUISITION", "Acquire sports fans looking to connect around live fandom and game-day experiences.", "NFL fans seeking a game-day crew or someone to watch with", "Find your people at the game.", "Meet fans who love the same team.", "Qualified new users and game-day connections", ["New users", "Matches", "Conversations", "Repeat users"]],
  ["your-attention-is-worth-something", "fan-game-day-experience", "Your Attention Is Worth Something", "eyez-on-the-prize", "PRODUCT_VALIDATION", "Explain and validate the Eyez consumer value proposition.", "Sports fans, consumers, creators, sponsors, and advertisers", "Watch. Unlock. See who wins.", "Watch → unlock a verified entry → see the drawing → see the winner.", "Validated consumer and sponsor interest", ["Completed views", "Verified entries", "Return participants", "Sponsor conversations"]],
  ["prove-you-know-ball", "skill-and-prediction", "Prove You Know Ball", "rank-eye-q", "PARTICIPATION", "Acquire and retain weekly fantasy rankers.", "Fantasy players and competitive football fans", "Submit your rankings.", "Everybody has rankings. RankEyeQ keeps score.", "Submitted rankings and week-over-week retention", ["Submitted rankings", "New rankers", "Repeat rankers", "Completed boards", "Referrals"]],
  ["humans-vs-experts-vs-ai", "skill-and-prediction", "Humans vs Experts vs AI", "rank-eye-q", "MEDIA_EARNED", "Turn RankEyeQ result data into recurring shareable and earned content.", "Fantasy players, analysts, creators, and sports media", "See who actually ranked best.", "Put human, expert, and AI fantasy insight on one scored leaderboard.", "Shareable weekly results and earned distribution", ["Result shares", "Media mentions", "Referral visits", "New rankers"]],
  ["expert-challenge", "skill-and-prediction", "Expert Challenge", "rank-eye-q", "CREATOR_ACTIVATION", "Recruit recognizable fantasy analysts and creators to participate in RankEyeQ.", "Fantasy analysts, creators, and publishers", "Take the Expert Challenge.", "Rank publicly, get scored, and prove the quality of your calls.", "Qualified analyst participation", ["Analysts contacted", "Responses", "Participating experts", "Earned mentions"]],
  ["how-deep-can-you-go", "skill-and-prediction", "How Deep Can You Go?", "handicap-hero", "PARTICIPATION", "Acquire and retain Handicap Hero players.", "Sports bettors, handicappers, and competitive fans", "Build your card.", "Rank your strongest calls and see how deep your confidence survives.", "Cards submitted and repeat participation", ["Cards submitted", "New players", "Repeat players", "Average survival depth", "Perfect cards", "Shares"]],
  ["beat-the-bots", "skill-and-prediction", "Beat the Bots", "handicap-hero", "RETENTION", "Differentiate Handicap Hero through recurring human-vs-AI competition.", "Sports bettors, handicappers, AI-curious fans, and creators", "Build a card and beat the bots.", "Your confidence card versus the machines.", "Repeat participation and shareable human-vs-bot results", ["Human wins", "Bot results shares", "Repeat players", "Creator challenges"]],
  ["sunday-position-races", "skill-and-prediction", "Sunday Position Races", "fantasytrack", "PARTICIPATION", "Acquire consumers through live weekly player-performance races.", "Fantasy players and prediction-market users", "Back your pick.", "Every player. One race. Who finishes first?", "Entries and recurring pool participation", ["Entries", "New players", "Repeat players", "Pool participation", "Referrals", "Shares"]],
  ["the-field-prices-itself", "skill-and-prediction", "The Field Prices Itself", "fantasytrack", "INDUSTRY_OUTREACH", "Create qualified strategic conversations around FantasyTrack's market mechanism.", "Prediction-market, gaming, fantasy, sports-tech, investor, and media operators", "Start a strategic conversation.", "Participant conviction lets a large player field establish effective pricing without SNG manually pricing every runner.", "Qualified strategic conversations", ["Qualified conversations", "Meetings", "Demos", "Follow-ups", "Partnership opportunities"]],
] as const;
