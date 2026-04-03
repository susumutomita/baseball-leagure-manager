import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://mound.dev";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/terms", "/privacy"],
      disallow: ["/dashboard", "/games/", "/teams/", "/settings", "/api/"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
