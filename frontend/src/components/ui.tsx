// Shared UI primitives used across all pages

const GROUP_COLORS: Record<number, string> = {
  1: "bg-[#F7EFEF] text-[#541A1A] border border-[#541A1A]/20",
  2: "bg-[#FDF8EC] text-[#B88E2F] border border-[#D4A843]/30",
  3: "bg-[#FAF7F5] text-[#6B5A56] border border-[#E6DDD8]",
  4: "bg-[#F5ECE8] text-[#7A2E1E] border border-[#7A2E1E]/20",
};

const YEAR_LABELS: Record<number, string> = {
  1: "1st Year",
  2: "2nd Year",
  3: "3rd Year",
  4: "4th Year",
};

export function GroupBadge({ group }: { group: number }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${GROUP_COLORS[group] ?? "bg-[#FAF7F5] text-[#6B5A56]"}`}>
      {YEAR_LABELS[group] ?? `Year ${group}`}
    </span>
  );
}

export const YearBadge = GroupBadge;

const STATUS_COLORS: Record<string, string> = {
  draft:     "bg-[#FAF7F5] text-[#6B5A56] border border-[#E6DDD8]",
  open:      "bg-[#FDF8EC] text-[#B88E2F] border border-[#D4A843]/30",
  live:      "bg-[#F7EFEF] text-[#541A1A] border border-[#541A1A]/30",
  concluded: "bg-[#FAF7F5] text-[#6B5A56] border border-[#E6DDD8]",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_COLORS[status] ?? "bg-[#FAF7F5] text-[#6B5A56]"}`}>
      {status === "live" && <span className="mr-1 text-[#541A1A]">●</span>}
      {status}
    </span>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

export function Alert({ type = "error", message }: { type?: "error" | "success" | "info"; message: string }) {
  const styles = {
    error:   "bg-[#F7EFEF] border-[#541A1A]/30 text-[#541A1A]",
    success: "bg-[#FDF8EC] border-[#D4A843]/40 text-[#241616]",
    info:    "bg-[#FAF7F5] border-[#E6DDD8] text-[#241616]",
  };
  return <div className={`rounded-lg border px-4 py-3 text-sm font-medium ${styles[type]}`}>{message}</div>;
}

type BtnVariant = "primary" | "secondary" | "danger" | "ghost";
const BTN_STYLES: Record<BtnVariant, string> = {
  primary:   "bg-[#541A1A] hover:bg-[#3E1212] text-white",
  secondary: "bg-white hover:bg-[#F7EFEF] text-[#241616] border border-[#E6DDD8]",
  danger:    "bg-red-700 hover:bg-red-800 text-white",
  ghost:     "hover:bg-[#F7EFEF] text-[#6B5A56]",
};

export function Button({
  variant = "primary", loading = false, children, className = "", ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-[#541A1A]/30 disabled:opacity-50 ${BTN_STYLES[variant]} ${className}`}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}
