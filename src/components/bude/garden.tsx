import { useState } from "react";
import { CANNABINOIDS, EFFECT_MATCHES, METHOD_TIMES, TERPENES } from "@/lib/bude";
import { Card, Chip, ChipRow } from "./bits";

export function GuideTool() {
  const [section, setSection] = useState<"compounds" | "terpenes" | "timing">("compounds");
  return (
    <div className="space-y-3">
      <h2 className="font-display text-3xl font-medium">Field guide</h2>
      <p className="text-sm text-muted">Short, plain, and not a shopping list.</p>
      <ChipRow>
        <Chip on={section === "compounds"} onClick={() => setSection("compounds")}>
          Compounds
        </Chip>
        <Chip on={section === "terpenes"} onClick={() => setSection("terpenes")}>
          Terpenes
        </Chip>
        <Chip on={section === "timing"} onClick={() => setSection("timing")}>
          Timing
        </Chip>
      </ChipRow>
      {section === "compounds" &&
        CANNABINOIDS.map((item) => (
          <Card key={item.name}>
            <p className="font-display text-2xl font-medium">{item.name}</p>
            <p className="mt-1 text-sm font-semibold text-accent">{item.line}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{item.detail}</p>
          </Card>
        ))}
      {section === "terpenes" &&
        TERPENES.map((item) => (
          <Card key={item.name}>
            <p className="font-display text-2xl font-medium">{item.name}</p>
            <p className="mt-1 text-sm text-accent">{item.smell}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{item.note}</p>
          </Card>
        ))}
      {section === "timing" &&
        METHOD_TIMES.map((item) => (
          <Card key={item.method}>
            <p className="font-display text-2xl font-medium">{item.method}</p>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <div>
                <dt className="text-xs text-muted">Onset</dt>
                <dd>{item.onset}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Peak</dt>
                <dd>{item.peak}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Length</dt>
                <dd>{item.length}</dd>
              </div>
            </dl>
            <p className="mt-3 text-sm text-muted">{item.steer}</p>
          </Card>
        ))}
    </div>
  );
}

export function EffectsTool() {
  const [id, setId] = useState(EFFECT_MATCHES[0]?.id ?? "calm");
  const match = EFFECT_MATCHES.find((item) => item.id === id) ?? EFFECT_MATCHES[0];
  if (!match) return null;
  return (
    <div className="space-y-3">
      <h2 className="font-display text-3xl font-medium">Effect match</h2>
      <p className="text-sm text-muted">What people usually reach for. Not a prescription.</p>
      <ChipRow>
        {EFFECT_MATCHES.map((item) => (
          <Chip key={item.id} on={item.id === id} onClick={() => setId(item.id)}>
            {item.label}
          </Chip>
        ))}
      </ChipRow>
      <Card>
        <p className="text-xs font-semibold tracking-wide text-accent uppercase">{match.label}</p>
        <p className="mt-2 text-sm leading-relaxed">{match.reach}</p>
        <p className="mt-3 text-sm leading-relaxed text-muted">{match.start}</p>
        <p className="mt-3 text-sm leading-relaxed">{match.skip}</p>
      </Card>
    </div>
  );
}
