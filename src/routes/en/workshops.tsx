import { createFileRoute } from "@tanstack/react-router";
import { WorkshopsPage } from "../workshops";
import { createSeoHead } from "@/features/seo/seo";

export const Route = createFileRoute("/en/workshops")({
  component: () => <WorkshopsPage locale="en" />,
  head: () => createSeoHead("workshops", "en"),
});
