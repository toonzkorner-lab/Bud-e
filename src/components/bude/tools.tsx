import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Brain, Cookie, FlaskConical, Leaf, Timer, Wind, Sparkles } from "lucide-react";
import {
  MUNCHIES,
  THOUGHTS,
  TRIVIA,
  formatDuration,
  pick,
  waitMinutesFor,
  waitTitle,
} from "@/lib/bude";
import { cn } from "@/lib/cn";
import { playBreath, primeAudio } from "@/lib/sounds";
import { Button } from "@/components/ui/button";
import { Card } from "./bits";
import { EffectsTool, GuideTool } from "./garden";
import { useBude, type ToolId } from "./provider";

const TOOLS: { id: ToolId; title: string; detail: string; icon: typeof Timer }[] = [
  { id: "timer", title: "Wait timer", detail: "Chime when the wait ends", icon: Timer },
  { id: "breathe", title: "Breathing", detail: "4 in, 4 hold, 4 out", icon: Wind },
  { id: "effects", title: "Effects", detail: "Calm, sleep, social, create", icon: Sparkles },
  { id: "guide", title: "Field guide", detail: "Compounds, terpenes, timing", icon: FlaskConical },
  { id: "munchies", title: "Munchies", detail: "A snack, decided for you", icon: Cookie },
  { id: "thoughts", title: "Thoughts", detail: "A harmless rabbit hole", icon: Leaf },
  { id: "trivia", title: "Trivia", detail: "Ten from a big pile", icon: Brain },
];

export function ToolsPanel() {
  const { tool, closeTool } = useBude();
  if (!tool) return <ToolHome />;
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pt-2">
        <button type="button" onClick={closeTool} className="flex min-h-11 items-center gap-1 text-sm text-muted">
          <ArrowLeft className="size-4" aria-hidden />
          All tools
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-2 pb-6">
        {tool === "timer" && <TimerTool />}
        {tool === "breathe" && <BreatheTool />}
        {tool === "munchies" && <MunchiesTool />}
        {tool === "thoughts" && <ThoughtsTool />}
        {tool === "trivia" && <TriviaTool />}
        {tool === "guide" && <GuideTool />}
        {tool === "effects" && <EffectsTool />}
      </div>
    </div>
  );
}

function ToolHome() {
  const { openTool } = useBude();
  return (
    <div className="h-full overflow-y-auto px-4 pt-2 pb-8">
      <h1 className="font-display text-4xl leading-none font-medium">Tools</h1>
      <p className="mt-2 mb-4 text-sm text-muted">One thing at a time. The timer keeps running if you leave.</p>
      <div className="grid grid-cols-2 gap-3">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => openTool(tool.id)}
              className="min-h-32 rounded-card border border-line bg-card p-3 text-left"
            >
              <Icon className="size-5 text-accent" aria-hidden />
              <span className="mt-3 block font-semibold">{tool.title}</span>
              <span className="mt-1 block text-sm text-muted">{tool.detail}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TimerTool() {
  const {
    session,
    timer,
    remainingSec,
    startTimer,
    startFromSession,
    pauseTimer,
    resumeTimer,
    resetTimer,
    setTab,
  } = useBude();
  const suggested = session ? waitMinutesFor(session) : 120;
  const [minutes, setMinutes] = useState(suggested);
  const [note, setNote] = useState<string | null>(null);
  const running = timer.status === "running";

  function fromSession() {
    const result = startFromSession();
    if (result === "need-session") setNote("Log a dose on Tonight first, or just start a manual timer.");
    else if (result === "future") setNote("That time is still ahead. Fix it on Tonight.");
    else if (result === "already") setNote("You're already past the wait. If you feel nothing, give it another hour — don't stack yet.");
    else setNote(null);
  }

  return (
    <Card>
      <h2 className="font-display text-3xl font-medium">{waitTitle(session)}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Edibles: wait a full 2 hours before more. Flower or a vape: 15 minutes between hits is plenty. A chime plays when it ends. Keep this tab open so you can hear it.
      </p>
      <CountdownRing
        timer={timer}
        remainingSec={remainingSec}
        idleSeconds={Math.max(1, minutes || 1) * 60}
        label={
          timer.status === "idle"
            ? formatDuration(Math.max(1, minutes || 1) * 60)
            : timer.status === "done"
              ? "00:00"
              : formatDuration(remainingSec ?? 0)
        }
      />
      {timer.status === "done" && (
        <p className="mt-3 text-center text-sm font-medium text-fg" aria-live="polite">
          Time's up. Still nothing? Wait another hour. Do not redose yet.
        </p>
      )}
      {timer.status === "idle" && (
        <label className="mt-4 block text-sm font-semibold">
          Minutes
          <input
            type="number"
            min={1}
            max={720}
            inputMode="numeric"
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className="mt-2 min-h-12 w-full rounded-2xl border border-line bg-surface px-3 text-base font-normal outline-none focus:border-accent"
          />
        </label>
      )}
      <div className="mt-4 flex flex-col gap-2">
        {timer.status === "idle" && (
          <>
            <Button onClick={() => startTimer(minutes)}>Start timer</Button>
            <Button variant="secondary" onClick={fromSession}>
              Use my session{session ? ` · ${suggested} min` : ""}
            </Button>
          </>
        )}
        {timer.status === "running" && (
          <Button variant="secondary" onClick={pauseTimer}>
            Pause
          </Button>
        )}
        {timer.status === "paused" && (
          <Button onClick={resumeTimer}>Resume</Button>
        )}
        {timer.status !== "idle" && (
          <Button variant="ghost" onClick={resetTimer}>
            Reset
          </Button>
        )}
        {!session && (
          <Button variant="ghost" onClick={() => setTab("tonight")}>
            Log a dose
          </Button>
        )}
      </div>
      {note && <p className="mt-3 text-sm text-muted">{note}</p>}
      {running && <p className="mt-3 text-xs text-muted">This keeps counting on the other tabs.</p>}
    </Card>
  );
}

const RING_R = 86;
const RING_C = 2 * Math.PI * RING_R;

function ringOffset(fraction: number) {
  const clamped = Math.min(1, Math.max(0, fraction));
  return RING_C * (1 - clamped);
}

function CountdownRing({
  timer,
  remainingSec,
  idleSeconds,
  label,
}: {
  timer:
    | { status: "idle" }
    | { status: "running"; endsAt: number; total: number }
    | { status: "paused"; remaining: number; total: number }
    | { status: "done"; total: number };
  remainingSec: number | null;
  idleSeconds: number;
  label: string;
}) {
  const arc = useRef<SVGCircleElement>(null);
  const total = timer.status === "idle" ? idleSeconds : timer.total;
  const fraction =
    timer.status === "idle"
      ? 1
      : timer.status === "done"
        ? 0
        : timer.status === "paused"
          ? timer.remaining / timer.total
          : total > 0
            ? (remainingSec ?? 0) / total
            : 0;

  useEffect(() => {
    const node = arc.current;
    if (!node) return;
    if (timer.status !== "running" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      node.style.strokeDashoffset = "";
      return;
    }
    let frame = 0;
    const draw = () => {
      const left = Math.max(0, (timer.endsAt - Date.now()) / 1000);
      node.style.strokeDashoffset = String(ringOffset(timer.total > 0 ? left / timer.total : 0));
      frame = window.requestAnimationFrame(draw);
    };
    frame = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(frame);
  }, [timer]);

  return (
    <div className="relative mx-auto mt-5 size-56">
      <svg viewBox="0 0 200 200" className={timer.status === "done" ? "countdown-done size-full" : "size-full"} aria-hidden>
        <circle cx="100" cy="100" r={RING_R} fill="none" stroke="var(--color-line)" strokeWidth="8" />
        <circle
          ref={arc}
          cx="100"
          cy="100"
          r={RING_R}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={RING_C}
          strokeDashoffset={ringOffset(fraction)}
          transform="rotate(-90 100 100)"
        />
      </svg>
      <p className="absolute inset-0 flex items-center justify-center font-display text-5xl tabular-nums text-accent" aria-live="off">
        {label}
      </p>
    </div>
  );
}

const BREATH = [
  { label: "Breathe in", scale: 1.16 },
  { label: "Hold", scale: 1.16 },
  { label: "Breathe out", scale: 0.74 },
];

function BreatheTool() {
  const [on, setOn] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!on) return;
    const id = window.setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [on]);
  useEffect(() => {
    if (on && elapsed > 0 && elapsed % 4 === 0) playBreath();
  }, [elapsed, on]);
  const phase = BREATH[Math.floor(elapsed / 4) % 3] ?? BREATH[0];
  const round = Math.floor(elapsed / 12) + 1;
  return (
    <Card className="text-center">
      <h2 className="font-display text-3xl font-medium">Breathing</h2>
      <p className="mt-2 text-sm text-muted">For when it feels like a lot. Four seconds each.</p>
      <div className="flex justify-center py-8">
        <div
          className="breath-orb flex size-44 items-center justify-center rounded-full bg-accent text-center text-sm font-semibold text-accent-ink"
          style={{
            transform: on ? `scale(${phase.scale})` : "scale(1)",
            transition: "transform 4s ease-in-out",
          }}
          aria-live="polite"
        >
          <span className="px-6 text-sm font-semibold">{on ? phase.label : "Ready"}</span>
        </div>
      </div>
      <p className="text-sm font-medium text-muted">{on ? `Round ${round}` : "Tap start when you're ready"}</p>
      <Button
        className="mt-4 w-full"
        onClick={() => {
          primeAudio();
          if (on) setOn(false);
          else {
            setElapsed(0);
            setOn(true);
            playBreath();
          }
        }}
      >
        {on ? "Stop" : "Start breathing"}
      </Button>
    </Card>
  );
}

function MunchiesTool() {
  const { vibe } = useBude();
  const pool = MUNCHIES.filter((item) => !vibe.snack || item.tags.includes(vibe.snack));
  const list = pool.length ? pool : MUNCHIES;
  const [pickIndex, setPickIndex] = useState(0);
  const current = list[pickIndex % list.length] ?? list[0];
  return (
    <Card>
      <h2 className="font-display text-3xl font-medium">Munchies</h2>
      <p className="mt-2 text-sm text-muted">
        {vibe.snack ? `Tuned to ${vibe.snack}. Water first, then this.` : "Water first. Then this."}
      </p>
      <p className="mt-4 rounded-2xl bg-surface px-4 py-4 text-lg leading-snug">{current?.text}</p>
      <Button
        className="mt-4 w-full"
        onClick={() => setPickIndex((n) => (list.length < 2 ? n : (n + 1 + Math.floor(Math.random() * (list.length - 1))) % list.length))}
      >
        Another snack
      </Button>
      {vibe.snack && (
        <p className="mt-3 text-xs text-muted">Change the craving on the Plan tab.</p>
      )}
    </Card>
  );
}

function ThoughtsTool() {
  const [thought, setThought] = useState(THOUGHTS[0] ?? "");
  return (
    <Card>
      <h2 className="font-display text-3xl font-medium">Thoughts</h2>
      <p className="mt-2 text-sm text-muted">Nothing to solve. Just something to hold.</p>
      <p className="mt-4 rounded-2xl bg-surface px-4 py-4 text-lg leading-snug">{thought}</p>
      <Button className="mt-4 w-full" onClick={() => setThought(pick(THOUGHTS, thought))}>
        Next thought
      </Button>
    </Card>
  );
}

function drawRound() {
  const copy = [...TRIVIA];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = swap;
  }
  return copy.slice(0, 10);
}

function TriviaTool() {
  const [round, setRound] = useState(drawRound);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const q = round[index];

  function choose(option: number) {
    if (chosen !== null || !q) return;
    setChosen(option);
    if (option === q.answer) setScore((s) => s + 1);
  }

  if (done || !q) {
    return (
      <Card className="text-center">
        <h2 className="font-display text-3xl font-medium">Trivia</h2>
        <p className="mt-4 font-display text-5xl text-accent">
          {score} / {round.length}
        </p>
        <p className="mt-2 text-sm text-muted">
          {score === round.length
            ? "Clean sweep."
            : score >= Math.ceil(round.length * 0.7)
              ? "You know the basics."
              : "That's what the buddy is for."}
        </p>
        <Button
          className="mt-4 w-full"
          onClick={() => {
            setRound(drawRound());
            setIndex(0);
            setChosen(null);
            setScore(0);
            setDone(false);
          }}
        >
          Play again
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="font-display text-3xl font-medium">Trivia</h2>
      <p className="mt-2 text-xs text-muted">
        Question {index + 1} of {round.length} · {score} right
      </p>
      <p className="mt-3 text-lg font-semibold leading-snug">{q.question}</p>
      <div className="mt-3 space-y-2">
        {q.options.map((option, i) => {
          const correct = chosen !== null && i === q.answer;
          const wrong = chosen === i && i !== q.answer;
          return (
            <button
              key={option}
              type="button"
              disabled={chosen !== null}
              onClick={() => choose(i)}
              className={cn(
                "min-h-12 w-full rounded-2xl border px-3 py-2 text-left text-sm",
                correct && "border-accent bg-card-2",
                wrong && "border-danger bg-danger-bg",
                !correct && !wrong && "border-line bg-surface",
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
      {chosen !== null && (
        <>
          <p className="mt-3 rounded-2xl bg-surface px-3 py-3 text-sm text-muted">{q.fact}</p>
          <Button
            className="mt-3 w-full"
            onClick={() => {
              if (index + 1 >= round.length) setDone(true);
              else {
                setIndex((n) => n + 1);
                setChosen(null);
              }
            }}
          >
            {index + 1 >= round.length ? "See score" : "Next"}
          </Button>
        </>
      )}
    </Card>
  );
}

