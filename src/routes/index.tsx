import { createFileRoute } from "@tanstack/react-router";
import { Feed } from "@/components/Feed";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gallery — For You" },
      { name: "description", content: "Watch short videos from creators on Gallery. Like, comment, save and share." },
      { property: "og:title", content: "Gallery — For You" },
      { property: "og:description", content: "Watch short videos from creators on Gallery. Like, comment, save and share." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <Feed spec={{ kind: "foryou" }} empty="Nothing here yet — be the first to upload a video!" />,
});
