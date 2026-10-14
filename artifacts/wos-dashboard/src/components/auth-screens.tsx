import type { ReactNode } from "react";
import { Link } from "wouter";
import { useClerk } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { LogIn, LogOut, ShieldAlert, RotateCw } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const logoSrc = `${basePath}/logo.svg`;

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-[100dvh] bg-background text-foreground flex items-center justify-center px-4 overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
      <div className="relative w-full max-w-sm">{children}</div>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 mb-8">
      <img src={logoSrc} alt="" className="w-10 h-10" />
      <div>
        <div className="font-bold tracking-wider text-sm">COMMAND CENTER</div>
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">Whiteout Survival</div>
      </div>
    </div>
  );
}

export function useSignOutClean() {
  const { signOut } = useClerk();
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut({ redirectUrl: basePath || "/" });
  };
}

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  const signOut = useSignOutClean();
  return (
    <button
      type="button"
      onClick={() => void signOut()}
      title="Sign out"
      aria-label="Sign out"
      className={
        compact
          ? "shrink-0 h-9 w-9 inline-flex items-center justify-center rounded border border-transparent text-muted-foreground hover:text-foreground hover:border-border transition-colors"
          : "w-full h-10 inline-flex items-center justify-center gap-2 rounded border border-border bg-card/60 text-sm font-semibold tracking-wide uppercase text-xs hover:border-primary/50 hover:text-primary transition-colors"
      }
    >
      <LogOut className="w-4 h-4" />
      {!compact && <span>Sign out</span>}
    </button>
  );
}

export function PublicEntry() {
  return (
    <Shell>
      <Brand />
      <h2 className="text-2xl font-bold tracking-tight mb-2">Private ops board.</h2>
      <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
        Roster, bear trap formations, inventory and goals for one chief. Sign in to continue.
      </p>
      <Link
        href="/sign-in"
        className="w-full h-11 inline-flex items-center justify-center gap-2 rounded bg-primary text-primary-foreground font-semibold uppercase tracking-wider text-xs hover:bg-primary/90 transition-colors"
      >
        <LogIn className="w-4 h-4" /> Sign in
      </Link>
    </Shell>
  );
}

export function AuthLoading({ label = "Checking clearance" }: { label?: string }) {
  return (
    <Shell>
      <Brand />
      <div className="space-y-3">
        <div className="h-2 w-2/3 rounded bg-muted animate-pulse" />
        <div className="h-2 w-1/2 rounded bg-muted animate-pulse" />
      </div>
      <p className="mt-6 text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
    </Shell>
  );
}

export function AccessDenied({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Shell>
      <Brand />
      <div className="flex items-center gap-2 text-destructive mb-3">
        <ShieldAlert className="w-5 h-5" />
        <h2 className="font-bold tracking-wide">{title}</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-8 leading-relaxed">{message}</p>
      <div className="space-y-2">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="w-full h-10 inline-flex items-center justify-center gap-2 rounded bg-primary text-primary-foreground font-semibold uppercase tracking-wider text-xs hover:bg-primary/90 transition-colors"
          >
            <RotateCw className="w-4 h-4" /> Retry
          </button>
        )}
        <SignOutButton />
      </div>
    </Shell>
  );
}
