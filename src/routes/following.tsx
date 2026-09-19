import { createFileRoute, Link } from "@tanstack/react-router";
import { Feed } from "@/components/Feed";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/following")({
  head: () => ({
    meta: [
      { title: "Following — Gallery" },
      { name: "description", content: "Latest videos from the creators you follow on Gallery." },
      { property: "og:title", content: "Following — Gallery" },
      { property: "og:description", content: "Latest videos from the creators you follow on Gallery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FollowingPage,
});

function FollowingPage() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user)
    return (
      <div className="flex h-[calc(100vh-7rem)] flex-col items-center justify-center gap-3 px-6 text-center md:h-screen">
        <p className="text-lg font-bold">Log in to see videos from people you follow</p>
        <Button variant="rose" asChild><Link to="/auth">Log in</Link></Button>
      </div>
    );
  return <Feed spec={{ kind: "following", viewerId: user.id }} empty="Follow some creators and their videos will show up here." />;
}
