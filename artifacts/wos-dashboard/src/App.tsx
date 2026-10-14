import { useEffect, useRef, useState } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk } from "@clerk/react";
import { dark } from "@clerk/themes";
import { PublicEntry, AuthLoading, AccessDenied, SignOutButton } from "./components/auth-screens";
import { DashboardErrorBoundary } from "./components/dashboard-error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Crosshair, Package, Target, CalendarDays, NotebookText, UserCircle, Trophy } from "lucide-react";
import NotFound from "@/pages/not-found";
import { MathKeyboardToolbar } from "./components/math-keyboard-toolbar";

import DataTab from "./pages/data-tab";
import BearTrapTab from "./pages/bear-trap-tab";
import ResourcesTab from "./pages/resources-tab";
import GoalsTab from "./pages/goals-tab";
import CalendarTab from "./pages/calendar-tab";
import NotesTab from "./pages/notes-tab";
import ProfileTab from "./pages/profile-tab";
import AtlasTab from "./pages/atlas-tab";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: 'always',  // always re-fetch when a tab mounts so cross-tab data stays in sync
      staleTime: 0,
    }
  }
});

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: dark,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(195 85% 55%)",
    colorForeground: "hsl(210 20% 90%)",
    colorMutedForeground: "hsl(215 15% 65%)",
    colorDanger: "hsl(0 84% 60%)",
    colorBackground: "hsl(220 25% 10%)",
    colorInput: "hsl(220 30% 6%)",
    colorInputForeground: "hsl(210 20% 90%)",
    colorNeutral: "hsl(210 20% 90%)",
    fontFamily: "'Inter', sans-serif",
    borderRadius: "0.15rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[hsl(220_25%_10%)] border border-[hsl(215_25%_15%)] rounded-sm w-[420px] max-w-full overflow-hidden shadow-xl shadow-black/50",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[hsl(210_20%_90%)] font-bold tracking-wider uppercase text-base",
    headerSubtitle: "text-[hsl(215_15%_65%)]",
    socialButtonsBlockButtonText: "text-[hsl(210_20%_90%)] font-medium",
    formFieldLabel: "text-[hsl(210_20%_90%)] text-xs uppercase tracking-wide",
    footerActionLink: "text-[hsl(195_85%_55%)] hover:text-[hsl(195_85%_65%)]",
    footerActionText: "text-[hsl(215_15%_65%)]",
    dividerText: "text-[hsl(215_15%_65%)]",
    identityPreviewEditButton: "text-[hsl(195_85%_55%)]",
    formFieldSuccessText: "text-[hsl(150_70%_50%)]",
    alertText: "text-[hsl(210_20%_90%)]",
    logoBox: "h-10",
    logoImage: "h-10 w-10",
    socialButtonsBlockButton: "border border-[hsl(215_25%_15%)] bg-[hsl(220_30%_6%)] hover:bg-[hsl(215_25%_15%)]",
    formButtonPrimary: "bg-[hsl(195_85%_55%)] text-[hsl(220_30%_6%)] hover:bg-[hsl(195_85%_48%)] uppercase tracking-wider text-xs font-semibold",
    formFieldInput: "bg-[hsl(220_30%_6%)] border border-[hsl(215_25%_15%)] text-[hsl(210_20%_90%)]",
    footerAction: "bg-transparent",
    dividerLine: "bg-[hsl(215_25%_15%)]",
    alert: "bg-[hsl(0_84%_60%/0.1)] border border-[hsl(0_84%_60%/0.3)]",
    otpCodeFieldInput: "bg-[hsl(220_30%_6%)] border border-[hsl(215_25%_15%)] text-[hsl(210_20%_90%)]",
    formFieldRow: "gap-3",
    main: "gap-5",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn oauthFlow="redirect" routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp oauthFlow="redirect" routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        void qc.cancelQueries().then(() => qc.clear());
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

type AccessError = { status: number; message: string };

async function fetchAccess(): Promise<{ authorized: true }> {
  const res = await fetch(`${basePath}/api/auth/access`, { credentials: "include" });
  if (res.ok) return res.json();
  let message = "";
  try {
    const body = await res.json();
    message = typeof body?.error === "string" ? body.error : "";
  } catch {
    /* ignore */
  }
  throw { status: res.status, message } satisfies AccessError;
}

function isUnauthorizedError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { status?: unknown; message?: unknown };
  if (e.status === 401) return true;
  return typeof e.message === "string" && /\b401\b/.test(e.message);
}

function AccessGate({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { userId: liveUserId } = useAuth();
  const [expired, setExpired] = useState(false);

  const access = useQuery({
    queryKey: ["auth-access", userId],
    queryFn: fetchAccess,
    enabled: !!userId,
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });

  // Session expiry: any private 401 unmounts the dashboard and drops cached data.
  useEffect(() => {
    const handle = (err: unknown, key?: readonly unknown[]) => {
      if (key && key[0] === "auth-access") return;
      if (!isUnauthorizedError(err)) return;
      setExpired(true);
      void qc.cancelQueries().then(() => qc.clear());
    };
    const unsubQ = qc.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.action.type === "error") {
        handle(event.action.error, event.query.queryKey);
      }
    });
    const unsubM = qc.getMutationCache().subscribe((event) => {
      if (event.type === "updated" && event.action.type === "error") {
        handle(event.action.error);
      }
    });
    return () => {
      unsubQ();
      unsubM();
    };
  }, [qc]);

  // Immediate guard: identity changed under us, never render private UI.
  if (liveUserId !== userId) return <AuthLoading />;

  if (expired) {
    return (
      <AccessDenied
        title="Session expired"
        message="Your session ended. Sign in again to reopen the board."
        onRetry={() => {
          setExpired(false);
          void qc.resetQueries({ queryKey: ["auth-access", userId] });
        }}
      />
    );
  }

  if (access.isPending) return <AuthLoading />;

  if (access.isError) {
    const err = access.error as unknown as AccessError;
    if (err?.status === 403) {
      return (
        <AccessDenied
          title="Access denied"
          message={err.message || "This dashboard is private. Sign out and use the owner account."}
        />
      );
    }
    if (err?.status === 401) {
      return (
        <AccessDenied
          title="Sign in required"
          message={err.message || "Your session could not be verified."}
          onRetry={() => void access.refetch()}
        />
      );
    }
    return (
      <AccessDenied
        title="Unavailable"
        message={err?.message || "Access check failed. The server may not be configured yet."}
        onRetry={() => void access.refetch()}
      />
    );
  }

  if (access.data?.authorized !== true) return <AuthLoading />;

  return (
    <DashboardErrorBoundary>
      <DashboardLayout />
    </DashboardErrorBoundary>
  );
}

function AppGate() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  if (!isLoaded) return <AuthLoading label="Loading" />;
  if (!isSignedIn || !userId) return <PublicEntry />;
  return <AccessGate key={userId} userId={userId} />;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      signInFallbackRedirectUrl={basePath || "/"}
      signUpFallbackRedirectUrl={basePath || "/"}
      afterSignOutUrl={basePath || "/"}
      localization={{
        signIn: {
          start: {
            title: "Command Center",
            subtitle: "Owner sign-in",
          },
        },
        signUp: {
          start: {
            title: "Owner setup",
            subtitle: "Create the owner account",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route component={AppGate} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function DashboardLayout() {
  const [location, setLocation] = useLocation();

  const handleTabChange = (value: string) => {
    setLocation(value);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border/80 bg-background/80 backdrop-blur-md sticky top-0 z-10 shadow-sm shadow-black/50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/30 shadow-[0_0_10px_rgba(var(--color-primary),0.2)]">
              WS
            </div>
            <h1 className="font-bold text-lg tracking-wider text-foreground hidden sm:block">COMMAND CENTER</h1>
          </div>
          
          <Tabs value={location} onValueChange={handleTabChange} className="w-auto flex-1 sm:flex-none overflow-x-auto scrollbar-hide">
            <TabsList className="bg-card/50 border border-border/80 h-10 w-full justify-start sm:justify-center">
              <TabsTrigger value="/" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-4 shrink-0">
                <Activity className="w-4 h-4" /> <span className="hidden md:inline font-semibold tracking-wide text-xs uppercase">Roster</span>
              </TabsTrigger>
              <TabsTrigger value="/bear-trap" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-4 shrink-0">
                <Crosshair className="w-4 h-4" /> <span className="hidden md:inline font-semibold tracking-wide text-xs uppercase">Bear Trap</span>
              </TabsTrigger>
              <TabsTrigger value="/resources" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-4 shrink-0">
                <Package className="w-4 h-4" /> <span className="hidden md:inline font-semibold tracking-wide text-xs uppercase">Inventory</span>
              </TabsTrigger>
              <TabsTrigger value="/goals" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-4 shrink-0">
                <Target className="w-4 h-4" /> <span className="hidden md:inline font-semibold tracking-wide text-xs uppercase">Goals</span>
              </TabsTrigger>
              <TabsTrigger value="/calendar" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-4 shrink-0">
                <CalendarDays className="w-4 h-4" /> <span className="hidden md:inline font-semibold tracking-wide text-xs uppercase">Calendar</span>
              </TabsTrigger>
              <TabsTrigger value="/notes" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-4 shrink-0">
                <NotebookText className="w-4 h-4" /> <span className="hidden md:inline font-semibold tracking-wide text-xs uppercase">Notes</span>
              </TabsTrigger>
              <TabsTrigger value="/profile" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-4 shrink-0">
                <UserCircle className="w-4 h-4" /> <span className="hidden md:inline font-semibold tracking-wide text-xs uppercase">My Profile</span>
              </TabsTrigger>
              <TabsTrigger value="/atlas" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-4 shrink-0">
                <Trophy className="w-4 h-4" /> <span className="hidden md:inline font-semibold tracking-wide text-xs uppercase">Atlas</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <SignOutButton compact />
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <Switch>
          <Route path="/" component={DataTab} />
          <Route path="/bear-trap" component={BearTrapTab} />
          <Route path="/resources" component={ResourcesTab} />
          <Route path="/goals" component={GoalsTab} />
          <Route path="/calendar" component={CalendarTab} />
          <Route path="/notes" component={NotesTab} />
          <Route path="/profile" component={ProfileTab} />
          <Route path="/atlas" component={AtlasTab} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <MathKeyboardToolbar />
    </div>
  );
}

function App() {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.add('dark');
  }

  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
