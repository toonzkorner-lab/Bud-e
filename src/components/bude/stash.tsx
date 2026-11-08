import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { JARS, formatStashAmount, parseStashAmount, stashNote, type JarId } from "@/lib/bude";
import { useBude } from "./provider";

export function StashPanel() {
  const { stash, adjustStash, session } = useBude();
  const note = stashNote(stash, session);
  const ids = Object.keys(JARS) as JarId[];

  return (
    <div className="h-full overflow-y-auto px-4 pt-2 pb-8">
      <h1 className="font-display text-4xl leading-none font-medium">Stash</h1>
      <p className="mt-2 text-sm text-muted">
        One jar for each type. Log tonight and Bud-E takes that dose off the matching jar. Clear tonight and it goes back.
      </p>
      {note && <p className="mt-3 text-sm leading-relaxed text-accent">{note}</p>}
      <ul className="mt-4 space-y-3">
        {ids.map((id) => (
          <JarCard
            key={id}
            id={id}
            amount={stash.jars[id]}
            tonight={session?.method === id && !session.unsure}
            onAdjust={(delta) => adjustStash(id, delta)}
          />
        ))}
      </ul>
      <p className="mt-4 text-xs leading-relaxed text-muted">
        Other isn't a jar. A past night in the log does not change the stash. Nothing here leaves this phone.
      </p>
    </div>
  );
}

function JarCard({
  id,
  amount,
  tonight,
  onAdjust,
}: {
  id: JarId;
  amount: number;
  tonight: boolean;
  onAdjust: (delta: number) => void;
}) {
  const jar = JARS[id];
  const [raw, setRaw] = useState(String(jar.step));
  const parsed = parseStashAmount(raw);

  function apply(sign: 1 | -1) {
    if (!parsed) return;
    onAdjust(sign * parsed);
  }

  return (
    <li className="rounded-card border border-line bg-card p-3">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="font-display text-2xl font-medium">{jar.label}</p>
          {tonight && <p className="text-xs font-semibold tracking-wide text-accent uppercase">Tonight</p>}
        </div>
        <p className="font-display text-3xl font-medium tabular-nums">{formatStashAmount(amount, jar.unit)}</p>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          aria-label={`Subtract from ${jar.label}`}
          disabled={!parsed || amount <= 0}
          onClick={() => apply(-1)}
          className="flex size-12 shrink-0 items-center justify-center rounded-full border border-line bg-card-2 text-fg disabled:opacity-40"
        >
          <Minus className="size-4" aria-hidden />
        </button>
        <input
          aria-label={`${jar.label} amount`}
          inputMode="decimal"
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          className="min-h-12 w-full rounded-2xl border border-line bg-surface px-3 text-center text-base text-fg outline-none focus:border-accent"
        />
        <button
          type="button"
          aria-label={`Add to ${jar.label}`}
          disabled={!parsed}
          onClick={() => apply(1)}
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink disabled:opacity-40"
        >
          <Plus className="size-4" aria-hidden />
        </button>
      </div>
    </li>
  );
}
