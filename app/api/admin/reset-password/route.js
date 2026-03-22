import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request) {
  try {
    const { requestId, email, newPassword } = await request.json();

    if (!email || !newPassword || !requestId) {
      return NextResponse.json({ error: "Mangler påkrevde felt" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Passordet må være minst 6 tegn" }, { status: 400 });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Server ikke konfigurert" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the caller is authenticated
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !caller) {
      return NextResponse.json({ error: "Ugyldig autentisering" }, { status: 401 });
    }

    // Verify the caller is an admin in at least one org
    const { data: adminCheck } = await supabase
      .from("org_members")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .limit(1);

    if (!adminCheck || adminCheck.length === 0) {
      return NextResponse.json({ error: "Kun administratorer kan tilbakestille passord" }, { status: 403 });
    }

    // Find the user by email using admin API
    const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
    if (listErr) {
      return NextResponse.json({ error: "Kunne ikke hente brukerliste" }, { status: 500 });
    }

    const targetUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!targetUser) {
      return NextResponse.json({ error: "Ingen bruker funnet med denne e-posten" }, { status: 404 });
    }

    // Update the user's password using service role
    const { error: updateErr } = await supabase.auth.admin.updateUserById(targetUser.id, {
      password: newPassword,
    });

    if (updateErr) {
      console.error("Failed to update password:", updateErr);
      return NextResponse.json({ error: "Kunne ikke oppdatere passordet" }, { status: 500 });
    }

    // Mark the request as completed
    await supabase
      .from("password_reset_requests")
      .update({
        status: "completed",
        handled_by: caller.id,
        handled_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Admin reset password error:", err);
    return NextResponse.json({ error: "Serverfeil" }, { status: 500 });
  }
}
