import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://mound.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE_URL,
      lastModified: new Date("2026-04-01"),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: new Date("2026-04-01"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date("2026-04-01"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: new Date("2026-04-04"),
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/legal`,
      lastModified: new Date("2026-04-04"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/help`,
      lastModified: new Date("2026-04-01"),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/docs`,
      lastModified: new Date("2026-04-01"),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
