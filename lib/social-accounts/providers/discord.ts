import type { SocialAccountType, SocialCapability } from "@prisma/client";
import { DisabledSocialProviderAdapter } from "../provider-adapter";

export class DiscordProviderAdapter extends DisabledSocialProviderAdapter {
  readonly platform = "DISCORD" as const;
  readonly adapterVersion = "sng-discord-adapter/1.0.0-contract";
  readonly supportsMultipleAccountsPerAuthorization = true;
  readonly supportedAccountTypes = ["GUILD", "CHANNEL", "WEBHOOK_DESTINATION"] as const satisfies readonly SocialAccountType[];
  requiredScopes(capability: SocialCapability, accountType: SocialAccountType) {
    if (accountType === "WEBHOOK_DESTINATION") return capability === "PUBLISH_TEXT" || capability === "PUBLISH_IMAGE" ? ["webhook.incoming"] : [];
    if (["PUBLISH_TEXT", "PUBLISH_IMAGE", "PUBLISH_VIDEO", "MANAGE_COMMUNITY"].includes(capability)) return ["bot"];
    return capability === "READ_PROFILE" ? ["identify"] : [];
  }
}

