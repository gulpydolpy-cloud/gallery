import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Compass, Home, MessageCircle, PlusSquare, Radio, Shield, User, Users, LogOut, Settings, LogIn } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const navBase =
  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold text-foreground/80 transition-colors hover:bg-accent hover:text-foreground";
const navActive = "text-rose hover:text-rose";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, profile, isAdmin, ban } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAuthPage = pathname.startsWith("/auth");

  if (isAuthPage) return <>{children}</>;

  if (ban) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <Logo size="lg" />
        <h1 className="text-2xl font-bold">Your account is suspended</h1>
        <p className="max-w-md text-muted-foreground">
          {ban.reason ? `Reason: ${ban.reason}. ` : ""}
          {ban.expires_at
            ? `You can come back on ${new Date(ban.expires_at).toLocaleString()}.`
            : "This suspension is permanent."}
        </p>
        <Button variant="outline" onClick={() => supabase.auth.signOut()}>
          Sign out
        </Button>
      </div>
    );
  }

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const items = [
    { to: "/", label: "For You", icon: Home },
    { to: "/following", label: "Following", icon: Users },
    { to: "/explore", label: "Explore", icon: Compass },
    { to: "/live", label: "Live", icon: Radio },
    { to: "/upload", label: "Upload", icon: PlusSquare },
    { to: "/inbox", label: "Inbox", icon: MessageCircle },
  ] as const;

  const profileTo = profile ? `/u/${profile.username}` : "/auth";

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border px-3 py-5 md:flex">
        <div className="px-3">
          <Logo />
        </div>
        <nav className="mt-6 flex flex-1 flex-col gap-1">
          {items.map((it) => (
            <Link
              key={it.to}
              to={it.to}
              className={navBase}
              activeProps={{ className: cn(navBase, navActive) }}
              activeOptions={{ exact: it.to === "/" }}
            >
              <it.icon className="size-6" />
              {it.label}
            </Link>
          ))}
          <Link to={profileTo} className={navBase} activeProps={{ className: cn(navBase, navActive) }}>
            <User className="size-6" />
            Profile
          </Link>
          {isAdmin && (
            <Link to="/admin" className={navBase} activeProps={{ className: cn(navBase, navActive) }}>
              <Shield className="size-6" />
              Admin
            </Link>
          )}
        </nav>
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <div className="flex items-center justify-between px-1">
            <ThemeToggle />
            {user && (
              <Button variant="ghost" size="icon" aria-label="Settings" asChild>
                <Link to="/settings">
                  <Settings className="size-5" />
                </Link>
              </Button>
            )}
          </div>
          {user && profile ? (
            <div className="flex items-center gap-2 px-1">
              <UserAvatar profile={profile} size="sm" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate font-semibold">{profile.display_name}</p>
                <p className="truncate text-xs text-muted-foreground">@{profile.username}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
                <LogOut className="size-4" />
              </Button>
            </div>
          ) : (
            <Button variant="rose" asChild>
              <Link to="/auth">Log in</Link>
            </Button>
          )}
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-12 items-center justify-between bg-background/80 px-4 backdrop-blur md:hidden">
        <Logo size="sm" />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {!user && (
            <Button variant="ghost" size="icon" asChild aria-label="Log in">
              <Link to="/auth">
                <LogIn className="size-5" />
              </Link>
            </Button>
          )}
        </div>
      </header>

      <main className="min-w-0 flex-1 pt-12 pb-16 md:pt-0 md:pb-0">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t border-border bg-background md:hidden">
        {items.map((it) => (
          <Link
            key={it.to}
            to={it.to}
            className="flex flex-col items-center gap-0.5 text-[10px] font-semibold text-foreground/70"
            activeProps={{ className: "flex flex-col items-center gap-0.5 text-[10px] font-semibold text-rose" }}
            activeOptions={{ exact: it.to === "/" }}
          >
            {it.to === "/upload" ? (
              <span className="flex h-8 w-11 items-center justify-center rounded-lg bg-rose text-rose-foreground">
                <PlusSquare className="size-5" />
              </span>
            ) : (
              <>
                <it.icon className="size-6" />
                {it.label}
              </>
            )}
          </Link>
        ))}
        <Link
          to={isAdmin ? "/admin" : profileTo}
          className="flex flex-col items-center gap-0.5 text-[10px] font-semibold text-foreground/70"
          activeProps={{ className: "flex flex-col items-center gap-0.5 text-[10px] font-semibold text-rose" }}
        >
          {isAdmin ? <Shield className="size-6" /> : <User className="size-6" />}
          {isAdmin ? "Admin" : "Profile"}
        </Link>
      </nav>
    </div>
  );
}
