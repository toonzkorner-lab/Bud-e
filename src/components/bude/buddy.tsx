import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { METHODS, dosePhrase } from "@/lib/bude";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { useBude, type ChatMessage } from "./provider";

const PROMPTS = [
  "When will this hit?",
  "I feel too high",
  "Can I take more?",
  "What should I eat?",
  "Can I drive?",
  "What dose should I start with?",
];

export function BuddyPanel() {
  const { messages, pending, send, session, setTab, clearChat } = useBude();
  const [draft, setDraft] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, pending]);

  function submit() {
    send(draft);
    setDraft("");
  }

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pt-2 pb-3" role="log" aria-live="polite">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl leading-none font-medium">Buddy</h1>
            <p className="mt-2 text-sm text-muted">Live when Gemini is connected. Not a doctor.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setTab("tonight")}
          className="w-full rounded-2xl border border-line bg-card px-3 py-2.5 text-left text-sm"
        >
          {session ? (
            <>
              <span className="font-semibold capitalize">{dosePhrase(session)}</span>
              <span className="text-muted"> · {METHODS[session.method].label} · edit</span>
            </>
          ) : (
            <span className="text-muted">No dose logged — tap to add one so answers use your numbers.</span>
          )}
        </button>

        {messages.length === 0 && !pending && (
          <div className="rounded-card border border-line bg-card px-4 py-4">
            <p className="text-base leading-relaxed">
              Hey. Tell me what you took, or ask something plain — like when an edible actually kicks in.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <Bubble key={msg.id} msg={msg} />
        ))}
        {pending && (
          <div className="max-w-[85%] rounded-3xl rounded-bl-md bg-card-2 px-4 py-3 text-sm text-muted">
            Thinking…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-line px-4 pt-2 pb-3">
        <div className="no-scrollbar -mx-4 mb-2 flex gap-2 overflow-x-auto px-4">
          {PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={pending}
              onClick={() => send(prompt)}
              className="shrink-0 rounded-full border border-line bg-card px-3 py-2 text-sm text-fg disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input
            value={draft}
            aria-label="Message Bud-E"
            placeholder="Ask Bud-E…"
            disabled={pending}
            onChange={(e) => setDraft(e.target.value)}
            className="min-h-12 w-full rounded-full border border-line bg-card px-4 text-base text-fg outline-none focus:border-accent"
          />
          <Button type="submit" disabled={pending || draft.trim() === ""} aria-label="Send">
            <Send className="size-4" aria-hidden />
          </Button>
        </form>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-muted">21+ · Not a doctor · Never drive high</p>
          {confirmClear ? (
            <span className="flex gap-2">
              <button type="button" className="text-xs font-semibold text-danger" onClick={() => { clearChat(); setConfirmClear(false); }}>
                Clear it
              </button>
              <button type="button" className="text-xs text-muted" onClick={() => setConfirmClear(false)}>
                Keep
              </button>
            </span>
          ) : (
            <button type="button" className="text-xs text-muted" onClick={() => setConfirmClear(true)} disabled={messages.length === 0}>
              Clear chat
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Bubble({ msg }: { msg: ChatMessage }) {
  const { openTool, startFromSession, session } = useBude();
  const mine = msg.role === "user";
  return (
    <div className={cn("max-w-[90%]", mine ? "ml-auto" : "")}>
      {msg.safety && !mine && <SafetyNote kind={msg.safety} />}
      <div
        className={cn(
          "rounded-3xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
          mine ? "rounded-br-md bg-accent text-accent-ink" : "rounded-bl-md bg-card-2 text-fg",
        )}
      >
        <span className={cn("mb-1 block text-xs font-semibold tracking-wide uppercase", mine ? "opacity-70" : "text-muted")}>
          {mine ? "You" : "Bud-E"}
        </span>
        {msg.text}
      </div>
      {msg.action && !mine && (
        <div className="mt-2">
          {msg.action === "timer" && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                startFromSession();
                openTool("timer");
              }}
            >
              {session && session.method ? "Start the wait" : "Open timer"}
            </Button>
          )}
          {msg.action === "breathe" && (
            <Button size="sm" variant="secondary" onClick={() => openTool("breathe")}>
              Breathe with me
            </Button>
          )}
          {msg.action === "munchies" && (
            <Button size="sm" variant="secondary" onClick={() => openTool("munchies")}>
              Pick a snack
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function SafetyNote({ kind }: { kind: NonNullable<ChatMessage["safety"]> }) {
  if (kind === "emergency") {
    return (
      <a href="tel:911" className="mb-2 block rounded-2xl border border-danger bg-danger-bg px-3 py-2 text-sm font-semibold text-danger">
        If this is an emergency, call 911.
      </a>
    );
  }
  if (kind === "pet") {
    return (
      <p className="mb-2 rounded-2xl border border-danger bg-danger-bg px-3 py-2 text-sm text-danger">
        Call a vet or animal poison control now. Don't wait it out.
      </p>
    );
  }
  if (kind === "drive") {
    return (
      <p className="mb-2 rounded-2xl border border-line bg-card px-3 py-2 text-sm text-fg">
        Don't get behind the wheel. Stay put or get a ride.
      </p>
    );
  }
  return (
    <p className="mb-2 rounded-2xl border border-line bg-card px-3 py-2 text-sm text-fg">
      You're safe to ride this out. Slow down before anything else.
    </p>
  );
}
