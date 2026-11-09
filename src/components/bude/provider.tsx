import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  EMPTY_VIBE,
  emptyBook,
  minutesSince,
  replyTo,
  directAnswer,
  settleBook,
  adjustBook,
  timerNoteFor,
  formatDuration,
  waitMinutesFor,
  type JarId,
  type JournalEntry,
  type Session,
  type StashBook,
  type Vibe,
} from "@/lib/bude";
import { askBuddy } from "@/lib/buddy-client";
import { blankThread, cleanThread, mergeThreads, titleFrom, type ChatMessage, type ChatThread } from "@/lib/chat-threads";
import { pullChats, removeChat, saveChat, wipeChats } from "@/lib/chats.functions";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { playDone, playPause, playStart, primeAudio, setSoundEnabled } from "@/lib/sounds";
import { isThemeId, type ThemeId } from "@/lib/themes";
import {
  isPersonaId,
  tierAtLeast,
  type Membership,
  type PersonaId,
  type Tier,
} from "@/lib/premium";
import {
  confirmCheckout,
  getMembership,
  grantPreviewTier,
  makeMine,
  removePlan,
  saveLook,
  savePlan,
  startCheckout,
} from "@/lib/premium.functions";
import { playTrack, stopMusic, type TrackId } from "@/lib/music";

export type Tab = "tonight" | "buddy" | "log" | "stash" | "tools" | "plan" | "you";
export type ToolId = "timer" | "breathe" | "munchies" | "thoughts" | "trivia" | "guide" | "effects";

export type { ChatMessage };

type Timer =
  | { status: "idle" }
  | { status: "running"; endsAt: number; total: number }
  | { status: "paused"; remaining: number; total: number }
  | { status: "done"; total: number };

type Age = "unknown" | "yes" | "no";

type Ctx = {
  age: Age;
  setAge: (age: Age) => void;
  tab: Tab;
  setTab: (tab: Tab) => void;
  tool: ToolId | null;
  openTool: (tool: ToolId) => void;
  closeTool: () => void;
  session: Session | null;
  saveSession: (session: Session) => void;
  clearSession: () => void;
  vibe: Vibe;
  setVibe: <K extends keyof Vibe>(key: K, value: Vibe[K]) => void;
  messages: ChatMessage[];
  threads: ChatThread[];
  activeChatId: string;
  accountChats: boolean;
  pending: boolean;
  send: (text: string) => void;
  clearChat: () => void;
  newChat: () => void;
  openChat: (id: string) => void;
  renameChat: (id: string, title: string) => void;
  deleteChat: (id: string) => void;
  timer: Timer;
  remainingSec: number | null;
  timerNote: string;
  startTimer: (minutes: number) => void;
  startFromSession: () => "started" | "already" | "need-session" | "future";
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  now: number;
  journal: JournalEntry[];
  addJournal: (entry: Omit<JournalEntry, "id">) => void;
  removeJournal: (id: string) => void;
  journalPrefill: boolean;
  openLogFromSession: () => void;
  clearJournalPrefill: () => void;
  stash: StashBook;
  adjustStash: (method: JarId, delta: number) => void;
  soundOn: boolean;
  toggleSound: () => void;
  setSound: (on: boolean) => void;
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  tier: Tier;
  shopOpen: boolean;
  previewTiers: boolean;
  buyTier: (tier: "lit" | "cloud") => Promise<"sent" | "closed" | "failed">;
  tryTier: (tier: Tier) => Promise<void>;
  persona: PersonaId;
  customName: string;
  customVoice: string;
  accent: string;
  themeName: string;
  setPersona: (persona: PersonaId) => void;
  setAccent: (accent: string) => void;
  makeCustom: (prompt: string, accent: string) => Promise<void>;
  savedPlans: Membership["plans"];
  saveCurrentPlan: (title: string, body: string) => Promise<"saved" | "limit" | "failed">;
  deleteSavedPlan: (id: string) => void;
  track: TrackId | null;
  setTrack: (track: TrackId | null) => void;
  settingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  resetPhone: () => void;
};

const BudeContext = createContext<Ctx | null>(null);

const EMPTY_MEMBERSHIP: Membership = {
  tier: "free",
  persona: "bud",
  customName: "",
  customVoice: "",
  accent: "",
  themeName: "",
  plans: [],
  preview: false,
  shop: false,
};

const KEYS = {
  age: "bude-age-v2",
  session: "bude-session-v2",
  vibe: "bude-vibe-v2",
  chat: "bude-chat-v2",
  threads: "bude-threads-v1",
  timer: "bude-timer-v2",
  journal: "bude-journal-v1",
  stash: "bude-stash-v2",
  sound: "bude-sound-v1",
  theme: "bude-theme-v1",
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function hydrateTimer(raw: Timer | null): Timer {
  if (!raw || raw.status === "idle") return { status: "idle" };
  if (raw.status === "running") {
    if (raw.endsAt <= Date.now()) return { status: "done", total: raw.total };
    return raw;
  }
  if (raw.status === "paused" || raw.status === "done") return raw;
  return { status: "idle" };
}

export function BudeProvider({ children }: { children: ReactNode }) {
  const [age, setAgeState] = useState<Age>("unknown");
  const [tab, setTabState] = useState<Tab>("tonight");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setThemeState] = useState<ThemeId>("night");
  const [membership, setMembership] = useState<Membership>(EMPTY_MEMBERSHIP);
  const [track, setTrackState] = useState<TrackId | null>(null);
  const [tool, setTool] = useState<ToolId | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [vibe, setVibeState] = useState<Vibe>(EMPTY_VIBE);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeChatId, setActiveChatId] = useState("");
  const [timer, setTimer] = useState<Timer>({ status: "idle" });
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [stash, setStash] = useState<StashBook>(emptyBook());
  const [soundOn, setSoundOn] = useState(true);
  const [journalPrefill, setJournalPrefill] = useState(false);
  const [pending, setPending] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [hydrated, setHydrated] = useState(false);
  const sendGen = useRef(0);
  const stashSettled = useRef(false);
  const { user, isPending } = useCurrentUserState();
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!hydrated || isPending || !userId) return;
    let cancel = false;
    void (async () => {
      const params = new URLSearchParams(window.location.search);
      const checkout = params.get("premium");
      if (checkout?.startsWith("cs_")) {
        const confirmed = await confirmCheckout({ data: checkout }).catch(() => null);
        if (!cancel && confirmed?.ok) setMembership(confirmed.membership);
        params.delete("premium");
        const next = params.toString();
        window.history.replaceState(null, "", `${window.location.pathname}${next ? `?${next}` : ""}`);
        if (confirmed?.ok) return;
      }
      const loaded = await getMembership().catch(() => null);
      if (!cancel && loaded) setMembership(loaded);
    })();
    return () => {
      cancel = true;
    };
  }, [hydrated, isPending, userId]);

  useEffect(() => {
    if (track && !tierAtLeast(membership.tier, "cloud")) {
      stopMusic();
      setTrackState(null);
    }
  }, [track, membership.tier]);

  useEffect(() => {
    setAgeState(readJson<Age>(KEYS.age, "unknown"));
    setSession(readJson<Session | null>(KEYS.session, null));
    setVibeState({ ...EMPTY_VIBE, ...readJson<Partial<Vibe>>(KEYS.vibe, {}) });
    const savedThreads = readJson<unknown>(KEYS.threads, null);
    const legacy = readJson<ChatMessage[]>(KEYS.chat, []);
    const loaded = Array.isArray(savedThreads) ? savedThreads.flatMap((item) => cleanThread(item) ?? []) : [];
    if (loaded.length > 0) {
      setThreads(loaded);
      setActiveChatId(loaded[0].id);
    } else if (legacy.length > 0) {
      const first = legacy.find((msg) => msg.role === "user");
      const thread: ChatThread = {
        id: crypto.randomUUID(),
        title: first ? titleFrom(first.text) : "New chat",
        renamed: false,
        updatedAt: Date.now(),
        messages: legacy.slice(-60),
      };
      setThreads([thread]);
      setActiveChatId(thread.id);
    } else {
      const thread = blankThread();
      setThreads([thread]);
      setActiveChatId(thread.id);
    }
    setTimer(hydrateTimer(readJson<Timer | null>(KEYS.timer, null)));
    const savedJournal = readJson<unknown>(KEYS.journal, []);
    setJournal(
      Array.isArray(savedJournal)
        ? (savedJournal as JournalEntry[]).slice(0, 200).map((entry) => ({
            ...entry,
            strain: typeof entry.strain === "string" ? entry.strain : "",
            note: typeof entry.note === "string" ? entry.note : "",
          }))
        : [],
    );
    setStash(cleanBook(readJson<unknown>(KEYS.stash, null)));
    const savedSound = readJson<boolean>(KEYS.sound, true);
    setSoundEnabled(savedSound);
    setSoundOn(savedSound);
    const savedTheme = readJson<unknown>(KEYS.theme, "night");
    setThemeState(isThemeId(savedTheme) ? savedTheme : "night");
    setHydrated(true);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const root = document.documentElement;
    if (membership.accent && tierAtLeast(membership.tier, "lit")) root.style.setProperty("--color-accent", membership.accent);
    else root.style.removeProperty("--color-accent");
  }, [theme, membership.accent, membership.tier]);

  useEffect(() => {
    if (!hydrated || stashSettled.current) return;
    stashSettled.current = true;
    setStash((book) => settleBook(book, session));
  }, [hydrated, session]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (timer.status === "running" && timer.endsAt <= now) {
      setTimer({ status: "done", total: timer.total });
      playDone();
    }
  }, [now, timer]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEYS.age, JSON.stringify(age));
  }, [age, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEYS.session, JSON.stringify(session));
  }, [session, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEYS.vibe, JSON.stringify(vibe));
  }, [vibe, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEYS.threads, JSON.stringify(threads.slice(0, 40)));
  }, [threads, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEYS.timer, JSON.stringify(timer));
  }, [timer, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEYS.journal, JSON.stringify(journal.slice(0, 200)));
  }, [journal, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEYS.stash, JSON.stringify(stash));
  }, [stash, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEYS.sound, JSON.stringify(soundOn));
    setSoundEnabled(soundOn);
  }, [soundOn, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEYS.theme, JSON.stringify(theme));
  }, [theme, hydrated]);

  const setAge = useCallback((next: Age) => setAgeState(next), []);
  const setTab = useCallback((next: Tab) => {
    setTabState(next);
    setSettingsOpen(false);
  }, []);
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const setTheme = useCallback(
    (next: ThemeId) => {
      const locked = (next === "velvet" || next === "grove" || next === "hours") && !tierAtLeast(membership.tier, "lit");
      if (locked) return;
      setThemeState(next);
    },
    [membership.tier],
  );
  const buyTier = useCallback(async (next: "lit" | "cloud") => {
    const result = await startCheckout({ data: next }).catch(() => null);
    if (result?.ok && result.url) {
      window.location.assign(result.url);
      return "sent" as const;
    }
    return result && !result.ok ? ("closed" as const) : ("failed" as const);
  }, []);
  const tryTier = useCallback(async (next: Tier) => {
    const result = await grantPreviewTier({ data: next }).catch(() => null);
    if (result?.ok) setMembership(result.membership);
  }, []);
  const setPersona = useCallback(
    (persona: PersonaId) => {
      if (!isPersonaId(persona)) return;
      void saveLook({ data: { persona, accent: membership.accent } })
        .then((result) => {
          if (result.ok) setMembership(result.membership);
        })
        .catch(() => undefined);
    },
    [membership.accent],
  );
  const setAccent = useCallback(
    (accent: string) => {
      void saveLook({ data: { persona: membership.persona, accent } })
        .then((result) => {
          if (result.ok) setMembership(result.membership);
        })
        .catch(() => undefined);
    },
    [membership.persona],
  );
  const makeCustom = useCallback(async (prompt: string, accent: string) => {
    const result = await makeMine({ data: { prompt, accent } }).catch(() => null);
    if (result?.ok) setMembership(result.membership);
  }, []);
  const saveCurrentPlan = useCallback(async (title: string, body: string) => {
    const result = await savePlan({ data: { title, body } }).catch(() => null);
    if (result?.ok) {
      setMembership(result.membership);
      return "saved" as const;
    }
    return result && "error" in result && result.error === "limit" ? ("limit" as const) : ("failed" as const);
  }, []);
  const deleteSavedPlan = useCallback((id: string) => {
    void removePlan({ data: id })
      .then((result) => {
        if (result.ok) setMembership(result.membership);
      })
      .catch(() => undefined);
  }, []);
  const setTrack = useCallback(
    (next: TrackId | null) => {
      if (!next) {
        stopMusic();
        setTrackState(null);
        return;
      }
      if (!tierAtLeast(membership.tier, "cloud")) return;
      playTrack(next);
      setTrackState(next);
    },
    [membership.tier],
  );
  const saveSession = useCallback((next: Session) => {
    setSession(next);
    setStash((book) => settleBook(book, next));
  }, []);
  const clearSession = useCallback(() => {
    setSession(null);
    setStash((book) => settleBook(book, null));
  }, []);
  const setVibe = useCallback(<K extends keyof Vibe>(key: K, value: Vibe[K]) => {
    setVibeState((prev) => ({ ...prev, [key]: value }));
  }, []);
  const openTool = useCallback((next: ToolId) => {
    setTool(next);
    setTab("tools");
  }, []);
  const closeTool = useCallback(() => setTool(null), []);

  const messages = threads.find((thread) => thread.id === activeChatId)?.messages ?? [];

  useEffect(() => {
    if (!hydrated || isPending || !userId) return;
    let cancel = false;
    void (async () => {
      const remote = await pullChats().catch(() => null);
      if (cancel || !remote) return;
      setThreads((local) => {
        const merged = mergeThreads(local, remote);
        for (const thread of merged) {
          const server = remote.find((item) => item.id === thread.id);
          if (thread.messages.length === 0 && !thread.renamed) continue;
          if (!server || server.updatedAt < thread.updatedAt) void saveChat({ data: thread }).catch(() => {});
        }
        return merged;
      });
    })();
    return () => {
      cancel = true;
    };
  }, [hydrated, isPending, userId]);

  useEffect(() => {
    if (!hydrated || !userId) return;
    const thread = threads.find((item) => item.id === activeChatId);
    if (!thread || (thread.messages.length === 0 && !thread.renamed)) return;
    const handle = window.setTimeout(() => {
      void saveChat({ data: thread }).catch(() => {});
    }, 500);
    return () => window.clearTimeout(handle);
  }, [threads, activeChatId, hydrated, userId]);

  const clearChat = useCallback(() => {
    sendGen.current += 1;
    setPending(false);
    setThreads((list) =>
      list.map((thread) =>
        thread.id === activeChatId
          ? { ...thread, messages: [], title: thread.renamed ? thread.title : "New chat", updatedAt: Date.now() }
          : thread,
      ),
    );
  }, [activeChatId]);

  const newChat = useCallback(() => {
    const current = threads.find((thread) => thread.id === activeChatId);
    if (current && current.messages.length === 0) return;
    const fresh = blankThread();
    setThreads((list) => [fresh, ...list].slice(0, 40));
    setActiveChatId(fresh.id);
    setPending(false);
  }, [threads, activeChatId]);

  const openChat = useCallback((id: string) => {
    setActiveChatId(id);
    setPending(false);
  }, []);

  const renameChat = useCallback((id: string, title: string) => {
    const next = title.trim().slice(0, 60);
    if (!next) return;
    setThreads((list) =>
      list.map((thread) => (thread.id === id ? { ...thread, title: next, renamed: true, updatedAt: Date.now() } : thread)),
    );
  }, []);

  const deleteChat = useCallback(
    (id: string) => {
      sendGen.current += 1;
      setPending(false);
      setThreads((list) => {
        const rest = list.filter((thread) => thread.id !== id);
        if (rest.length === 0) {
          const fresh = blankThread();
          if (id === activeChatId) setActiveChatId(fresh.id);
          return [fresh];
        }
        if (id === activeChatId) setActiveChatId(rest[0].id);
        return rest;
      });
      if (userId) void removeChat({ data: id }).catch(() => {});
    },
    [activeChatId, userId],
  );

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || pending) return;
      const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", text: trimmed };
      const prior = threads.find((thread) => thread.id === activeChatId)?.messages ?? [];
      const chatId = activeChatId;
      const gen = ++sendGen.current;
      setThreads((list) =>
        list.map((thread) => {
          if (thread.id !== chatId) return thread;
          const hasUser = thread.messages.some((msg) => msg.role === "user");
          return {
            ...thread,
            title: thread.renamed || hasUser ? thread.title : titleFrom(trimmed),
            updatedAt: Date.now(),
            messages: [...thread.messages, userMsg].slice(-60),
          };
        }),
      );
      setPending(true);
      const direct = directAnswer(trimmed);
      const local = replyTo(trimmed, session, prior);
      void (async () => {
        const reply =
          direct ??
          (local.safety ? local : ((await askBuddy({ message: trimmed, history: prior, session }).catch(() => null)) ?? local));
        if (sendGen.current !== gen) return;
        setThreads((list) =>
          list.map((thread) =>
            thread.id === chatId
              ? {
                  ...thread,
                  updatedAt: Date.now(),
                  messages: [
                    ...thread.messages,
                    { id: crypto.randomUUID(), role: "bud" as const, text: reply.text, action: reply.action, safety: reply.safety },
                  ].slice(-60),
                }
              : thread,
          ),
        );
        setPending(false);
      })();
    },
    [threads, pending, session, activeChatId],
  );

  const startTimer = useCallback((minutes: number) => {
    const safe = Math.max(1, Math.min(720, Math.round(minutes)));
    const total = safe * 60;
    primeAudio();
    playStart();
    setTimer({ status: "running", endsAt: Date.now() + total * 1000, total });
  }, []);

  const startFromSession = useCallback((): "started" | "already" | "need-session" | "future" => {
    if (!session) return "need-session";
    const wait = waitMinutesFor(session);
    if (!session.timeTaken) {
      startTimer(wait);
      return "started";
    }
    const since = minutesSince(session.timeTaken);
    if (!since) {
      startTimer(wait);
      return "started";
    }
    if (since.future) return "future";
    if (since.minutes >= wait) {
      setTimer({ status: "done", total: wait * 60 });
      return "already";
    }
    startTimer(wait - since.minutes);
    return "started";
  }, [session, startTimer]);

  const pauseTimer = useCallback(() => {
    playPause();
    setTimer((cur) => {
      if (cur.status !== "running") return cur;
      const remaining = Math.max(0, Math.ceil((cur.endsAt - Date.now()) / 1000));
      return { status: "paused", remaining, total: cur.total };
    });
  }, []);

  const resumeTimer = useCallback(() => {
    primeAudio();
    playStart();
    setTimer((cur) => {
      if (cur.status !== "paused") return cur;
      return { status: "running", endsAt: Date.now() + cur.remaining * 1000, total: cur.total };
    });
  }, []);

  const resetTimer = useCallback(() => setTimer({ status: "idle" }), []);

  const addJournal = useCallback((entry: Omit<JournalEntry, "id">) => {
    const next: JournalEntry = {
      ...entry,
      id: crypto.randomUUID(),
      note: entry.note.slice(0, 280),
      strain: entry.strain.trim().slice(0, 60),
    };
    setJournal((list) => [next, ...list].slice(0, 200));
  }, []);
  const removeJournal = useCallback((id: string) => {
    setJournal((list) => list.filter((entry) => entry.id !== id));
  }, []);
  const openLogFromSession = useCallback(() => {
    setJournalPrefill(true);
    setTab("log");
  }, []);
  const clearJournalPrefill = useCallback(() => setJournalPrefill(false), []);

  const toggleSound = useCallback(() => {
    primeAudio();
    setSoundOn((on) => !on);
  }, []);
  const setSound = useCallback((on: boolean) => {
    if (on) primeAudio();
    setSoundOn(on);
  }, []);
  const resetPhone = useCallback(() => {
    sendGen.current += 1;
    const fresh = blankThread();
    setSession(null);
    setStash(emptyBook());
    setThreads([fresh]);
    setActiveChatId(fresh.id);
    setPending(false);
    setTimer({ status: "idle" });
    setVibeState(EMPTY_VIBE);
    setJournal([]);
    setJournalPrefill(false);
    if (userId) void wipeChats().catch(() => {});
  }, [userId]);
  const adjustStash = useCallback(
    (method: JarId, delta: number) => {
      setStash((book) => adjustBook(book, method, delta, session));
    },
    [session],
  );

  const remainingSec = useMemo(() => {
    if (timer.status === "running") return Math.max(0, Math.ceil((timer.endsAt - now) / 1000));
    if (timer.status === "paused") return timer.remaining;
    return null;
  }, [timer, now]);

  const timerNote = timerNoteFor(
    timer.status,
    remainingSec === null ? null : formatShort(remainingSec),
  );

  useEffect(() => {
    if (!hydrated) return;
    const base = "Stoner Bud-E";
    if (timer.status === "running" && remainingSec !== null) document.title = `${formatDuration(remainingSec)} · Bud-E`;
    else if (timer.status === "done") document.title = "Time's up · Bud-E";
    else document.title = base;
  }, [hydrated, timer.status, remainingSec]);

  const value: Ctx = {
    age,
    setAge,
    tab,
    setTab,
    tool,
    openTool,
    closeTool,
    session,
    saveSession,
    clearSession,
    vibe,
    setVibe,
    messages,
    threads,
    activeChatId,
    accountChats: Boolean(userId),
    pending,
    send,
    clearChat,
    newChat,
    openChat,
    renameChat,
    deleteChat,
    timer,
    remainingSec,
    timerNote,
    startTimer,
    startFromSession,
    pauseTimer,
    resumeTimer,
    resetTimer,
    now,
    journal,
    addJournal,
    removeJournal,
    journalPrefill,
    openLogFromSession,
    clearJournalPrefill,
    stash,
    adjustStash,
    soundOn,
    toggleSound,
    setSound,
    theme,
    setTheme,
    tier: membership.tier,
    shopOpen: membership.shop,
    previewTiers: membership.preview,
    buyTier,
    tryTier,
    persona: membership.persona,
    customName: membership.customName,
    customVoice: membership.customVoice,
    accent: membership.accent,
    themeName: membership.themeName,
    setPersona,
    setAccent,
    makeCustom,
    savedPlans: membership.plans,
    saveCurrentPlan,
    deleteSavedPlan,
    track,
    setTrack,
    settingsOpen,
    openSettings,
    closeSettings,
    resetPhone,
  };

  return <BudeContext.Provider value={value}>{children}</BudeContext.Provider>;
}

function cleanBook(raw: unknown): StashBook {
  const book = emptyBook();
  if (!raw || typeof raw !== "object") return book;
  const row = raw as Partial<StashBook>;
  if (row.jars && typeof row.jars === "object") {
    for (const id of Object.keys(book.jars) as JarId[]) {
      const amount = (row.jars as Partial<Record<JarId, unknown>>)[id];
      if (typeof amount === "number" && Number.isFinite(amount) && amount > 0) book.jars[id] = amount;
    }
  }
  const held = row.held;
  if (held && typeof held === "object" && "method" in held && "taken" in held && "want" in held) {
    const method = String(held.method);
    const taken = Number(held.taken);
    const want = Number(held.want);
    if (
      (Object.keys(book.jars) as string[]).includes(method) &&
      Number.isFinite(taken) &&
      Number.isFinite(want) &&
      taken >= 0 &&
      want > 0
    ) {
      book.held = { method: method as JarId, taken, want };
    }
  }
  return book;
}

function formatShort(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export function useBude() {
  const ctx = useContext(BudeContext);
  if (!ctx) throw new Error("useBude outside provider");
  return ctx;
}
