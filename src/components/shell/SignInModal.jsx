import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";

export default function SignInModal({ onClose }) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const { error: err } = mode === "signin"
      ? await signIn(email, password)
      : await signUp(email, password);
    setSubmitting(false);
    if (err) { setError(err.message); return; }
    onClose();
  }

  return (
    <div className="auth-modal-overlay show" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="auth-modal">
        <button className="auth-modal-close" type="button" onClick={onClose}>✕</button>
        <h3>{mode === "signin" ? "Sign in" : "Create an account"}</h3>
        <p className="auth-modal-sub">Only needed to add or edit notes — everything on this site stays viewable either way.</p>
        <form id="authForm" onSubmit={handleSubmit}>
          <input
            type="email" placeholder="Email" autoComplete="email" required
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password" placeholder="Password" autoComplete={mode === "signin" ? "current-password" : "new-password"} required
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
          <div className="auth-error">{error}</div>
          <button type="submit" disabled={submitting}>
            {submitting ? "…" : mode === "signin" ? "Sign in" : "Sign up"}
          </button>
        </form>
        <button className="auth-toggle-mode" type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }}>
          {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
