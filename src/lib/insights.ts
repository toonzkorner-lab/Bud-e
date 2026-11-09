import { METHODS, type JournalEntry, type Session, type StashBook } from "@/lib/bude";

export function sessionInsights(journal: JournalEntry[], session: Session | null, stash: StashBook): string[] {
  const lines: string[] = [];
  if (journal.length === 0 && !session) {
    return ["No nights saved yet. Log one and this starts meaning something."];
  }
  if (session) {
    const method = METHODS[session.method].label;
    lines.push(`Tonight is ${session.amount || "an unmeasured"} ${session.unit} ${method.toLowerCase()}.`);
  }
  if (journal.length > 0) {
    const counts = new Map<string, number>();
    for (const entry of journal) counts.set(entry.method, (counts.get(entry.method) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    lines.push(
      journal.length === 1
        ? "1 night in the log."
        : `${journal.length} nights in the log. ${METHODS[top[0] as JournalEntry["method"]].label} shows up most.`,
    );
    const rough = journal.filter((entry) => entry.landing === "too-much").length;
    if (rough > 0) {
      lines.push(rough === 1 ? "1 of those landed rough. Smaller next time." : `${rough} landed rough. Smaller next time.`);
    }
  }
  const stocked = Object.values(stash.jars).filter((amount) => amount > 0).length;
  lines.push(stocked === 0 ? "The stash is empty." : stocked === 1 ? "1 jar still has something in it." : `${stocked} jars still have something in them.`);
  return lines;
}
