import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  LANDINGS,
  METHODS,
  dosePhrase,
  formatDay,
  landingLine,
  plural,
  shelfGroups,
  strainKey,
  todayStamp,
  type JournalEntry,
  type Landing,
  type Method,
  type Unit,
} from "@/lib/bude";
import { Button } from "@/components/ui/button";
import { Card, Chip, ChipRow, Label } from "./bits";
import { useBude } from "./provider";

export function JournalPanel() {
  const { journal, addJournal, removeJournal, session, journalPrefill, clearJournalPrefill } = useBude();
  const [open, setOpen] = useState(journal.length === 0);
  const [method, setMethod] = useState<Method>("edible");
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState<Unit>("mg");
  const [unsure, setUnsure] = useState(false);
  const [at, setAt] = useState(todayStamp());
  const [landing, setLanding] = useState<Landing>("right");
  const [strain, setStrain] = useState("");
  const [note, setNote] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [shelfKey, setShelfKey] = useState<string | null>(null);

  function applySession() {
    if (!session) return;
    setMethod(session.method);
    setAmount(session.amount);
    setUnit(session.unit);
    setUnsure(session.unsure);
    setAt(todayStamp());
    setOpen(true);
  }

  useEffect(() => {
    if (!journalPrefill || !session) {
      if (journalPrefill) clearJournalPrefill();
      return;
    }
    setMethod(session.method);
    setAmount(session.amount);
    setUnit(session.unit);
    setUnsure(session.unsure);
    setAt(todayStamp());
    setOpen(true);
    clearJournalPrefill();
  }, [journalPrefill, session, clearJournalPrefill]);

  function save() {
    const entry: Omit<JournalEntry, "id"> = {
      at: at || todayStamp(),
      method,
      amount: unsure ? "" : amount.trim(),
      unit,
      unsure,
      landing,
      note: note.trim(),
      strain: strain.trim(),
    };
    addJournal(entry);
    setNote("");
    setStrain("");
    setSavedFlash(true);
    setOpen(false);
    window.setTimeout(() => setSavedFlash(false), 1600);
  }

  return (
    <div className="h-full overflow-y-auto px-4 pt-2 pb-8">
      <div className="mb-4 overflow-hidden rounded-card">
        <img src="/garden/leaf.jpg" alt="" className="h-28 w-full object-cover" />
      </div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl leading-none font-medium">Log</h1>
          <p className="mt-2 text-sm text-muted">
            {journal.length === 0 ? "Nothing saved yet." : `${journal.length} saved on this phone.`}
          </p>
        </div>
        <Button size="sm" variant={open ? "secondary" : "primary"} onClick={() => setOpen((v) => !v)}>
          {open ? "Close" : "Add"}
        </Button>
      </div>

      {open && (
        <Card className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-2xl font-medium">New entry</h2>
            {session && (
              <button type="button" className="text-sm font-semibold text-accent" onClick={applySession}>
                Use tonight
              </button>
            )}
          </div>
          <div>
            <Label>When</Label>
            <input
              type="date"
              aria-label="Date"
              value={at}
              onChange={(e) => setAt(e.target.value)}
              className="min-h-12 w-full rounded-2xl border border-line bg-surface px-3 text-base text-fg outline-none focus:border-accent"
            />
          </div>
          <div>
            <Label>Strain or product</Label>
            <input
              aria-label="Strain or product"
              value={strain}
              maxLength={60}
              placeholder="Blue Dream, or the gummy name"
              onChange={(e) => setStrain(e.target.value)}
              className="min-h-12 w-full rounded-2xl border border-line bg-surface px-3 text-base text-fg outline-none focus:border-accent"
            />
          </div>
          <div>
            <Label>What</Label>
            <ChipRow>
              {(Object.keys(METHODS) as Method[]).map((id) => (
                <Chip
                  key={id}
                  on={method === id}
                  onClick={() => {
                    setMethod(id);
                    setUnit(METHODS[id].unit);
                  }}
                >
                  {METHODS[id].label}
                </Chip>
              ))}
            </ChipRow>
          </div>
          <div>
            <Label>How much</Label>
            <div className="flex gap-2">
              <input
                aria-label="Amount"
                inputMode="decimal"
                value={unsure ? "" : amount}
                disabled={unsure}
                placeholder={unsure ? "Not sure" : unit === "g" ? "0.5" : "5"}
                onChange={(e) => setAmount(e.target.value)}
                className="min-h-12 w-full rounded-2xl border border-line bg-surface px-3 text-base text-fg outline-none focus:border-accent disabled:opacity-50"
              />
              <div className="flex rounded-full border border-line p-1">
                {(["mg", "g"] as Unit[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={unit === id}
                    onClick={() => setUnit(id)}
                    className={
                      unit === id
                        ? "min-h-10 rounded-full bg-accent px-3 text-sm font-semibold text-accent-ink"
                        : "min-h-10 rounded-full px-3 text-sm font-semibold text-muted"
                    }
                  >
                    {id}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-2">
              <Chip on={unsure} onClick={() => setUnsure((v) => !v)}>
                Not sure of the amount
              </Chip>
            </div>
          </div>
          <div>
            <Label>How it landed</Label>
            <ChipRow>
              {(Object.keys(LANDINGS) as Landing[]).map((id) => (
                <Chip key={id} on={landing === id} onClick={() => setLanding(id)}>
                  {LANDINGS[id].label}
                </Chip>
              ))}
            </ChipRow>
          </div>
          <div>
            <Label>Note</Label>
            <textarea
              aria-label="Note"
              value={note}
              maxLength={280}
              rows={3}
              placeholder="Couch, a show, slept fine."
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-2xl border border-line bg-surface px-3 py-3 text-base text-fg outline-none focus:border-accent"
            />
          </div>
          <Button className="w-full" onClick={save}>
            {savedFlash ? "Saved" : "Save entry"}
          </Button>
        </Card>
      )}

      {journal.length > 0 && (
        <section className="mt-5">
          <h2 className="font-display text-2xl font-medium">Shelf</h2>
          <p className="mt-1 mb-3 text-sm text-muted">Grouped by the name you typed. No effects promised.</p>
          <div className="space-y-2">
            {shelfGroups(journal).map((group) => {
              const on = shelfKey === group.key;
              return (
                <button
                  key={group.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setShelfKey(on ? null : group.key)}
                  className={
                    on
                      ? "w-full rounded-card border border-accent bg-card-2 p-3 text-left"
                      : "w-full rounded-card border border-line bg-card p-3 text-left"
                  }
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-display text-xl font-medium">{group.name}</span>
                    <span className="text-sm text-muted">{plural(group.entries.length, "night")}</span>
                  </span>
                  <span className="mt-1 block text-sm text-muted">{landingLine(group.entries)}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <div id="log-nights">
      {journal.length > 0 && (
        <h2 className="mt-5 font-display text-2xl font-medium">
          {shelfKey ? (shelfGroups(journal).find((group) => group.key === shelfKey)?.name ?? "Nights") : "Nights"}
        </h2>
      )}
      <ul className="mt-3 space-y-3">
        {journal
          .filter((entry) => !shelfKey || strainKey(entry.strain) === shelfKey)
          .map((entry) => (
          <li key={entry.id}>
            <Card>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-accent uppercase">{formatDay(entry.at)}</p>
                  {entry.strain?.trim() && (
                    <p className="mt-1 font-display text-2xl font-medium">{entry.strain.trim()}</p>
                  )}
                  <p className={entry.strain?.trim() ? "mt-1 text-sm text-muted capitalize" : "mt-1 font-display text-2xl font-medium capitalize"}>
                    {dosePhrase({
                      method: entry.method,
                      amount: entry.amount,
                      unit: entry.unit,
                      unsure: entry.unsure,
                      timeTaken: "",
                      experience: "some",
                    })}
                  </p>
                  <p className="mt-1 text-sm text-muted">{LANDINGS[entry.landing]?.label ?? entry.landing}</p>
                </div>
                {pendingDelete === entry.id ? (
                  <button
                    type="button"
                    className="text-sm font-semibold text-danger"
                    onClick={() => {
                      removeJournal(entry.id);
                      setPendingDelete(null);
                    }}
                  >
                    Delete
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-label="Delete entry"
                    className="flex size-11 items-center justify-center text-muted"
                    onClick={() => setPendingDelete(entry.id)}
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
              {entry.note && <p className="mt-3 text-sm leading-relaxed">{entry.note}</p>}
            </Card>
          </li>
        ))}
      </ul>
      {shelfKey && !journal.some((entry) => strainKey(entry.strain) === shelfKey) && (
        <p className="mt-3 text-sm text-muted">No nights under this name yet.</p>
      )}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted">
        Stays on this phone. It is a memory, not medical advice. Never drive high.
      </p>
    </div>
  );
}

