import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Server ikke konfigurert" }, { status: 500 });
    }

    // Verify the user is authenticated via their access token
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the JWT token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Ugyldig token" }, { status: 401 });
    }

    const { config, projectName, customerName } = await request.json();
    if (!config) {
      return NextResponse.json({ error: "Konfigurasjon mangler" }, { status: 400 });
    }

    // Expires in 14 days
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error: insertErr } = await supabase
      .from("shared_configs")
      .insert({
        config,
        project_name: projectName || "",
        customer_name: customerName || "",
        created_by: user.id,
        expires_at: expiresAt,
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("Share insert error:", insertErr);
      return NextResponse.json({ error: "Kunne ikke opprette delings-link" }, { status: 500 });
    }

    return NextResponse.json({ id: data.id, expiresAt });
  } catch (err) {
    console.error("Share error:", err);
    return NextResponse.json({ error: "Serverfeil" }, { status: 500 });
  }
}
