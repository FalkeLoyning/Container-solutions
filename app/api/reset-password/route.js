import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "E-post er påkrevd" }, { status: 400 });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Server ikke konfigurert" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Store the password reset request in the database
    const { error: insertErr } = await supabase
      .from("password_reset_requests")
      .insert({ email: email.toLowerCase().trim() });

    if (insertErr) {
      console.error("Failed to insert password reset request:", insertErr);
      return NextResponse.json({ error: "Kunne ikke registrere forespørselen" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Reset password request error:", err);
    return NextResponse.json({ error: "Serverfeil" }, { status: 500 });
  }
}
