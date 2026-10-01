export type SocialPlatform = "X" | "INSTAGRAM" | "FACEBOOK" | "DISCORD" | "LINKEDIN" | "TIKTOK" | "YOUTUBE" | "THREADS" | "OTHER";

const platformHosts: Record<SocialPlatform, string[] | null> = {
  X: ["x.com", "twitter.com"],
  INSTAGRAM: ["instagram.com"],
  FACEBOOK: ["facebook.com", "fb.com"],
  DISCORD: ["discord.com", "discord.gg", "discordapp.com"],
  LINKEDIN: ["linkedin.com"],
  TIKTOK: ["tiktok.com"],
  YOUTUBE: ["youtube.com", "youtu.be"],
  THREADS: ["threads.net", "threads.com"],
  OTHER: null,
};

function hostMatches(hostname: string, allowed: string[]) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return allowed.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

/** The recorded post URL must be https and live on the destination platform. */
export function validatePublishedUrl(platform: SocialPlatform, raw: string) {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("Published URL is not a valid URL");
  }
  if (url.protocol !== "https:") throw new Error("Published URL must use https");
  if (url.username || url.password) throw new Error("Published URL must not contain credentials");
  const allowed = platformHosts[platform];
  if (allowed && !hostMatches(url.hostname, allowed)) throw new Error(`Published URL must be on ${allowed.join(" or ")} for a ${platform} destination`);
  if (url.pathname === "/" || !url.pathname) throw new Error("Published URL must point to the specific post, not the site root");
  return url.toString();
}

export type DestinationAccount = {
  brandId: string;
  lifecycleStatus: "KNOWN" | "ACTIVE" | "INACTIVE" | "DISABLED";
  connectionStatus: string;
  metadataVerifiedAt: Date | null;
  profileUrl: string | null;
  handle: string | null;
};

export function isManuallyVerified(account: Pick<DestinationAccount, "metadataVerifiedAt" | "profileUrl" | "handle">) {
  return Boolean(account.metadataVerifiedAt && (account.profileUrl?.trim() || account.handle?.trim()));
}

/** Manual handoff needs a same-brand, allowed-lifecycle account whose identity an operator verified. API authorization is not required. */
export function manualDestinationGaps(account: DestinationAccount, brandId: string) {
  const gaps: string[] = [];
  if (account.brandId !== brandId) gaps.push("Destination belongs to a different brand");
  if (account.lifecycleStatus !== "KNOWN" && account.lifecycleStatus !== "ACTIVE") gaps.push(`Destination lifecycle is ${account.lifecycleStatus}`);
  if (!isManuallyVerified(account)) gaps.push("Destination identity has not been manually verified (needs verification time plus profile URL or handle)");
  return gaps;
}

/** Scheduling accepts API-connected accounts or manually verified known accounts. */
export function isSchedulableDestination(account: DestinationAccount, brandId: string) {
  if (account.brandId !== brandId) return false;
  if (account.connectionStatus === "CONNECTED") return true;
  return manualDestinationGaps(account, brandId).length === 0;
}

export type ConfirmationState = {
  draftStatus: string;
  latestApprovalDecision: string | null;
  latestApprovalAt: Date | null;
  publication: { status: string; method: string | null } | null;
};

export function assertManualConfirmable(state: ConfirmationState) {
  if (state.publication?.status === "PUBLISHED" || state.draftStatus === "PUBLISHED") throw new Error("This content is already recorded as PUBLISHED. Existing publication records are never reset.");
  if (!state.publication || state.publication.method !== "MANUAL" || state.publication.status !== "READY") throw new Error("Prepare a manual handoff before recording a publication");
  if (state.draftStatus !== "READY") throw new Error(`Content must be READY for manual publication (currently ${state.draftStatus})`);
  if (state.latestApprovalDecision !== "APPROVED") throw new Error("The latest review decision is not an approval; re-approve before publishing");
}

export function validatePublishedAt(publishedAt: Date | null, latestApprovalAt: Date | null, now: Date) {
  if (!publishedAt || Number.isNaN(publishedAt.getTime())) throw new Error("A valid published time is required");
  if (publishedAt.getTime() > now.getTime() + 5 * 60_000) throw new Error("Published time cannot be in the future");
  if (latestApprovalAt && publishedAt.getTime() < latestApprovalAt.getTime() - 60_000) throw new Error("Published time is before the content was approved");
  return publishedAt;
}
