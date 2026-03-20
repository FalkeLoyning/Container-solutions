"use client";
import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!supabase) { setError("Supabase er ikke konfigurert"); return; }
    if (mode === "register" && password !== confirmPassword) {
      setError("Passordene stemmer ikke overens");
      return;
    }
    setLoading(true);

    try {
      if (mode === "register") {
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (signUpErr) throw signUpErr;
        // If email confirmation is required, show message
        if (data?.user?.identities?.length === 0) {
          setError("En bruker med denne e-posten finnes allerede");
          return;
        }
        if (data?.session) {
          // Auto-confirmed — logged in directly
          onLogin();
          return;
        }
        // Try auto-login (works if confirm email is disabled)
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) {
          setSuccess("Konto opprettet! Sjekk e-posten din for bekreftelseslenke.");
          setMode("login");
          return;
        }
        onLogin();
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) throw signInErr;
        onLogin();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md p-8 rounded-2xl shadow-2xl flex flex-col gap-5"
        style={{ background: "var(--bg-secondary, #1e293b)", color: "var(--text-primary, #e2e8f0)" }}
      >
        {/* Logo / title */}
        <div className="text-center mb-2">
          <div className="text-4xl mb-2">📦</div>
          <h1 className="text-2xl font-bold">Container Solutions</h1>
          <p className="text-sm opacity-60 mt-1">
            {mode === "login" ? "Logg inn på kontoen din" : "Opprett en ny konto"}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "var(--border, #334155)" }}>
          <button
            type="button"
            onClick={() => { setMode("login"); setError(null); setSuccess(null); }}
            className={`flex-1 py-2 text-sm font-semibold transition-colors cursor-pointer ${
              mode === "login" ? "text-white" : "opacity-50"
            }`}
            style={mode === "login" ? { background: "var(--accent, #3b82f6)" } : {}}
          >
            Logg inn
          </button>
          <button
            type="button"
            onClick={() => { setMode("register"); setError(null); setSuccess(null); }}
            className={`flex-1 py-2 text-sm font-semibold transition-colors cursor-pointer ${
              mode === "register" ? "text-white" : "opacity-50"
            }`}
            style={mode === "register" ? { background: "var(--accent, #3b82f6)" } : {}}
          >
            Registrer
          </button>
        </div>

        {/* Register fields */}
        {mode === "register" && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium opacity-70">Fullt navn</label>
            <input
              type="text"
              placeholder="Ola Nordmann"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="rounded-lg px-4 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              style={{ background: "var(--bg-primary)", color: "var(--text-primary)", borderColor: "var(--border, #334155)" }}
            />
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium opacity-70">E-post</label>
          <input
            type="email"
            placeholder="din@epost.no"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-lg px-4 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            style={{ background: "var(--bg-primary)", color: "var(--text-primary)", borderColor: "var(--border, #334155)" }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium opacity-70">Passord</label>
          <input
            type="password"
            placeholder="Minimum 6 tegn"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="rounded-lg px-4 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            style={{ background: "var(--bg-primary)", color: "var(--text-primary)", borderColor: "var(--border, #334155)" }}
          />
        </div>

        {mode === "register" && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium opacity-70">Bekreft passord</label>
            <input
              type="password"
              placeholder="Gjenta passordet"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="rounded-lg px-4 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              style={{ background: "var(--bg-primary)", color: "var(--text-primary)", borderColor: "var(--border, #334155)" }}
            />
          </div>
        )}

        {error && (
          <div className="rounded-lg px-3 py-2 text-xs bg-red-900/30 text-red-300 border border-red-800/50">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg px-3 py-2 text-xs bg-green-900/30 text-green-300 border border-green-800/50">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg py-3 font-semibold text-sm cursor-pointer transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
          style={{ background: "var(--accent, #3b82f6)", color: "#fff" }}
        >
          {loading ? "Venter…" : mode === "login" ? "Logg inn" : "Opprett konto"}
        </button>
      </form>
    </div>
  );
}
