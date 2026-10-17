import { useCallback, useEffect, useState } from "react";
import { Routes, Route, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { getToken, me, setToken } from "./api";
import Login from "./auth/Login.jsx";
import Register from "./auth/Register.jsx";
import Dashboard from "./Dashboard/index.jsx";

function Spinner() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#0A1128] text-slate-100">
      <div className="flex flex-col items-center gap-3">
        <svg className="animate-spin h-8 w-8 text-[#FF1E27]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-sm font-medium text-slate-400">Loading session…</p>
      </div>
    </main>
  );
}

// Only logged-in users can pass
function ProtectedRoute({ user, checking }) {
  const location = useLocation();
  if (checking) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

// Only logged-out users can pass (login/register)
function PublicRoute({ user, checking }) {
  if (checking) return <Spinner />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(getToken()));
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    if (getToken()) {
      me()
        .then((r) => { if (!cancelled) setUser(r.user); })
        .catch((err) => {
          // only drop the session if the token is actually invalid
          if (err?.status === 401) setToken(null);
        })
        .finally(() => { if (!cancelled) setChecking(false); });
    }

    const onLogout = () => { setToken(null); setUser(null); navigate("/login", { replace: true }); };
    window.addEventListener("auth:logout", onLogout);

    return () => {
      cancelled = true;
      window.removeEventListener("auth:logout", onLogout);
    };
  }, [navigate]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    navigate("/login", { replace: true });
  }, [navigate]);

  const handleAuth = (u) => setUser(u);

  return (
    <Routes>
      <Route element={<PublicRoute user={user} checking={checking} />}>
        <Route path="/login" element={<Login onAuth={handleAuth} onSwitch={() => navigate("/register")} />} />
        <Route path="/register" element={<Register onAuth={handleAuth} onSwitch={() => navigate("/login")} />} />
      </Route>

      <Route element={<ProtectedRoute user={user} checking={checking} />}>
        {/* "/*" lets Dashboard define its own nested routes */}
        <Route path="/dashboard/*" element={<Dashboard user={user} onLogout={logout} />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}