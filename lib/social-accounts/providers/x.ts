import type { SocialAccountType, SocialCapability } from "@prisma/client";
import { DisabledSocialProviderAdapter } from "../provider-adapter";

const scopeMap: Partial<Record<SocialCapability, string[]>> = {
  READ_PROFILE: ["users.read"],
  PUBLISH_TEXT: ["tweet.write", "users.read"],
  PUBLISH_IMAGE: ["tweet.write", "media.write", "users.read"],
  PUBLISH_VIDEO: ["tweet.write", "media.write", "users.read"],
  PUBLISH_MULTI_POST: ["tweet.write", "users.read"],
  READ_PUBLICATION: ["tweet.read", "users.read"],
  READ_ANALYTICS: ["tweet.read", "users.read"],
};

export class XProviderAdapter extends DisabledSocialProviderAdapter {
  readonly platform = "X" as const;
  readonly adapterVersion = "sng-x-adapter/1.0.0-contract";
  readonly supportsMultipleAccountsPerAuthorization = false;
  readonly supportedAccountTypes = ["PROFILE"] as const satisfies readonly SocialAccountType[];
  requiredScopes(capability: SocialCapability) { return scopeMap[capability] ?? []; }
}

