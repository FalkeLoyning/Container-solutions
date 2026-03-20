"use client";
import { useState } from "react";
import { supabase } from "../lib/supabase";

function ContainerIcon({ size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <rect x="6" y="18" width="52" height="34" rx="3" fill="#0284c7" stroke="#0369a1" strokeWidth="2" />
      <rect x="10" y="22" width="12" height="26" rx="1" fill="#0ea5e9" stroke="#0369a1" strokeWidth="1" />
      <rect x="26" y="22" width="12" height="26" rx="1" fill="#0ea5e9" stroke="#0369a1" strokeWidth="1" />
      <rect x="42" y="22" width="12" height="26" rx="1" fill="#0ea5e9" stroke="#0369a1" strokeWidth="1" />
      <rect x="6" y="14" width="52" height="6" rx="2" fill="#0369a1" />
      <circle cx="16" cy="52" r="2" fill="#0369a1" />
      <circle cx="48" cy="52" r="2" fill="#0369a1" />
    </svg>
  );
}

export default function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
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
          email, password,
          options: { data: { full_name: fullName } },
        });
        if (signUpErr) throw signUpErr;
        if (data?.user?.identities?.length === 0) {
          setError("En bruker med denne e-posten finnes allerede");
          return;
        }
        if (data?.session) { onLogin(); return; }
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

  const inputClass =
    "w-full rounded-xl px-4 py-3 text-sm bg-[var(--bg-input)] border border-[var(--border)] " +
    "text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 " +
    "focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 focus:border-[var(--accent)] " +
    "transition-all duration-200";

  return (
    <div className="min-h-screen w-screen flex" style={{ background: "var(--bg-primary)" }}>
      {/* Left — decorative hero panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-[480px] p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0284c7, #0369a1, #075985)" }}
      >
        {/* Floating container shapes */}
        <div className="absolute inset-0 overflow-hidden">
          {[
            { w: 180, h: 100, t: "8%", l: "-4%", r: -8 },
            { w: 220, h: 120, t: "25%", l: "55%", r: 5 },
            { w: 150, h: 85, t: "50%", l: "10%", r: -3 },
            { w: 200, h: 110, t: "70%", l: "45%", r: 10 },
            { w: 130, h: 75, t: "88%", l: "-2%", r: -6 },
          ].map((s, i) => (
            <div
              key={i}
              className="absolute rounded-xl border-2 border-white/10 bg-white/5"
              style={{
                width: s.w, height: s.h, top: s.t, left: s.l,
                transform: `rotate(${s.r}deg)`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <ContainerIcon size={56} />
            <div>
              <h1 className="text-white text-xl font-bold leading-tight">Container</h1>
              <h1 className="text-sky-200 text-xl font-bold leading-tight">Solutions</h1>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <div>
            <h2 className="text-white text-4xl font-extrabold leading-tight tracking-tight">
              Konfigurer<br />
              containere<br />
              <span className="text-sky-200">i 3D</span>
            </h2>
            <p className="text-sky-100/70 text-sm mt-4 max-w-[300px] leading-relaxed">
              Design dører, ventilasjon, kledning og isolasjon — generer tekniske tegninger med ett klikk.
            </p>
          </div>

          {/* Feature badges */}
          <div className="flex gap-3">
            {[
              { icon: "🎨", text: "3D Sanntid" },
              { icon: "📐", text: "Tegninger" },
              { icon: "📦", text: "STEP-filer" },
            ].map(({ icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10"
              >
                <span className="text-base">{icon}</span>
                <span className="text-white/90 text-xs font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-sky-300/30 text-xs">
          &copy; {new Date().getFullYear()} Container Solutions
        </p>
      </div>

      {/* Right — login form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo (hidden on desktop) */}
          <div className="lg:hidden flex flex-col items-center mb-10">
            <ContainerIcon size={48} />
            <h1 className="text-lg font-bold text-[var(--text-primary)] mt-2">Container Solutions</h1>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-[28px] font-extrabold text-[var(--text-primary)] tracking-tight">
              {mode === "login" ? "Velkommen tilbake" : "Kom i gang"}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1.5">
              {mode === "login"
                ? "Logg inn for å fortsette til konfiguratoren"
                : "Opprett en konto for å begynne å konfigurere"}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 mb-7 p-1 rounded-xl bg-[var(--bg-input)] border border-[var(--border)]">
            {[
              { key: "login", label: "Logg inn" },
              { key: "register", label: "Registrer" },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => { setMode(key); setError(null); setSuccess(null); }}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                  mode === key
                    ? "bg-white text-[var(--accent)] shadow-sm border border-[var(--border)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === "register" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Fullt navn
                </label>
                <input
                  type="text"
                  placeholder="Ola Nordmann"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className={inputClass}
                  autoComplete="name"
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                E-post
              </label>
              <input
                type="email"
                placeholder="din@epost.no"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputClass}
                autoComplete="email"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Passord
              </label>
              <input
                type="password"
                placeholder="Minimum 6 tegn"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className={inputClass}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </div>

            {mode === "register" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Bekreft passord
                </label>
                <input
                  type="password"
                  placeholder="Gjenta passordet"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className={inputClass}
                  autoComplete="new-password"
                />
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-xs font-medium bg-red-50 text-red-600 border border-red-200">
                <svg className="w-4 h-4 mt-px flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                <svg className="w-4 h-4 mt-px flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{success}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 rounded-xl py-3.5 font-bold text-sm text-white cursor-pointer
                transition-all duration-200 hover:shadow-lg hover:shadow-[var(--accent)]/25
                active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-hover))" }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Venter…
                </span>
              ) : mode === "login" ? "Logg inn" : "Opprett konto"}
            </button>
          </form>

          {/* Footer text on mobile */}
          <p className="lg:hidden text-center text-[var(--text-secondary)]/40 text-xs mt-10">
            &copy; {new Date().getFullYear()} Container Solutions
          </p>
        </div>
      </div>
    </div>
  );
}
