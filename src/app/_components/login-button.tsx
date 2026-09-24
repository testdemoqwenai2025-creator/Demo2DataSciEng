"use client";

import { useState, useSyncExternalStore } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LogIn, LogOut, Sparkles, User } from "lucide-react";

/**
 * Demo login modal — pre-filled demo credentials + an "Auto-fill & sign in"
 * button. Demo only — no real auth. State is persisted to localStorage so
 * the "logged-in" badge persists across page reloads.
 *
 * For production auth, integrate NextAuth.js (already a dependency) with
 * Azure AD / GitHub OAuth. The shape of this component would not change.
 */

const DEMO_USER = {
  username: "admin",
  password: "admin",
  name: "Admin Analyst",
  role: "Platform Administrator",
};

const STORAGE_KEY = "mdse_demo_auth";

interface AuthState {
  username: string;
  name: string;
  role: string;
  signedInAt: string;
}

/**
 * useSyncExternalStore snapshot cache.
 *
 * React requires that the getSnapshot function returns a STABLE reference
 * if the underlying data has not changed. JSON.parse() always produces a
 * new object, so naively returning it from getSnapshot causes React to
 * think the store has changed on every render —> infinite re-render loop
 * —> Next.js error boundary catches it as "Application error: a
 * client-side exception has occurred".
 *
 * We cache the parsed object keyed on the raw localStorage string so the
 * same stored value returns the same object reference across renders.
 */
let cachedRaw: string | null | undefined = undefined; // undefined = not yet read
let cachedSnapshot: AuthState | null = null;

function readStoredAuth(): AuthState | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    // Same raw string → return cached object reference (stability for useSyncExternalStore)
    if (stored === cachedRaw) return cachedSnapshot;
    cachedRaw = stored;
    cachedSnapshot = stored ? (JSON.parse(stored) as AuthState) : null;
    return cachedSnapshot;
  } catch {
    cachedRaw = null;
    cachedSnapshot = null;
    return null;
  }
}

/**
 * Mutating the store — call after writing to localStorage so the cached
 * snapshot is invalidated and useSyncExternalStore picks up the change.
 */
function writeStoredAuth(state: AuthState | null) {
  if (typeof window === "undefined") return;
  try {
    if (state === null) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
    // Invalidate cache — next getSnapshot will re-read and return a new ref
    cachedRaw = undefined;
    cachedSnapshot = null;
  } catch {
    // ignore
  }
}

// useSyncExternalStore pattern — subscribes to a noop external store so we get
// client-only initialisation without triggering setState-in-effect lint
const noopSubscribe = () => () => {};
const getStoredAuth = () => readStoredAuth();
const getServerAuth = () => null;

export function LoginButton() {
  const [open, setOpen] = useState(false);
  // Read once on client mount, falls back to null on server
  const initialAuth = useSyncExternalStore(noopSubscribe, getStoredAuth, getServerAuth);
  const [authState, setAuthState] = useState<AuthState | null>(initialAuth);
  const [username, setUsername] = useState(DEMO_USER.username);
  const [password, setPassword] = useState(DEMO_USER.password);
  const [error, setError] = useState<string | null>(null);

  const signIn = (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    // Demo auth — accept the demo credentials only
    if (username === DEMO_USER.username && password === DEMO_USER.password) {
      const state: AuthState = {
        username,
        name: DEMO_USER.name,
        role: DEMO_USER.role,
        signedInAt: new Date().toISOString(),
      };
      setAuthState(state);
      writeStoredAuth(state);
      setOpen(false);
    } else {
      setError("Invalid credentials. Use the demo account below, or click 'Auto-fill & sign in'.");
    }
  };

  const autoSignIn = () => {
    setUsername(DEMO_USER.username);
    setPassword(DEMO_USER.password);
    // Defer sign-in so the state updates visually first
    setTimeout(() => {
      const state: AuthState = {
        username: DEMO_USER.username,
        name: DEMO_USER.name,
        role: DEMO_USER.role,
        signedInAt: new Date().toISOString(),
      };
      setAuthState(state);
      writeStoredAuth(state);
      setOpen(false);
    }, 200);
  };

  const signOut = () => {
    setAuthState(null);
    writeStoredAuth(null);
  };

  if (authState) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="hidden sm:inline-flex gap-1.5">
          <User className="h-3 w-3" /> {authState.name}
        </Badge>
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={signOut}>
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <LogIn className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Sign in</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="h-4 w-4 text-primary" /> Sign in to ModernDataSciEng
          </DialogTitle>
          <DialogDescription>
            Demo authentication — no real credentials required. The full platform preview is read-only.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={signIn} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="login-username">Username</Label>
            <Input
              id="login-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              autoComplete="username"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="login-password">Password</Label>
            <Input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {error && (
            <p className="text-[11px] text-rose-600 dark:text-rose-400">{error}</p>
          )}
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1.5 w-full sm:w-auto"
              onClick={autoSignIn}
            >
              <Sparkles className="h-3.5 w-3.5" /> Auto-fill &amp; sign in
            </Button>
            <Button type="submit" size="sm" className="w-full sm:w-auto">Sign in</Button>
          </DialogFooter>
        </form>

        <div className="rounded-md border border-dashed border-border/60 p-2.5 bg-muted/20">
          <p className="text-[11px] text-muted-foreground">
            <strong className="text-foreground/80">Demo credentials (pre-filled):</strong>
            <br />
            Username: <code className="font-mono">{DEMO_USER.username}</code>
            <br />
            Password: <code className="font-mono">{DEMO_USER.password}</code>
            <br />
            Role on sign-in: <span className="font-medium">{DEMO_USER.role}</span>
          </p>
        </div>
        <p className="text-[10px] text-muted-foreground text-center">
          Production note: integrate NextAuth.js with Azure AD / GitHub OAuth. See <code className="font-mono">src/app/_components/login-button.tsx</code>.
        </p>
      </DialogContent>
    </Dialog>
  );
}
