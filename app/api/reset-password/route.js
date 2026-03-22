import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendKey = process.env.RESEND_API_KEY;

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "E-post er påkrevd" }, { status: 400 });
    }

    // Send notification to admin
    if (resendKey) {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: "Container Solutions <noreply@container-solutions.no>",
        to: "falke.loyning@osilion.no",
        subject: `Glemt passord – ${email}`,
        html: `
          <h2>Forespørsel om nytt passord</h2>
          <p><strong>Bruker:</strong> ${email}</p>
          <p><strong>Tidspunkt:</strong> ${new Date().toLocaleString("no-NO", { timeZone: "Europe/Oslo" })}</p>
          <hr />
          <p>Gå til <a href="https://supabase.com/dashboard/project/olrasqylcfunaoqvaxie/auth/users">Supabase Auth</a> for å tilbakestille passordet manuelt, eller klikk under for å sende en reset-lenke automatisk.</p>
          ${supabaseUrl && supabaseServiceKey ? "<p><em>Alternativt: Logg inn på Container Solutions → Organisasjon for å administrere brukere.</em></p>" : ""}
        `,
      });
    }

    // Also trigger Supabase's built-in reset email as backup
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "https://container-solutions.vercel.app",
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Reset password request error:", err);
    return NextResponse.json({ error: "Serverfeil" }, { status: 500 });
  }
}
