import { useState } from "react";
import { login, setToken } from "../api";
import AuthLayout, { Field, SubmitButton, linkBtn } from "./AuthLayout.jsx";

export default function Login({ onAuth, onSwitch }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { token, user } = await login(email.trim(), password);
      setToken(token);
      onAuth(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      subtitle="Sign in to manage and analyze your documents"
      heading="Log in to your account"
      error={error}
      footer={
        <>No account yet?{" "}
          <button type="button" onClick={onSwitch} className={linkBtn}>Register</button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate={false}>
        <Field id="email" label="Email address" type="email" inputMode="email" placeholder="you@example.com"
               autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field id="password" label="Password" type="password" placeholder="••••••••"
               autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <SubmitButton busy={busy} busyText="Logging in…">Log in</SubmitButton>
      </form>
    </AuthLayout>
  );
}