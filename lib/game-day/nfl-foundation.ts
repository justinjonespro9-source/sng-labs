export const NFL_FOUNDATION_SOURCE = "SNG_NFL_2026_FIXTURE";

export type NflFoundationTeam = {
  key: string;
  name: string;
  abbreviation: string;
  marketKey: string;
  marketName: string;
  region: string;
  homeVenueKey: string;
};

export type NflFoundationVenue = {
  key: string;
  name: string;
  city: string;
  state?: string;
  country: string;
  timeZone: string;
  aliases?: string[];
};

export const nflTeams: readonly NflFoundationTeam[] = [
  { key: "arizona-cardinals", name: "Arizona Cardinals", abbreviation: "ARI", marketKey: "phoenix-arizona", marketName: "Phoenix / Arizona", region: "Arizona", homeVenueKey: "state-farm-stadium" },
  { key: "atlanta-falcons", name: "Atlanta Falcons", abbreviation: "ATL", marketKey: "atlanta", marketName: "Atlanta", region: "Georgia", homeVenueKey: "mercedes-benz-stadium" },
  { key: "baltimore-ravens", name: "Baltimore Ravens", abbreviation: "BAL", marketKey: "baltimore", marketName: "Baltimore", region: "Maryland", homeVenueKey: "m-t-bank-stadium" },
  { key: "buffalo-bills", name: "Buffalo Bills", abbreviation: "BUF", marketKey: "buffalo", marketName: "Buffalo", region: "New York", homeVenueKey: "highmark-stadium" },
  { key: "carolina-panthers", name: "Carolina Panthers", abbreviation: "CAR", marketKey: "charlotte-carolinas", marketName: "Charlotte / Carolinas", region: "North Carolina", homeVenueKey: "bank-of-america-stadium" },
  { key: "chicago-bears", name: "Chicago Bears", abbreviation: "CHI", marketKey: "chicago", marketName: "Chicago", region: "Illinois", homeVenueKey: "soldier-field" },
  { key: "cincinnati-bengals", name: "Cincinnati Bengals", abbreviation: "CIN", marketKey: "cincinnati", marketName: "Cincinnati", region: "Ohio", homeVenueKey: "paycor-stadium" },
  { key: "cleveland-browns", name: "Cleveland Browns", abbreviation: "CLE", marketKey: "cleveland", marketName: "Cleveland", region: "Ohio", homeVenueKey: "huntington-bank-field" },
  { key: "dallas-cowboys", name: "Dallas Cowboys", abbreviation: "DAL", marketKey: "dallas-fort-worth", marketName: "Dallas / Fort Worth", region: "Texas", homeVenueKey: "att-stadium" },
  { key: "denver-broncos", name: "Denver Broncos", abbreviation: "DEN", marketKey: "denver", marketName: "Denver", region: "Colorado", homeVenueKey: "empower-field-at-mile-high" },
  { key: "detroit-lions", name: "Detroit Lions", abbreviation: "DET", marketKey: "detroit", marketName: "Detroit", region: "Michigan", homeVenueKey: "ford-field" },
  { key: "green-bay-packers", name: "Green Bay Packers", abbreviation: "GB", marketKey: "green-bay-wisconsin", marketName: "Green Bay / Wisconsin", region: "Wisconsin", homeVenueKey: "lambeau-field" },
  { key: "houston-texans", name: "Houston Texans", abbreviation: "HOU", marketKey: "houston", marketName: "Houston", region: "Texas", homeVenueKey: "nrg-stadium" },
  { key: "indianapolis-colts", name: "Indianapolis Colts", abbreviation: "IND", marketKey: "indianapolis", marketName: "Indianapolis", region: "Indiana", homeVenueKey: "lucas-oil-stadium" },
  { key: "jacksonville-jaguars", name: "Jacksonville Jaguars", abbreviation: "JAX", marketKey: "jacksonville", marketName: "Jacksonville", region: "Florida", homeVenueKey: "everbank-stadium" },
  { key: "kansas-city-chiefs", name: "Kansas City Chiefs", abbreviation: "KC", marketKey: "kansas-city", marketName: "Kansas City", region: "Missouri", homeVenueKey: "geha-field-at-arrowhead-stadium" },
  { key: "las-vegas-raiders", name: "Las Vegas Raiders", abbreviation: "LV", marketKey: "las-vegas", marketName: "Las Vegas", region: "Nevada", homeVenueKey: "allegiant-stadium" },
  { key: "los-angeles-chargers", name: "Los Angeles Chargers", abbreviation: "LAC", marketKey: "los-angeles", marketName: "Los Angeles", region: "California", homeVenueKey: "sofi-stadium" },
  { key: "los-angeles-rams", name: "Los Angeles Rams", abbreviation: "LAR", marketKey: "los-angeles", marketName: "Los Angeles", region: "California", homeVenueKey: "sofi-stadium" },
  { key: "miami-dolphins", name: "Miami Dolphins", abbreviation: "MIA", marketKey: "miami-south-florida", marketName: "Miami / South Florida", region: "Florida", homeVenueKey: "hard-rock-stadium" },
  { key: "minnesota-vikings", name: "Minnesota Vikings", abbreviation: "MIN", marketKey: "minnesota-twin-cities", marketName: "Minnesota / Twin Cities", region: "Minnesota", homeVenueKey: "u-s-bank-stadium" },
  { key: "new-england-patriots", name: "New England Patriots", abbreviation: "NE", marketKey: "boston-new-england", marketName: "Boston / New England", region: "Massachusetts", homeVenueKey: "gillette-stadium" },
  { key: "new-orleans-saints", name: "New Orleans Saints", abbreviation: "NO", marketKey: "new-orleans", marketName: "New Orleans", region: "Louisiana", homeVenueKey: "caesars-superdome" },
  { key: "new-york-giants", name: "New York Giants", abbreviation: "NYG", marketKey: "new-york-metro", marketName: "New York Metro", region: "New York / New Jersey", homeVenueKey: "metlife-stadium" },
  { key: "new-york-jets", name: "New York Jets", abbreviation: "NYJ", marketKey: "new-york-metro", marketName: "New York Metro", region: "New York / New Jersey", homeVenueKey: "metlife-stadium" },
  { key: "philadelphia-eagles", name: "Philadelphia Eagles", abbreviation: "PHI", marketKey: "philadelphia", marketName: "Philadelphia", region: "Pennsylvania", homeVenueKey: "lincoln-financial-field" },
  { key: "pittsburgh-steelers", name: "Pittsburgh Steelers", abbreviation: "PIT", marketKey: "pittsburgh", marketName: "Pittsburgh", region: "Pennsylvania", homeVenueKey: "acrisure-stadium" },
  { key: "san-francisco-49ers", name: "San Francisco 49ers", abbreviation: "SF", marketKey: "san-francisco-bay-area", marketName: "San Francisco Bay Area", region: "California", homeVenueKey: "levis-stadium" },
  { key: "seattle-seahawks", name: "Seattle Seahawks", abbreviation: "SEA", marketKey: "seattle", marketName: "Seattle", region: "Washington", homeVenueKey: "lumen-field" },
  { key: "tampa-bay-buccaneers", name: "Tampa Bay Buccaneers", abbreviation: "TB", marketKey: "tampa-bay", marketName: "Tampa Bay", region: "Florida", homeVenueKey: "raymond-james-stadium" },
  { key: "tennessee-titans", name: "Tennessee Titans", abbreviation: "TEN", marketKey: "nashville-tennessee", marketName: "Nashville / Tennessee", region: "Tennessee", homeVenueKey: "nissan-stadium" },
  { key: "washington-commanders", name: "Washington Commanders", abbreviation: "WSH", marketKey: "washington-dc", marketName: "Washington, D.C.", region: "District of Columbia / Maryland", homeVenueKey: "northwest-stadium" },
] as const;

export const nflVenues: readonly NflFoundationVenue[] = [
  { key: "state-farm-stadium", name: "State Farm Stadium", city: "Glendale", state: "AZ", country: "US", timeZone: "America/Phoenix" },
  { key: "mercedes-benz-stadium", name: "Mercedes-Benz Stadium", city: "Atlanta", state: "GA", country: "US", timeZone: "America/New_York" },
  { key: "m-t-bank-stadium", name: "M&T Bank Stadium", city: "Baltimore", state: "MD", country: "US", timeZone: "America/New_York" },
  { key: "highmark-stadium", name: "Highmark Stadium", city: "Orchard Park", state: "NY", country: "US", timeZone: "America/New_York" },
  { key: "bank-of-america-stadium", name: "Bank of America Stadium", city: "Charlotte", state: "NC", country: "US", timeZone: "America/New_York" },
  { key: "soldier-field", name: "Soldier Field", city: "Chicago", state: "IL", country: "US", timeZone: "America/Chicago" },
  { key: "paycor-stadium", name: "Paycor Stadium", city: "Cincinnati", state: "OH", country: "US", timeZone: "America/New_York" },
  { key: "huntington-bank-field", name: "Huntington Bank Field", city: "Cleveland", state: "OH", country: "US", timeZone: "America/New_York" },
  { key: "att-stadium", name: "AT&T Stadium", city: "Arlington", state: "TX", country: "US", timeZone: "America/Chicago", aliases: ["AT&T Stadium"] },
  { key: "empower-field-at-mile-high", name: "Empower Field at Mile High", city: "Denver", state: "CO", country: "US", timeZone: "America/Denver" },
  { key: "ford-field", name: "Ford Field", city: "Detroit", state: "MI", country: "US", timeZone: "America/Detroit" },
  { key: "lambeau-field", name: "Lambeau Field", city: "Green Bay", state: "WI", country: "US", timeZone: "America/Chicago" },
  { key: "nrg-stadium", name: "NRG Stadium", city: "Houston", state: "TX", country: "US", timeZone: "America/Chicago", aliases: ["Reliant Stadium"] },
  { key: "lucas-oil-stadium", name: "Lucas Oil Stadium", city: "Indianapolis", state: "IN", country: "US", timeZone: "America/Indiana/Indianapolis" },
  { key: "everbank-stadium", name: "EverBank Stadium", city: "Jacksonville", state: "FL", country: "US", timeZone: "America/New_York" },
  { key: "geha-field-at-arrowhead-stadium", name: "GEHA Field at Arrowhead Stadium", city: "Kansas City", state: "MO", country: "US", timeZone: "America/Chicago", aliases: ["Arrowhead Stadium"] },
  { key: "allegiant-stadium", name: "Allegiant Stadium", city: "Las Vegas", state: "NV", country: "US", timeZone: "America/Los_Angeles" },
  { key: "sofi-stadium", name: "SoFi Stadium", city: "Inglewood", state: "CA", country: "US", timeZone: "America/Los_Angeles" },
  { key: "hard-rock-stadium", name: "Hard Rock Stadium", city: "Miami Gardens", state: "FL", country: "US", timeZone: "America/New_York" },
  { key: "u-s-bank-stadium", name: "U.S. Bank Stadium", city: "Minneapolis", state: "MN", country: "US", timeZone: "America/Chicago" },
  { key: "gillette-stadium", name: "Gillette Stadium", city: "Foxborough", state: "MA", country: "US", timeZone: "America/New_York" },
  { key: "caesars-superdome", name: "Caesars Superdome", city: "New Orleans", state: "LA", country: "US", timeZone: "America/Chicago" },
  { key: "metlife-stadium", name: "MetLife Stadium", city: "East Rutherford", state: "NJ", country: "US", timeZone: "America/New_York" },
  { key: "lincoln-financial-field", name: "Lincoln Financial Field", city: "Philadelphia", state: "PA", country: "US", timeZone: "America/New_York" },
  { key: "acrisure-stadium", name: "Acrisure Stadium", city: "Pittsburgh", state: "PA", country: "US", timeZone: "America/New_York" },
  { key: "levis-stadium", name: "Levi's Stadium", city: "Santa Clara", state: "CA", country: "US", timeZone: "America/Los_Angeles", aliases: ["Levi’s Stadium"] },
  { key: "lumen-field", name: "Lumen Field", city: "Seattle", state: "WA", country: "US", timeZone: "America/Los_Angeles" },
  { key: "raymond-james-stadium", name: "Raymond James Stadium", city: "Tampa", state: "FL", country: "US", timeZone: "America/New_York" },
  { key: "nissan-stadium", name: "Nissan Stadium", city: "Nashville", state: "TN", country: "US", timeZone: "America/Chicago" },
  { key: "northwest-stadium", name: "Northwest Stadium", city: "Landover", state: "MD", country: "US", timeZone: "America/New_York" },
  { key: "melbourne-cricket-ground", name: "Melbourne Cricket Ground", city: "Melbourne", state: "VIC", country: "Australia", timeZone: "Australia/Melbourne" },
  { key: "maracana-stadium", name: "Maracanã Stadium", city: "Rio de Janeiro", state: "RJ", country: "Brazil", timeZone: "America/Sao_Paulo" },
  { key: "tottenham-hotspur-stadium", name: "Tottenham Hotspur Stadium", city: "London", country: "United Kingdom", timeZone: "Europe/London" },
  { key: "wembley-stadium", name: "Wembley Stadium", city: "London", country: "United Kingdom", timeZone: "Europe/London" },
  { key: "stade-de-france", name: "Stade de France", city: "Saint-Denis", country: "France", timeZone: "Europe/Paris" },
  { key: "santiago-bernabeu", name: "Santiago Bernabéu", city: "Madrid", country: "Spain", timeZone: "Europe/Madrid" },
  { key: "fc-bayern-munich-stadium", name: "FC Bayern Munich Stadium", city: "Munich", country: "Germany", timeZone: "Europe/Berlin", aliases: ["Allianz Arena"] },
  { key: "estadio-banorte", name: "Estadio Banorte", city: "Mexico City", country: "Mexico", timeZone: "America/Mexico_City", aliases: ["Estadio Azteca"] },
] as const;

function normalized(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, "and").replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

const teamsByName = new Map(nflTeams.map((team) => [normalized(team.name), team]));
const venuesByName = new Map<string, NflFoundationVenue>();
for (const venue of nflVenues) {
  for (const name of [venue.name, ...(venue.aliases ?? [])]) venuesByName.set(normalized(name), venue);
}

export function resolveNflTeam(name: string) {
  return teamsByName.get(normalized(name)) ?? null;
}

export function resolveNflVenue(name: string) {
  return venuesByName.get(normalized(name)) ?? null;
}
