import type { SocialPlatform } from "@prisma/client";
import type { SocialProviderAdapter } from "../provider-adapter";
import { DiscordProviderAdapter } from "./discord";
import { InstagramProviderAdapter, MetaProviderAdapter } from "./meta";
import { TikTokProviderAdapter } from "./tiktok";
import { XProviderAdapter } from "./x";

const adapters = new Map<SocialPlatform, SocialProviderAdapter>([
  ["X", new XProviderAdapter()],
  ["DISCORD", new DiscordProviderAdapter()],
  ["FACEBOOK", new MetaProviderAdapter()],
  ["INSTAGRAM", new InstagramProviderAdapter()],
  ["TIKTOK", new TikTokProviderAdapter()],
]);

export function getSocialProviderAdapter(platform: SocialPlatform) {
  return adapters.get(platform) ?? null;
}

export function listSocialProviderAdapters() { return [...adapters.values()]; }

