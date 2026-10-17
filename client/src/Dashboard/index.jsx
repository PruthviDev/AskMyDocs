import { useCallback, useEffect, useRef, useState } from "react";
import { ask, deleteDoc, listDocs, uploadDoc } from "../api";

const MAX_MB = 10;
const ALLOWED_EXT = [".pdf", ".txt", ".md"];

const card = "rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5";
const field =
  "min-h-11 rounded-lg border border-white/10 bg-[#0A1128] px-3 py-2 text-base sm:text-sm " +
  "placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#FF1E27]";

export default function Dashboard({ user, onLogout }) {
  const [docs, setDocs] = useState([]);
  const [scope, setScope] = useState("");
  const [uploading, setUploading] = useState(false);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const handleError = useCallback((err) => {
    if (err?.status === 401) {
      window.dispatchEvent(new Event("auth:logout"));
      return;
    }
    setError(err?.message || "Something went wrong");
  }, []);

  const refresh = useCallback(() => listDocs().then(setDocs).catch(handleError), [handleError]);

  useEffect(() => {
    let cancelled = false;
    listDocs()
      .then((d) => { if (!cancelled) setDocs(d); })
      .catch((e) => { if (!cancelled) handleError(e); });
    return () => { cancelled = true; };
  }, [handleError]);

  async function onUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");

    // quick client-side checks (the server re-validates everything)
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      setError("Only PDF, TXT and Markdown files are supported.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`File too large (max ${MAX_MB} MB).`);
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      await uploadDoc(file);
      await refresh();
    } catch (err) {
      handleError(err);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onAsk(e) {
    e.preventDefault();
    setError("");
    setResult(null);
    setAsking(true);
    try {
      setResult(await ask(question.trim(), scope));
    } catch (err) {
      handleError(err);
    } finally {
      setAsking(false);
    }
  }

  async function onDelete(id) {
    try {
      await deleteDoc(id);
      if (String(id) === scope) setScope("");
      await refresh();
    } catch (err) {
      handleError(err);
    }
  }

  const canAsk = !asking && question.trim().length >= 3 && docs.length > 0;

  return (
    <main className="min-h-screen bg-[#0A1128] text-slate-100">
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:space-y-6 sm:py-8">
        {/* Header */}
        <header className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold sm:text-2xl">Document Assistant</h1>
          <div className="flex min-w-0 items-center gap-2 text-sm text-slate-400">
            <span className="hidden max-w-48 truncate md:inline">{user.email}</span>
            <button
              onClick={onLogout}
              className="min-h-11 rounded-lg px-3 font-medium text-[#FF1E27] hover:bg-white/5"
            >
              Log out
            </button>
          </div>
        </header>

        {/* Upload */}
        <section className={card}>
          <h2 className="mb-3 text-lg font-medium">1. Upload</h2>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.txt,.md"
            onChange={onUpload}
            disabled={uploading}
            className="block w-full text-sm text-slate-300
                       file:mr-4 file:min-h-11 file:rounded-lg file:border-0 file:bg-[#FF1E27]
                       file:px-4 file:py-2 file:text-sm file:font-medium file:text-white
                       hover:file:opacity-90 disabled:opacity-50"
          />
          <p className="mt-2 text-xs text-slate-500">PDF, TXT or Markdown, up to {MAX_MB} MB.</p>
          {uploading && <p className="mt-2 text-sm text-slate-400">Extracting, chunking and embedding…</p>}

          <ul className="mt-3 divide-y divide-white/10">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-1 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{d.filename}</span>
                  <span className="text-xs text-slate-400">{d.chunk_count} chunks</span>
                </span>
                <button
                  onClick={() => onDelete(d.id)}
                  aria-label={`Delete ${d.filename}`}
                  className="min-h-11 shrink-0 rounded-lg px-3 text-[#FF1E27] hover:bg-white/5"
                >
                  Delete
                </button>
              </li>
            ))}
            {docs.length === 0 && <li className="py-2 text-sm text-slate-400">No documents yet.</li>}
          </ul>
        </section>

        {/* Ask */}
        <section className={card}>
          <h2 className="mb-3 text-lg font-medium">2. Ask</h2>
          <form onSubmit={onAsk} className="flex flex-col gap-3 sm:flex-row">
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className={`${field} sm:w-44 sm:shrink-0`}
            >
              <option value="">All documents</option>
              {docs.map((d) => (
                <option key={d.id} value={d.id}>{d.filename}</option>
              ))}
            </select>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={1000}
              placeholder="Ask a question about your documents"
              className={`${field} min-w-0 flex-1`}
            />
            <button
              disabled={!canAsk}
              className="min-h-11 rounded-lg bg-[#FF1E27] px-5 py-2 text-sm font-medium text-white
                         hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {asking ? "Thinking…" : "Ask"}
            </button>
          </form>
        </section>

        {error && (
          <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {/* Answer */}
        {result && (
          <section className={card}>
            <h2 className="mb-2 text-lg font-medium">Answer</h2>
            <p className={`whitespace-pre-wrap wrap-break-word ${result.found ? "text-slate-100" : "text-slate-400"}`}>
              {result.answer}
            </p>

            {result.sources?.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-slate-400">Sources</h3>
                <div className="space-y-2">
                  {result.sources.map((s) => (
                    <details key={s.n} className="rounded-lg border border-white/10 bg-[#0A1128] px-3 py-2 text-sm">
                      <summary className="min-h-8 cursor-pointer wrap-break-word">
                        [{s.n}] {s.filename}
                        {s.page ? `, p.${s.page}` : ""}{" "}
                        <span className="text-slate-400">· match {s.score}</span>
                      </summary>
                      <blockquote className="mt-2 wrap-break-word border-l-2 border-[#FF1E27] pl-3 text-slate-300">
                        {s.snippet}…
                      </blockquote>
                    </details>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}