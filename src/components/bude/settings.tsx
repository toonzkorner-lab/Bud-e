import { useState } from "react";
import { THEMES } from "@/lib/themes";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Card } from "./bits";
import { useBude } from "./provider";

function Switch({
  on,
  label,
  onClick,
}: {
  on: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "relative h-8 w-14 shrink-0 rounded-full border border-line transition-colors",
        on ? "bg-accent" : "bg-card-2",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 size-6 rounded-full transition-transform",
          on ? "translate-x-6 bg-accent-ink" : "bg-fg",
        )}
      />
    </button>
  );
}

export function SettingsPanel() {
  const {
    soundOn,
    setSound,
    theme,
    setTheme,
    closeSettings,
    setTab,
    clearChat,
    clearSession,
    resetTimer,
    resetPhone,
    messages,
    session,
    journal,
    stash,
  } = useBude();
  const [confirm, setConfirm] = useState<"chat" | "tonight" | "phone" | null>(null);
  const stocked = Object.values(stash.jars).some((amount) => amount > 0);

  return (
    <div className="h-full overflow-y-auto px-4 pt-2 pb-8">
      <button type="button" onClick={closeSettings} className="min-h-11 text-sm font-semibold text-muted">
        Back
      </button>
      <h1 className="font-display text-4xl leading-none font-medium">Settings</h1>
      <p className="mt-2 mb-4 text-sm text-muted">Sound, look, and what stays on this phone.</p>

      <Card>
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">Appearance</p>
        <p className="mt-2 mb-3 text-sm text-muted">Swap the whole garden. It stays on this phone.</p>
        <div className="grid grid-cols-2 gap-2">
          {THEMES.map((item) => {
            const on = theme === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={on}
                onClick={() => setTheme(item.id)}
                className={cn(
                  "theme-swatch min-h-24 rounded-2xl border p-3 text-left",
                  on ? "border-accent" : "border-transparent",
                )}
                data-swatch={item.id}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="size-4 rounded-full"
                    style={{ background: "var(--swatch-accent)" }}
                    aria-hidden
                  />
                  <span className="text-sm font-semibold">{item.name}</span>
                </span>
                <span className="mt-2 block h-2 rounded-full" style={{ background: "var(--swatch-card)" }} />
                <span className="mt-2 block text-xs opacity-80">{item.detail}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="mt-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">Sounds</p>
            <p className="mt-1 text-sm text-muted">Timer chime, breath, and the short taps.</p>
          </div>
          <Switch on={soundOn} label={soundOn ? "Mute sounds" : "Turn sounds on"} onClick={() => setSound(!soundOn)} />
        </div>
      </Card>

      <Card className="mt-3">
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">This phone</p>
        <p className="mt-2 text-sm text-muted">None of this deletes your account.</p>
        <div className="mt-3 space-y-2">
          {confirm === "chat" ? (
            <div className="rounded-2xl border border-line bg-surface p-3">
              <p className="text-sm">Clear the chat with Bud-E?</p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    clearChat();
                    setConfirm(null);
                  }}
                >
                  Clear chat
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button className="w-full" variant="secondary" disabled={messages.length === 0} onClick={() => setConfirm("chat")}>
              Clear chat
            </Button>
          )}

          {confirm === "tonight" ? (
            <div className="rounded-2xl border border-line bg-surface p-3">
              <p className="text-sm">Clear tonight's dose and stop the wait? The stash jars stay.</p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    clearSession();
                    resetTimer();
                    setConfirm(null);
                  }}
                >
                  Clear tonight
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button className="w-full" variant="secondary" disabled={!session} onClick={() => setConfirm("tonight")}>
              Clear tonight
            </Button>
          )}

          {confirm === "phone" ? (
            <div className="rounded-2xl border border-line bg-surface p-3">
              <p className="text-sm">
                This clears the log, stash, chat, timer, and tonight. Your account, theme, and sounds stay.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    resetPhone();
                    setConfirm(null);
                  }}
                >
                  Reset this phone
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              className="w-full"
              variant="danger"
              disabled={journal.length === 0 && !stocked && messages.length === 0 && !session}
              onClick={() => setConfirm("phone")}
            >
              Reset this phone
            </Button>
          )}
        </div>
      </Card>

      <Card className="mt-3">
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">About</p>
        <p className="mt-2 text-sm leading-relaxed">
          Bud-E is a 21+ companion. Not a doctor, not a shop, and not legal advice. Start low, go slow. Never drive
          high.
        </p>
        <Button
          className="mt-3"
          size="sm"
          variant="secondary"
          onClick={() => setTab("you")}
        >
          Your account
        </Button>
      </Card>
    </div>
  );
}
