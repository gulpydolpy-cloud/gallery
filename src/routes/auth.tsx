import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { signInWithIdentifier } from "@/lib/auth.functions";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Log in or sign up — Gallery" },
      { name: "description", content: "Create a Gallery account or log in to like, comment, upload and chat." },
      { property: "og:title", content: "Log in or sign up — Gallery" },
      { property: "og:description", content: "Create a Gallery account or log in to like, comment, upload and chat." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const login = useServerFn(signInWithIdentifier);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/", replace: true });
  }, [user, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const res = await login({ data: { identifier, password } });
        if (res.error || !res.session) {
          toast.error(res.error ?? "Could not log in");
          return;
        }
        const { error } = await supabase.auth.setSession(res.session);
        if (error) toast.error(error.message);
        else navigate({ to: "/", replace: true });
      } else {
        if (!/^[a-zA-Z0-9_.]{3,24}$/.test(username)) {
          toast.error("Username: 3-24 letters, numbers, dots or underscores");
          return;
        }
        const { data: taken } = await supabase.from("profiles").select("id").ilike("username", username).maybeSingle();
        if (taken) {
          toast.error("That username is taken");
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username, display_name: username }, emailRedirectTo: window.location.origin },
        });
        if (error) toast.error(error.message);
        else {
          toast.success("Welcome to Gallery!");
          navigate({ to: "/", replace: true });
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex items-center justify-between px-6 py-4">
        <Logo />
        <ThemeToggle />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5 animate-fade-up">
          <div className="text-center">
            <h1 className="text-2xl font-extrabold tracking-tight">
              {mode === "login" ? "Log in to Gallery" : "Sign up for Gallery"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "login" ? "Use your username or email." : "Pick a username people can find you by."}
            </p>
          </div>

          {mode === "login" ? (
            <div className="space-y-2">
              <Label htmlFor="identifier">Username or email</Label>
              <Input id="identifier" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required autoComplete="username" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>
          <Button type="submit" variant="rose" className="h-11 w-full text-base" disabled={busy}>
            {busy ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button type="button" className="font-semibold text-rose" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
              {mode === "login" ? "Sign up" : "Log in"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
