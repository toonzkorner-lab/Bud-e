import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  EXPERIENCE,
  METHODS,
  activePhase,
  clockNow,
  dosePhrase,
  formatClock,
  minutesSince,
  parseClock,
  plural,
  stashNote,
  timeline,
  waitMinutesFor,
  waitTitle,
  type Experience,
  type Method,
  type Session,
  type Unit,
} from "@/lib/bude";
import { Button } from "@/components/ui/button";
import { Card, Chip, ChipRow, Label } from "./bits";
import { useBude } from "./provider";

export function TonightPanel() {
  const { session } = useBude();
  const [editing, setEditing] = useState(session === null);
  return (
    <div className="h-full overflow-y-auto px-4 pt-2 pb-8">
      <h1 className="font-display text-4xl leading-none font-medium text-fg">Tonight</h1>
      <p className="mt-2 mb-4 text-sm text-muted">
        Log the real dose. Bud-E will time it and stop guessing.
      </p>
      {session && !editing ? (
        <Summary onEdit={() => setEditing(true)} />
      ) : (
        <Logger
          initial={session}
          onDone={() => setEditing(false)}
          onCancel={session ? () => setEditing(false) : undefined}
        />
      )}
      <ul className="mt-4 space-y-1.5 text-sm text-muted">
        <li>Start low, go slow.</li>
        <li>Never drive high.</li>
        <li>If a pet eats an edible, call a vet.</li>
      </ul>
    </div>
  );
}

function Summary({ onEdit }: { onEdit: () => void }) {
  const { session, clearSession, openTool, openLogFromSession, now, stash } = useBude();
  if (!session) return null;
  const since = session.timeTaken ? minutesSince(session.timeTaken, new Date(now)) : null;
  const phases = timeline(session);
  const active = activePhase(session, new Date(now));
  const inhaled = METHODS[session.method].inhaled;
  const jarNote = stashNote(stash, session);

  let status = "Add the time you took it and I'll mark where you are.";
  if (since?.future) status = "That clock time hasn't happened yet. Fix it if this is tonight.";
  else if (since && active !== null) status = phases[active]?.detail ?? status;
  else if (!session.timeTaken) status = inhaled
    ? "Flower and vapes usually land in 5–15 minutes. One or two small hits, then wait."
    : "Edibles are quiet at first. Most people feel them around 45–90 minutes.";

  return (
    <div className="space-y-3">
      <Card>
        <p className="text-xs font-semibold tracking-[0.16em] text-accent uppercase">
          {METHODS[session.method].label}
        </p>
        <p className="mt-1 font-display text-3xl leading-tight font-medium capitalize">
          {dosePhrase(session)}
        </p>
        <p className="mt-1 text-sm text-muted">{EXPERIENCE[session.experience]}</p>
        <p className="mt-3 text-sm text-fg">
          {since && !since.future && session.timeTaken
            ? `${formatClock(parseClock(session.timeTaken) ?? 0)} · ${since.minutes === 0 ? "just now" : `${plural(since.minutes, "minute")} ago`}`
            : since?.future
              ? "Time is still ahead"
              : "Time not logged"}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted">{status}</p>
        {jarNote && <p className="mt-2 text-sm leading-relaxed text-accent">{jarNote}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={onEdit}>
            <Pencil className="size-4" aria-hidden />
            Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={openLogFromSession}>
            Save to log
          </Button>
          <Button variant="ghost" size="sm" onClick={clearSession}>
            <Trash2 className="size-4" aria-hidden />
            Clear
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">How this usually goes</h2>
        <ol className="space-y-3">
          {phases.map((phase, i) => (
            <li key={phase.label} className="flex gap-3">
              <span
                className={
                  i === active
                    ? "mt-1 size-2.5 shrink-0 rounded-full bg-accent"
                    : "mt-1 size-2.5 shrink-0 rounded-full bg-line"
                }
                aria-hidden
              />
              <span>
                <span className={i === active ? "text-sm font-semibold text-accent" : "text-sm font-semibold"}>
                  {phase.label}
                </span>
                <span className="mt-0.5 block text-sm text-muted">{phase.detail}</span>
              </span>
            </li>
          ))}
        </ol>
      </Card>

      <Button className="w-full" onClick={() => openTool("timer")}>
        {waitTitle(session)} · {waitMinutesFor(session)} min
      </Button>
    </div>
  );
}

function Logger({
  initial,
  onDone,
  onCancel,
}: {
  initial: Session | null;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const { saveSession } = useBude();
  const [method, setMethod] = useState<Method | null>(initial?.method ?? null);
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [unit, setUnit] = useState<Unit>(initial?.unit ?? "mg");
  const [unsure, setUnsure] = useState(initial?.unsure ?? false);
  const [timeMode, setTimeMode] = useState<"now" | "pick" | "unsure">(
    initial?.timeTaken ? "pick" : "unsure",
  );
  const [timeTaken, setTimeTaken] = useState(initial?.timeTaken || clockNow());
  const [experience, setExperience] = useState<Experience>(initial?.experience ?? "some");

  function chooseMethod(next: Method) {
    setMethod(next);
    setUnit(METHODS[next].unit);
    if (METHODS[next].inhaled && unit === "mg" && !amount) setAmount("");
  }

  function save() {
    if (!method) return;
    const session: Session = {
      method,
      amount: unsure ? "" : amount.trim(),
      unit,
      unsure,
      timeTaken: timeMode === "unsure" ? "" : timeMode === "now" ? clockNow() : timeTaken,
      experience,
    };
    saveSession(session);
    onDone();
  }

  const presets = unit === "g" ? ["0.25", "0.5", "1"] : method && METHODS[method].inhaled ? ["1", "2", "3"] : ["2.5", "5", "10"];

  return (
    <Card className="space-y-5">
      <div>
        <Label>What did you take?</Label>
        <ChipRow>
          {(Object.keys(METHODS) as Method[]).map((id) => (
            <Chip key={id} on={method === id} onClick={() => chooseMethod(id)}>
              {METHODS[id].label}
            </Chip>
          ))}
        </ChipRow>
        {method && <p className="mt-2 text-xs text-muted">{METHODS[method].hint}</p>}
      </div>

      {method && (
        <>
          <div>
            <Label>How much?</Label>
            <ChipRow>
              {presets.map((p) => (
                <Chip
                  key={p}
                  on={!unsure && amount === p}
                  onClick={() => {
                    setUnsure(false);
                    setAmount(p);
                  }}
                >
                  {p}
                  {unit}
                </Chip>
              ))}
              <Chip on={unsure} onClick={() => setUnsure(true)}>
                Not sure
              </Chip>
            </ChipRow>
            {!unsure && (
              <div className="mt-3 flex gap-2">
                <input
                  aria-label="Amount"
                  inputMode="decimal"
                  value={amount}
                  placeholder={unit === "g" ? "0.5" : "5"}
                  onChange={(e) => setAmount(e.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-line bg-surface px-3 text-base text-fg outline-none focus:border-accent"
                />
                <div className="flex rounded-full border border-line p-1">
                  {(["mg", "g"] as Unit[]).map((u) => (
                    <button
                      key={u}
                      type="button"
                      aria-pressed={unit === u}
                      onClick={() => setUnit(u)}
                      className={
                        unit === u
                          ? "min-h-10 rounded-full bg-accent px-3 text-sm font-semibold text-accent-ink"
                          : "min-h-10 rounded-full px-3 text-sm font-semibold text-muted"
                      }
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <Label>When?</Label>
            <ChipRow>
              <Chip on={timeMode === "now"} onClick={() => setTimeMode("now")}>
                Just now
              </Chip>
              <Chip on={timeMode === "pick"} onClick={() => setTimeMode("pick")}>
                Pick a time
              </Chip>
              <Chip on={timeMode === "unsure"} onClick={() => setTimeMode("unsure")}>
                Not sure
              </Chip>
            </ChipRow>
            {timeMode === "pick" && (
              <input
                aria-label="Time taken"
                type="time"
                value={timeTaken}
                onChange={(e) => setTimeTaken(e.target.value)}
                className="mt-3 min-h-12 w-full rounded-2xl border border-line bg-surface px-3 text-base text-fg outline-none focus:border-accent"
              />
            )}
          </div>

          <div>
            <Label>Experience</Label>
            <ChipRow>
              {(Object.keys(EXPERIENCE) as Experience[]).map((id) => (
                <Chip key={id} on={experience === id} onClick={() => setExperience(id)}>
                  {EXPERIENCE[id]}
                </Chip>
              ))}
            </ChipRow>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={save}>
              Log this
            </Button>
            {onCancel && (
              <Button variant="secondary" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
