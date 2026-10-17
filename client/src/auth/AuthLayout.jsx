const inputCls =
  "w-full min-h-11 px-4 py-2.5 text-base sm:text-sm text-white bg-[#0A1128] border border-[#2A4480] rounded-lg " +
  "placeholder:text-slate-400 focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/40 transition-all";

export function Field({ id, label, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-200">{label}</label>
      <input id={id} required className={inputCls} {...props} />
    </div>
  );
}

export function Spinner({ className = "h-4 w-4" }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

export function SubmitButton({ busy, busyText, children }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="w-full min-h-11 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white
                 bg-[#FF1E27] hover:bg-[#E01820] shadow-lg shadow-[#FF1E27]/25 focus:outline-none focus:ring-2
                 focus:ring-offset-2 focus:ring-offset-[#101F42] focus:ring-[#FF1E27]
                 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
    >
      {busy ? (<><Spinner />{busyText}</>) : children}
    </button>
  );
}

export default function AuthLayout({ subtitle, heading, error, footer, children }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#0A1128] text-slate-100
                     px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Document Assistant</h1>
        <p className="mt-2 text-sm text-slate-300">{subtitle}</p>
      </div>

      <div className="w-full max-w-md bg-[#101F42] p-5 sm:p-10 shadow-2xl shadow-black/60 rounded-2xl border border-[#1C3166]">
        <h2 className="text-lg sm:text-xl font-semibold text-white mb-5 sm:mb-6 border-l-4 border-[#3B82F6] pl-3">
          {heading}
        </h2>
        {children}
        {error && (
          <div role="alert" className="mt-5 p-3 text-sm text-[#FF4D4D] bg-[#2A080C] border border-[#FF1E27]/50 rounded-lg">
            {error}
          </div>
        )}
        <div className="mt-6 text-center text-sm text-slate-300">{footer}</div>
      </div>
    </main>
  );
}

export const linkBtn =
  "font-semibold text-[#3B82F6] hover:text-[#60A5FA] focus:outline-none underline underline-offset-4 min-h-11 px-1";