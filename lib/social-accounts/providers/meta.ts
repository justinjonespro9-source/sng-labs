import type { SocialAccountType, SocialCapability } from "@prisma/client";
import { DisabledSocialProviderAdapter } from "../provider-adapter";

abstract class MetaFamilyProviderAdapter extends DisabledSocialProviderAdapter {
  readonly adapterVersion = "sng-meta-adapter/1.0.0-contract";
  readonly supportsMultipleAccountsPerAuthorization = true;
  readonly supportedAccountTypes = ["PAGE", "PROFESSIONAL_ACCOUNT"] as const satisfies readonly SocialAccountType[];
  requiredScopes(capability: SocialCapability, accountType: SocialAccountType) {
    if (accountType === "PAGE") {
      if (["PUBLISH_TEXT", "PUBLISH_IMAGE", "PUBLISH_VIDEO"].includes(capability)) return ["pages_show_list", "pages_manage_posts"];
      if (capability === "READ_ANALYTICS") return ["pages_show_list", "read_insights"];
      return ["pages_show_list"];
    }
    if (["PUBLISH_IMAGE", "PUBLISH_VIDEO"].includes(capability)) return ["instagram_basic", "instagram_content_publish"];
    if (capability === "READ_ANALYTICS") return ["instagram_basic", "instagram_manage_insights"];
    return ["instagram_basic"];
  }
}

export class MetaProviderAdapter extends MetaFamilyProviderAdapter {
  readonly platform = "FACEBOOK" as const;
}

export class InstagramProviderAdapter extends MetaFamilyProviderAdapter {
  readonly platform = "INSTAGRAM" as const;
}
