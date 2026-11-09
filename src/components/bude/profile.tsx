import { useEffect, useState, useSyncExternalStore } from "react";
import { authClient, authEnabled, signOut } from "@/lib/auth/client";
import { hasGateSessionMarker } from "@/lib/auth/gate-session-marker";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { Card } from "./bits";
import { useBude } from "./provider";

const subscribeToNothing = () => () => {};
const noGateOnServer = () => false;

export function ProfilePanel() {
  const user = useCurrentUser();
  const { journal, stash, openSettings } = useBude();
  const gate = useSyncExternalStore(subscribeToNothing, hasGateSessionMarker, noGateOnServer);
  const savedName = user?.displayName?.trim() || "";
  const [name, setName] = useState(savedName);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const canEdit = Boolean(user && !user.isDevFallback && authEnabled);
  const canSignOut = canEdit && !gate;
  const nights = journal.length;
  const stocked = Object.values(stash.jars).filter((amount) => amount > 0).length;
  const initial = (savedName || user?.primaryEmail || "B").slice(0, 1).toUpperCase();

  useEffect(() => {
    if (!editing) setName(savedName);
  }, [savedName, editing]);

  async function saveName() {
    const next = name.trim();
    if (next.length < 1) {
      setError("Add your name.");
      return;
    }
    setError(null);
    setBusy(true);
    const result = await authClient.updateUser({ name: next });
    setBusy(false);
    if (result.error) {
      setError(result.error.message || "Couldn't save that name.");
      return;
    }
    setEditing(false);
  }

  return (
    <div className="h-full overflow-y-auto px-4 pt-2 pb-8">
      <h1 className="font-display text-4xl leading-none font-medium">You</h1>
      <p className="mt-2 mb-4 text-sm text-muted">The account Bud-E uses to know it's you.</p>

      <Card>
        <div className="flex items-center gap-4">
          {user?.profileImageUrl ? (
            <img
              src={user.profileImageUrl}
              alt=""
              className="size-16 rounded-full border border-line object-cover"
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-full bg-accent font-display text-3xl text-accent-ink">
              {initial}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-display text-2xl leading-none">{savedName || "No name yet"}</p>
            <p className="mt-1 truncate text-sm text-muted">{user?.primaryEmail || "No email on this account"}</p>
          </div>
        </div>

        {canEdit && !editing && (
          <Button className="mt-4" size="sm" variant="secondary" onClick={() => setEditing(true)}>
            Edit name
          </Button>
        )}

        {canEdit && editing && (
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void saveName();
            }}
          >
            <label className="block text-sm font-semibold" htmlFor="profile-name">
              Name
              <input
                id="profile-name"
                aria-label="Name"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 min-h-12 w-full rounded-2xl border border-line bg-surface px-3 text-base font-normal outline-none focus:border-accent"
              />
            </label>
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={busy}>
                {busy ? "Saving" : "Save name"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setName(savedName);
                  setError(null);
                  setEditing(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Card>

      <Button className="mt-3 w-full" variant="secondary" onClick={openSettings}>
        Settings
      </Button>

      <Card className="mt-3">
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">On this phone</p>
        <p className="mt-3 text-sm leading-relaxed">
          {nights === 0 ? "No nights in the log yet." : nights === 1 ? "1 night in the log." : `${nights} nights in the log.`}{" "}
          {stocked === 0
            ? "The stash jars are empty."
            : stocked === 1
              ? "1 stash jar has something in it."
              : `${stocked} stash jars have something in them.`}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          The log and stash stay on this phone. Chats are saved to this account.
        </p>
      </Card>

      {gate && (
        <p className="mt-4 text-sm leading-relaxed text-muted">
          You're already signed in here, so there's no separate sign-out.
        </p>
      )}

      {canSignOut && (
        <Button
          className="mt-4 w-full"
          variant="danger"
          disabled={signingOut}
          onClick={() => {
            setSigningOut(true);
            void signOut("/").catch(() => setSigningOut(false));
          }}
        >
          {signingOut ? "Signing out" : "Sign out"}
        </Button>
      )}
    </div>
  );
}
