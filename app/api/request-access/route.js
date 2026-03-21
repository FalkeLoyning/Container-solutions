import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendKey = process.env.RESEND_API_KEY;

export async function POST(request) {
  try {
    const { email, fullName, message } = await request.json();

    if (!email || !fullName) {
      return NextResponse.json({ error: "E-post og navn er påkrevd" }, { status: 400 });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Server ikke konfigurert" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for duplicate pending request
    const { data: existing } = await supabase
      .from("access_requests")
      .select("id")
      .eq("email", email)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Du har allerede en ventende forespørsel" }, { status: 409 });
    }

    // Store request in DB
    const { error: insertErr } = await supabase
      .from("access_requests")
      .insert({ email, full_name: fullName, message: message || null });

    if (insertErr) {
      console.error("Insert error:", insertErr);
      return NextResponse.json({ error: "Kunne ikke lagre forespørselen" }, { status: 500 });
    }

    // Send notification email to admin
    if (resendKey) {
      try {
        const resend = new Resend(resendKey);
        await resend.emails.send({
          from: "Container Solutions <noreply@container-solutions.no>",
          to: "falke.loyning@osilion.no",
          subject: `Ny tilgangsforespørsel fra ${fullName}`,
          html: `
            <h2>Ny tilgangsforespørsel</h2>
            <p><strong>Navn:</strong> ${fullName}</p>
            <p><strong>E-post:</strong> ${email}</p>
            ${message ? `<p><strong>Melding:</strong> ${message}</p>` : ""}
            <p>Logg inn på Container Solutions for å godkjenne eller avslå forespørselen.</p>
          `,
        });
      } catch (emailErr) {
        console.error("Email send error:", emailErr);
        // Don't fail the request if email fails — the request is still stored
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Request access error:", err);
    return NextResponse.json({ error: "Serverfeil" }, { status: 500 });
  }
}
