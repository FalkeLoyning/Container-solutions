"use client";
import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "register") {
        const { error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (signUpErr) throw signUpErr;
        // Auto-confirm is expected for small team — Supabase setting
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) throw signInErr;
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) throw signInErr;
      }
      onLogin();
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
        className="w-full max-w-sm p-6 rounded-xl shadow-lg flex flex-col gap-4"
        style={{ background: "var(--bg-secondary, #1e293b)", color: "var(--text-primary, #e2e8f0)" }}
      >
        <h1 className="text-2xl font-bold text-center">Container Solutions</h1>
        <p className="text-sm text-center opacity-70">
          {mode === "login" ? "Logg inn" : "Opprett konto"}
        </p>

        {mode === "register" && (
          <input
            type="text"
            placeholder="Fullt navn"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="rounded px-3 py-2 text-sm"
            style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
          />
        )}

        <input
          type="email"
          placeholder="E-post"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded px-3 py-2 text-sm"
          style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
        />

        <input
          type="password"
          placeholder="Passord"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="rounded px-3 py-2 text-sm"
          style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
        />

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded py-2 font-semibold text-sm cursor-pointer"
          style={{ background: "var(--accent, #3b82f6)", color: "#fff" }}
        >
          {loading ? "Venter…" : mode === "login" ? "Logg inn" : "Registrer"}
        </button>

        <button
          type="button"
          onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}
          className="text-xs opacity-60 hover:opacity-100 cursor-pointer"
        >
          {mode === "login" ? "Har du ikke konto? Registrer deg" : "Har du allerede konto? Logg inn"}
        </button>
      </form>
    </div>
  );
}
