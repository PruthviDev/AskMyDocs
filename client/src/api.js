const BASE = import.meta.env.VITE_API_URL ?? "";
const TOKEN_KEY = "token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

async function request(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers ?? {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, { ...options, headers });
  } catch {
    throw new Error("Can't reach the server. Is the API running?");
  }
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));

  const isAuthForm = path === "/auth/login" || path === "/auth/register";
  if (res.status === 401 && token && !isAuthForm) {
    setToken(null);
    window.dispatchEvent(new Event("auth:logout"));
  }
  if (!res.ok) { const e = new Error(body.error ?? `Request failed (${res.status})`); e.status = res.status; throw e; }
  return body;
}

const json = (method, data) => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});

// auth
export const register = (email, password) => request("/auth/register", json("POST", { email, password }));
export const login = (email, password) => request("/auth/login", json("POST", { email, password }));
export const me = () => request("/auth/me");

// documents
export const listDocs = () => request("/documents");
export const deleteDoc = (id) => request(`/documents/${id}`, { method: "DELETE" });
export const uploadDoc = (file) => {
  const form = new FormData();
  form.append("file", file);
  return request("/documents", { method: "POST", body: form });
};
export const ask = (question, documentId) =>
  request("/ask", json("POST", { question, documentId: documentId || null }));