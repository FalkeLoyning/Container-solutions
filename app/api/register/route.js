import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request) {
  try {
    const { code, email, password, fullName } = await request.json();

    if (!code || !email || !password || !fullName) {
      return NextResponse.json({ error: "Alle felt er påkrevd" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Passordet må være minst 6 tegn" }, { status: 400 });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Server ikke konfigurert" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Look up the access code
    const { data: accessCode, error: lookupErr } = await supabase
      .from("access_codes")
      .select("id, email, org_id, used_at")
      .eq("code", code.trim().toUpperCase())
      .maybeSingle();

    if (lookupErr || !accessCode) {
      return NextResponse.json({ error: "Ugyldig tilgangskode" }, { status: 404 });
    }

    if (accessCode.used_at) {
      return NextResponse.json({ error: "Denne tilgangskoden er allerede brukt" }, { status: 409 });
    }

    if (accessCode.email.toLowerCase() !== email.trim().toLowerCase()) {
      return NextResponse.json({ error: "E-posten samsvarer ikke med tilgangskoden" }, { status: 403 });
    }

    // Create the user via admin API
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName.trim() },
    });

    if (createErr) {
      if (createErr.message?.includes("already been registered")) {
        return NextResponse.json({ error: "Denne e-posten er allerede registrert. Prøv å logge inn." }, { status: 409 });
      }
      console.error("Create user error:", createErr);
      return NextResponse.json({ error: "Kunne ikke opprette bruker" }, { status: 500 });
    }

    // Mark code as used
    await supabase
      .from("access_codes")
      .update({ used_at: new Date().toISOString(), used_by: newUser.user.id })
      .eq("id", accessCode.id);

    // Add user to the org if org_id is set
    if (accessCode.org_id) {
      await supabase.from("org_members").insert({
        user_id: newUser.user.id,
        org_id: accessCode.org_id,
        role: "member",
      });
    }

    // Add to approved_emails
    await supabase.from("approved_emails").upsert(
      { email: email.trim().toLowerCase(), added_by: accessCode.created_by || newUser.user.id },
      { onConflict: "email" }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Register with code error:", err);
    return NextResponse.json({ error: "Serverfeil" }, { status: 500 });
  }
}
