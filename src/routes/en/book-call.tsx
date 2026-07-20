import { createFileRoute } from "@tanstack/react-router";
import { BookCallPage } from "../book-call";
import { createSeoHead } from "@/features/seo/seo";

export const Route = createFileRoute("/en/book-call")({
  component: () => <BookCallPage locale="en" />,
  head: () => createSeoHead("bookCall", "en"),
});
