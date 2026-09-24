import type { SocialAccountType, SocialCapability } from "@prisma/client";
import { DisabledSocialProviderAdapter } from "../provider-adapter";

export class TikTokProviderAdapter extends DisabledSocialProviderAdapter {
  readonly platform = "TIKTOK" as const;
  readonly adapterVersion = "sng-tiktok-adapter/1.0.0-inventory";
  readonly supportsMultipleAccountsPerAuthorization = false;
  readonly supportedAccountTypes = ["PROFILE"] as const satisfies readonly SocialAccountType[];
  requiredScopes(capability: SocialCapability) {
    if (["PUBLISH_IMAGE", "PUBLISH_VIDEO"].includes(capability)) return ["video.publish"];
    if (capability === "READ_PROFILE") return ["user.info.basic"];
    return [];
  }
}

