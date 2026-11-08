import { createFileRoute } from "@tanstack/react-router";
import { BudEApp } from "@/components/bude/shell";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <BudEApp />;
}
