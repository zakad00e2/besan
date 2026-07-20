import { createFileRoute } from "@tanstack/react-router";
import { buildRobotsTxt } from "@/features/seo/crawl-files";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () => new Response(buildRobotsTxt(), {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
        },
      }),
    },
  },
});
