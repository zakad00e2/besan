import { createFileRoute } from "@tanstack/react-router";
import { BookCallPage } from "../book-call";

export const Route = createFileRoute("/en/book-call")({
  component: () => <BookCallPage locale="en" />,
});
