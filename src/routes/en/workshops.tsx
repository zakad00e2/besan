import { createFileRoute } from "@tanstack/react-router";
import { WorkshopsPage } from "../workshops";

export const Route = createFileRoute("/en/workshops")({
  component: () => <WorkshopsPage locale="en" />,
});
