import { useState } from "react";
import { register, setToken } from "../api";
import AuthLayout, { Field, SubmitButton, linkBtn } from "./AuthLayout.jsx";

export default function Register({ onAuth, onSwitch }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    // same rules as the server (validate.ts)
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (!/[A-Za-z]/.test(password)) return setError("Password must contain a letter.");
    if (!/\d/.test(password)) return setError("Password must contain a number.");
    if (password !== confirm) return setError("Passwords do not match.");

    setBusy(true);
    try {
      const { token, user } = await register(email.trim(), password);
      setToken(token);
      onAuth(user);
    } catch (err) {
      if (err.status === 409) {
        setError("Account already exists. Redirecting to login…");
        setTimeout(onSwitch, 1500);
      } else {
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      subtitle="Create an account to start managing your documents"
      heading="Create an account"
      error={error}
      footer={
        <>Already have an account?{" "}
          <button type="button" onClick={onSwitch} className={linkBtn}>Log in</button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <Field id="email" label="Email address" type="email" inputMode="email" placeholder="you@example.com"
               autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field id="password" label="Password" type="password" placeholder="8+ characters, letter and number"
               autoComplete="new-password" minLength={8} maxLength={72}
               value={password} onChange={(e) => setPassword(e.target.value)} />
        <Field id="confirm-password" label="Confirm password" type="password" placeholder="Re-enter password"
               autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <SubmitButton busy={busy} busyText="Creating account…">Register</SubmitButton>
      </form>
    </AuthLayout>
  );
}