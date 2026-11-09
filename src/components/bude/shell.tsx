import {
  BookOpen,
  ClipboardList,
  LayoutGrid,
  MessageCircle,
  Moon,
  Package,
  Timer,
  UserRound,
  Settings,
  Volume2,
  VolumeX,
} from "lucide-react";
import { formatDuration, waitTitle } from "@/lib/bude";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { BuddyPanel } from "./buddy";
import { JournalPanel } from "./journal";
import { PlanPanel } from "./plan";
import { TRACKS } from "@/lib/music";
import { StashPanel } from "./stash";
import { BudeProvider, useBude, type Tab } from "./provider";
import { authEnabled } from "@/lib/auth/client";
import { useCurrentUser, useCurrentUserState } from "@/lib/auth/use-current-user";
import { AccountScreen, AccountSplash } from "./account";
import { ProfilePanel } from "./profile";
import { SettingsPanel } from "./settings";
import { TonightPanel } from "./tonight";
import { ToolsPanel } from "./tools";

export function BudEApp() {
  return (
    <BudeProvider>
      <Frame />
    </BudeProvider>
  );
}

function Frame() {
  const { age } = useBude();
  return (
    <div className="min-h-dvh bg-bg">
      <div className="garden-glow pointer-events-none fixed inset-x-0 top-0 h-80" />
      <div className="relative mx-auto flex h-dvh w-full max-w-md flex-col border-line bg-surface md:border-x">
        {age === "yes" ? <AfterAge /> : <AgeGate />}
      </div>
    </div>
  );
}

function AgeGate() {
  const { age, setAge } = useBude();
  const declined = age === "no";
  return (
    <main className="flex flex-1 flex-col justify-between px-6 py-10">
      <div>
        <div className="mb-6 overflow-hidden rounded-card">
          <img src="/garden/leaf.jpg" alt="" className="h-56 w-full object-cover" />
        </div>
        <div className="mb-8 flex items-center gap-2 text-accent">
          <span className="text-xs font-semibold tracking-[0.22em] uppercase">21+ session companion</span>
        </div>
        <h1 className="font-display text-5xl leading-none font-medium italic text-fg">
          Bud-E
        </h1>
        <p className="mt-4 max-w-xs text-lg leading-snug text-muted">
          A calm buddy for the night you already started. Timers, straight answers, no lecture.
        </p>
      </div>
      <div>
        {declined ? (
          <>
            <h2 className="font-display text-3xl font-medium text-fg">This one is for adults.</h2>
            <p className="mt-3 text-muted">
              Bud-E is only for people 21 and over. If that was a mis-tap, you can continue.
            </p>
            <Button className="mt-6 w-full" onClick={() => setAge("yes")}>
              I am 21 or older
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-muted">
              Cannabis information for adults. Bud-E is not a doctor, not a shop, and not legal advice.
              Start low, go slow. Never drive high.
            </p>
            <div className="mt-5 flex flex-col gap-3">
              <Button className="w-full" onClick={() => setAge("yes")}>
                I'm 21 or older
              </Button>
              <Button variant="secondary" className="w-full" onClick={() => setAge("no")}>
                I'm under 21
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function AfterAge() {
  const { user, isPending } = useCurrentUserState();
  if (!authEnabled) return <AppFrame />;
  if (isPending) return <AccountSplash />;
  if (!user) return <AccountScreen />;
  return <AppFrame />;
}

const NAV: { id: Tab; label: string; icon: typeof Moon }[] = [
  { id: "tonight", label: "Tonight", icon: Moon },
  { id: "buddy", label: "Buddy", icon: MessageCircle },
  { id: "stash", label: "Stash", icon: Package },
  { id: "log", label: "Log", icon: BookOpen },
  { id: "tools", label: "Tools", icon: LayoutGrid },
  { id: "plan", label: "Plan", icon: ClipboardList },
  { id: "you", label: "You", icon: UserRound },
];

function AppFrame() {
  const { tab, setTab, timer, remainingSec, openTool, session, soundOn, toggleSound, settingsOpen, openSettings, track, setTrack } =
    useBude();
  const user = useCurrentUser();
  const who = user && !user.isDevFallback ? user.displayName : null;
  const showTimer = timer.status !== "idle";
  return (
    <>
      <header className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          type="button"
          onClick={() => setTab("you")}
          aria-label={who ? `Your account, ${who}` : "Your account"}
          className="flex min-h-11 min-w-0 items-center gap-2 text-left"
        >
          <span className="size-9 shrink-0 overflow-hidden rounded-full border border-line">
            <img src="/garden/leaf.jpg" alt="" className="size-9 object-cover" />
          </span>
          <span className="min-w-0">
            <span className="block font-display text-xl leading-none font-medium italic">Bud-E</span>
            <span className="block max-w-[9rem] truncate text-xs text-muted">{who || "Your account"}</span>
          </span>
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-pressed={settingsOpen}
            aria-label="Settings"
            onClick={openSettings}
            className={cn(
              "flex size-11 items-center justify-center rounded-full border border-line",
              settingsOpen ? "bg-accent text-accent-ink" : "text-muted",
            )}
          >
            <Settings className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-pressed={soundOn}
            aria-label={soundOn ? "Mute sounds" : "Turn sounds on"}
            onClick={toggleSound}
            className="flex size-11 items-center justify-center rounded-full border border-line text-muted"
          >
            {soundOn ? <Volume2 className="size-4" aria-hidden /> : <VolumeX className="size-4" aria-hidden />}
          </button>
          <p className="rounded-full border border-line px-2.5 py-1 text-xs font-semibold tracking-wide text-muted">
            21+
          </p>
        </div>
      </header>
      {track && (
        <div className="mx-4 mb-2 flex items-center justify-between rounded-full border border-line bg-card px-3 py-1.5">
          <p className="text-xs font-semibold">{TRACKS.find((item) => item.id === track)?.name} · playing</p>
          <button type="button" className="text-xs text-muted" onClick={() => setTrack(null)}>
            Stop
          </button>
        </div>
      )}

      {showTimer && (
        <button
          type="button"
          onClick={() => openTool("timer")}
          className="mx-4 mb-2 rounded-full border border-line bg-card px-4 py-2 text-left"
        >
          <span className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm text-muted">
              <Timer className="size-4 text-accent" aria-hidden />
              {timer.status === "done" ? "Wait's over" : waitTitle(session)}
            </span>
            <span className="font-display text-lg tabular-nums text-accent">
              {timer.status === "done" || remainingSec === null ? "00:00" : formatDuration(remainingSec)}
            </span>
          </span>
          {timer.status !== "done" && (
            <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-line">
              <span
                className="countdown-fill block h-full bg-accent"
                style={{
                  width: `${Math.min(100, Math.max(0, (1 - (remainingSec ?? 0) / timer.total) * 100))}%`,
                }}
              />
            </span>
          )}
        </button>
      )}

      <div className="min-h-0 flex-1 overflow-hidden">
        {settingsOpen ? (
          <SettingsPanel />
        ) : (
          <>
            {tab === "tonight" && <TonightPanel />}
            {tab === "buddy" && <BuddyPanel />}
            {tab === "log" && <JournalPanel />}
            {tab === "stash" && <StashPanel />}
            {tab === "tools" && <ToolsPanel />}
            {tab === "plan" && <PlanPanel />}
            {tab === "you" && <ProfilePanel />}
          </>
        )}
      </div>

      <nav className="grid grid-cols-7 border-t border-line bg-surface px-1 pt-1 pb-3" aria-label="Main">
        {NAV.map((item) => {
          const Icon = item.icon;
          const on = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={on ? "page" : undefined}
              onClick={() => setTab(item.id)}
              className={cn(
                "flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl text-xs font-medium",
                on ? "text-accent" : "text-muted",
              )}
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              <span className="max-w-full truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
