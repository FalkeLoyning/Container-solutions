"use client";

import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client = null;

export function getSupabase() {
  if (client) return client;
  if (!url || !key || url === "https://YOUR_PROJECT.supabase.co") return null;
  client = createBrowserClient(url, key);
  return client;
}

export const supabase = (url && key && url !== "https://YOUR_PROJECT.supabase.co")
  ? getSupabase()
  : null;
