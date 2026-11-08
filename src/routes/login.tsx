import { createFileRoute, Navigate } from "@tanstack/react-router";
import { authEnabled } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { AccountScreen, AccountSplash } from "@/components/bude/account";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  return (
    <div className="min-h-dvh bg-bg">
      <div className="garden-glow pointer-events-none fixed inset-x-0 top-0 h-80" />
      <div className="relative mx-auto flex h-dvh w-full max-w-md flex-col border-line bg-surface md:border-x">
        {isPending ? (
          <AccountSplash />
        ) : user && authEnabled ? (
          <Navigate to="/" />
        ) : (
          <AccountScreen />
        )}
      </div>
    </div>
  );
}
