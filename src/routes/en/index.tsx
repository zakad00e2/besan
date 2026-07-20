import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "../index";
import { createSeoHead } from "@/features/seo/seo";

export const Route = createFileRoute("/en/")({
  component: () => <HomePage locale="en" />,
  head: () => createSeoHead("home", "en"),
});
