import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

type Mode = "in" | "up";

function friendly(error: { message?: string; code?: string } | null): string {
  const code = error?.code ?? "";
  if (code.includes("USER_ALREADY_EXISTS")) return "That email already has an account. Sign in instead.";
  if (code === "INVALID_EMAIL_OR_PASSWORD") return "That email and password don't match.";
  if (code === "PASSWORD_TOO_SHORT") return "Use at least 8 characters.";
  return error?.message || "That didn't work. Try again.";
}

export function AccountScreen() {
  const [mode, setMode] = useState<Mode>("up");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const creating = mode === "up";

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (creating && name.trim().length < 1) {
      setError("Add your name.");
      return;
    }
    if (!email.includes("@")) {
      setError("That email doesn't look right.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    setBusy(true);
    const result = creating
      ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })
      : await authClient.signIn.email({ email: email.trim(), password });
    setBusy(false);
    if (result.error) setError(friendly(result.error));
  }

  return (
    <main className="flex h-full flex-col overflow-y-auto px-6 py-8">
      <p className="text-xs font-semibold tracking-[0.22em] text-accent uppercase">21+ account</p>
      <h1 className="mt-3 font-display text-5xl leading-none font-medium italic">
        {creating ? "Create account" : "Sign in"}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Your log and stash stay on this phone. The account is how Bud-E knows it's you.
      </p>
      <form className="mt-6 space-y-3" onSubmit={(event) => void submit(event)}>
        {creating && (
          <label className="block text-sm font-semibold">
            Name
            <input
              aria-label="Name"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-2xl border border-line bg-surface px-3 text-base font-normal outline-none focus:border-accent"
            />
          </label>
        )}
        <label className="block text-sm font-semibold">
          Email
          <input
            aria-label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 min-h-12 w-full rounded-2xl border border-line bg-surface px-3 text-base font-normal outline-none focus:border-accent"
          />
        </label>
        <div>
          <label htmlFor="account-password" className="block text-sm font-semibold">
            Password
          </label>
          <div className="relative mt-2">
            <input
              id="account-password"
              aria-label="Password"
              type={showPassword ? "text" : "password"}
              autoComplete={creating ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="min-h-12 w-full rounded-2xl border border-line bg-surface py-3 pr-20 pl-3 text-base font-normal outline-none focus:border-accent"
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute top-1/2 right-1.5 min-h-9 -translate-y-1/2 rounded-xl px-3 text-xs font-semibold tracking-wide text-accent uppercase"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button className="w-full" type="submit" disabled={busy}>
          {busy ? "One moment" : creating ? "Create account" : "Sign in"}
        </Button>
      </form>
      <button
        type="button"
        className="mt-4 min-h-11 text-sm font-semibold text-muted"
        onClick={() => {
          setMode(creating ? "in" : "up");
          setError(null);
        }}
      >
        {creating ? "Already have an account? Sign in" : "New here? Create an account"}
      </button>
    </main>
  );
}

export function AccountSplash() {
  return (
    <main className="flex flex-1 items-center justify-center">
      <p className="font-display text-4xl italic text-muted">Bud-E</p>
    </main>
  );
}
