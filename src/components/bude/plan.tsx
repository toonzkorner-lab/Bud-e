import { useState } from "react";
import { Check } from "lucide-react";
import {
  ENERGIES,
  SETTINGS,
  SNACKS,
  SOUNDS,
  buildPlan,
  type Energy,
  type Setting,
  type Snack,
  type Sound,
  type Vibe,
} from "@/lib/bude";
import { Button } from "@/components/ui/button";
import { Card, Chip, ChipRow, Label } from "./bits";
import { useBude } from "./provider";

export function PlanPanel() {
  const { session, vibe, setVibe, timerNote, setTab, now } = useBude();
  const plan = buildPlan(session, vibe, timerNote, new Date(now));
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(plan.plain);
      setCopied(true);
    } catch {
      setCopied(false);
    }
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="h-full overflow-y-auto px-4 pt-2 pb-8">
      <h1 className="font-display text-4xl leading-none font-medium">Plan</h1>
      <p className="mt-2 mb-4 text-sm text-muted">
        Built from what you actually logged. Copy it for the group chat.
      </p>

      {!session && (
        <Card className="mb-3">
          <p className="text-sm leading-relaxed">
            Nothing's logged, so this would just be a guess. Add the dose and the plan gets specific.
          </p>
          <Button className="mt-3" size="sm" onClick={() => setTab("tonight")}>
            Log tonight
          </Button>
        </Card>
      )}

      <Card>
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">For tonight</p>
        <dl className="mt-3 space-y-3">
          {plan.rows.map((row) => (
            <div key={row.label}>
              <dt className="text-xs font-semibold tracking-wide text-muted uppercase">{row.label}</dt>
              <dd className="text-base capitalize">{row.value}</dd>
            </div>
          ))}
        </dl>
        <ul className="mt-4 space-y-2 border-t border-line pt-4 text-sm leading-relaxed">
          {plan.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
        <Button className="mt-4 w-full" onClick={() => void copy()}>
          {copied ? (
            <>
              <Check className="size-4" aria-hidden />
              Copied
            </>
          ) : (
            "Copy plan"
          )}
        </Button>
      </Card>

      <div className="mt-3">
        <VibeEditor vibe={vibe} setVibe={setVibe} />
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted">{plan.fine.join(" ")}</p>
    </div>
  );
}

function VibeEditor({
  vibe,
  setVibe,
}: {
  vibe: Vibe;
  setVibe: <K extends keyof Vibe>(key: K, value: Vibe[K]) => void;
}) {
  return (
    <Card className="space-y-4">
      <h2 className="font-display text-2xl font-medium">Vibe check</h2>
      <div>
        <Label>Where are you?</Label>
        <ChipRow>
          {(Object.keys(SETTINGS) as Setting[]).map((id) => (
            <Chip key={id} on={vibe.setting === id} onClick={() => setVibe("setting", vibe.setting === id ? null : id)}>
              {SETTINGS[id]}
            </Chip>
          ))}
        </ChipRow>
      </div>
      <div>
        <Label>What's on?</Label>
        <ChipRow>
          {(Object.keys(SOUNDS) as Sound[]).map((id) => (
            <Chip key={id} on={vibe.sound === id} onClick={() => setVibe("sound", vibe.sound === id ? null : id)}>
              {SOUNDS[id]}
            </Chip>
          ))}
        </ChipRow>
      </div>
      <div>
        <Label>Craving</Label>
        <ChipRow>
          {(Object.keys(SNACKS) as Snack[]).map((id) => (
            <Chip key={id} on={vibe.snack === id} onClick={() => setVibe("snack", vibe.snack === id ? null : id)}>
              {SNACKS[id]}
            </Chip>
          ))}
        </ChipRow>
      </div>
      <div>
        <Label>Energy</Label>
        <ChipRow>
          {(Object.keys(ENERGIES) as Energy[]).map((id) => (
            <Chip key={id} on={vibe.energy === id} onClick={() => setVibe("energy", vibe.energy === id ? null : id)}>
              {ENERGIES[id]}
            </Chip>
          ))}
        </ChipRow>
      </div>
    </Card>
  );
}
