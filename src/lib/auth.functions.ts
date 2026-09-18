import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const schema = z.object({
  identifier: z.string().trim().min(1).max(200),
  password: z.string().min(1).max(200),
});

/**
 * Signs in with either an email or a username. The username -> email lookup
 * happens on the server so emails are never exposed to the browser; the
 * session is only returned when the password is correct.
 */
export const signInWithIdentifier = createServerFn({ method: "POST" })
  .inputValidator((input) => schema.parse(input))
  .handler(async ({ data }) => {
    let email = data.identifier;
    if (!email.includes("@")) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .ilike("username", data.identifier)
        .maybeSingle();
      if (!profile) return { error: "Invalid username or password" as const, session: null };
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(profile.id);
      if (!u.user?.email) return { error: "Invalid username or password" as const, session: null };
      email = u.user.email;
    }

    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: signIn, error } = await client.auth.signInWithPassword({ email, password: data.password });
    if (error || !signIn.session) return { error: "Invalid username or password" as const, session: null };
    return {
      error: null,
      session: { access_token: signIn.session.access_token, refresh_token: signIn.session.refresh_token },
    };
  });
