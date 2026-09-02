import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://getopfloor.com";
  const now = new Date();

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "always",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/#claim`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/#floors`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
  ];
}
