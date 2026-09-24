import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const schema = z.object({
  identifier: z.string().trim().min(1).max(200),
  password: z.string().min(1).max(200),
});

function makeAnonClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
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
}

/**
 * Signs in with either an email or a username. The username -> email lookup
 * happens on the server, via a database function, so emails are never exposed
 * to the browser; the session is only returned when the password is correct.
 */
export const signInWithIdentifier = createServerFn({ method: "POST" })
  .inputValidator((input) => schema.parse(input))
  .handler(async ({ data }) => {
    let email = data.identifier;
    const client = makeAnonClient();

    if (!email.includes("@")) {
      const { data: lookedUp, error: lookupError } = await client.rpc("get_email_for_username", {
        _username: data.identifier,
      });
      if (lookupError || !lookedUp) return { error: "Invalid username or password" as const, session: null };
      email = lookedUp as string;
    }

    const { data: signIn, error } = await client.auth.signInWithPassword({ email, password: data.password });
    if (error || !signIn.session) return { error: "Invalid username or password" as const, session: null };
    return {
      error: null,
      session: { access_token: signIn.session.access_token, refresh_token: signIn.session.refresh_token },
    };
  });
