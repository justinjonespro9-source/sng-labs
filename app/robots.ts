import type { MetadataRoute } from "next";
import { PRODUCTION_SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${PRODUCTION_SITE_URL}/sitemap.xml`,
  };
}
