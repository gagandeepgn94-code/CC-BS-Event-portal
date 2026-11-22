"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getEvent, registerForEvent, triggerDownload } from "@/lib/api";
import {
  CalendarDays, MapPin, Users, Download, ArrowLeft, FileText,
  CheckCircle2, Loader2, AlertCircle, ChevronRight, Award,
} from "lucide-react";

type Event = {
  id: string; title: string; description: string | null; status: string;
  event_date: string | null; location: string | null; rules: string | null;
  target_groups: number[]; circular_url: string | null; poster_url: string | null;
  max_participants: number | null;
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-white text-[#6B5A56] border border-[#E8E0D8]",
  open: "bg-[#FDF8EC] text-[#B88E2F] border border-[#D4A843]/40",
  live: "bg-[#F7EFEF] text-[#541A1A] border border-[#541A1A]/30",
  concluded: "bg-[#FBF9F6] text-[#6B5A56] border border-[#E8E0D8]",
};

const GROUP_COLORS = [
  "bg-[#F7EFEF] text-[#541A1A] border border-[#541A1A]/20",
  "bg-[#FDF8EC] text-[#B88E2F] border border-[#D4A843]/30",
  "bg-[#FBF9F6] text-[#6B5A56] border border-[#E8E0D8]",
  "bg-[#F5ECE8] text-[#7A2E1E] border border-[#7A2E1E]/20",
];

const YEAR_LABELS: Record<number, string> = {
  1: "1st Year",
  2: "2nd Year",
  3: "3rd Year",
  4: "4th Year",
};

export default function EventDetailClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    getEvent(id)
      .then(setEvent)
      .catch(() => setError("Event not found."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleRegister = async () => {
    if (!event) return;
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    setRegLoading(true);
    setError("");
    try {
      await registerForEvent(event.id);
      setRegSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setRegLoading(false);
    }
  };

  const formatDate = (d: string | null) => d
    ? new Date(d).toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long", year:"numeric" })
    : "TBD";

  if (loading) return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-16">
      <div className="card-bento p-8 animate-pulse space-y-4">
        <div className="h-8 bg-[#E8E0D8]/40 rounded-xl w-3/4" />
        <div className="h-4 bg-[#E8E0D8]/40 rounded-xl w-1/2" />
        <div className="h-48 bg-[#E8E0D8]/30 rounded-2xl" />
      </div>
    </div>
  );

  if (error && !event) return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-20 text-center">
      <div className="card-bento p-12">
        <AlertCircle className="h-12 w-12 text-[#541A1A] mx-auto mb-4" />
        <h2 className="font-display text-3xl text-[#241616] mb-2">{error}</h2>
        <p className="text-sm text-[#6B5A56] mb-6">The circular may have been removed or is temporarily unavailable.</p>
        <Link href="/" className="btn-secondary inline-flex">
          <ArrowLeft className="h-4 w-4" /> Return to Notice Board
        </Link>
      </div>
    </div>
  );

  if (!event) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-xs font-semibold text-[#6B5A56]">
        <Link href="/" className="hover:text-[#241616]">Notice Board</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-[#241616] truncate max-w-xs">{event.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bento Headline Card */}
          <div className="card-bento overflow-hidden">
            {event.poster_url && (
              <div className="relative h-64 sm:h-72 overflow-hidden bg-gradient-to-br from-[#541A1A] to-[#241616]">
                <img
                  src={event.poster_url}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="p-7 sm:p-8">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${STATUS_COLORS[event.status]}`}>
                  {event.status}
                </span>
                {event.target_groups.map((g) => (
                  <span key={g} className={`rounded-full px-3 py-1 text-xs font-semibold ${GROUP_COLORS[(g-1)%4]}`}>
                    {YEAR_LABELS[g] ?? `Year ${g}`}
                  </span>
                ))}
              </div>

              <h1 className="font-display text-4xl sm:text-5xl text-[#241616] leading-tight mb-4">
                {event.title}
              </h1>
              <p className="text-sm text-[#6B5A56] leading-relaxed whitespace-pre-line">
                {event.description}
              </p>
            </div>
          </div>

          {/* Rules Card */}
          {event.rules && (
            <div className="card-bento p-7 sm:p-8">
              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-[#E8E0D8]/70">
                <Award className="h-5 w-5 text-[#D4A843]" />
                <h2 className="font-display text-2xl text-[#241616]">Guidelines &amp; Regulations</h2>
              </div>
              <div className="text-sm text-[#6B5A56] whitespace-pre-line leading-relaxed">
                {event.rules}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Registration Card */}
          <div className="card-bento p-6">
            <h3 className="font-display text-2xl text-[#241616] mb-1">Registration</h3>
            <p className="text-xs text-[#6B5A56] mb-5">Open for eligible CC-BS students</p>

            {regSuccess ? (
              <div className="flex flex-col items-center gap-2.5 text-center py-4 bg-[#FDF8EC] rounded-2xl border border-[#D4A843]/30 p-5">
                <CheckCircle2 className="h-10 w-10 text-[#D4A843]" />
                <p className="font-bold text-[#241616] text-sm">Successfully Registered</p>
                <p className="text-xs text-[#6B5A56]">Track attendance and certificates in your dashboard.</p>
                <Link href="/student/dashboard" className="btn-secondary text-xs w-full justify-center mt-2">
                  Open Student Dashboard
                </Link>
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#541A1A]/30 bg-[#F7EFEF] p-3 text-xs text-[#541A1A]">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <button
                  onClick={handleRegister}
                  disabled={regLoading || event.status !== "open"}
                  className="btn-primary w-full justify-center py-3 text-sm font-semibold shadow-xs"
                >
                  {regLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : "Register for Event"}
                </button>
                {event.status !== "open" && (
                  <p className="mt-2 text-center text-xs text-[#6B5A56]">
                    Registration is currently closed ({event.status}).
                  </p>
                )}
              </>
            )}
          </div>

          {/* Event Details Card */}
          <div className="card-bento p-6 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B5A56]">Event Information</h3>

            <div className="flex items-start gap-3 text-xs">
              <CalendarDays className="h-4 w-4 text-[#541A1A] mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-[#241616]">Date &amp; Schedule</p>
                <p className="text-[#6B5A56] mt-0.5">{formatDate(event.event_date)}</p>
              </div>
            </div>

            {event.location && (
              <div className="flex items-start gap-3 text-xs pt-3 border-t border-[#E8E0D8]/60">
                <MapPin className="h-4 w-4 text-[#541A1A] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-[#241616]">Venue</p>
                  <p className="text-[#6B5A56] mt-0.5">{event.location}</p>
                </div>
              </div>
            )}

            {event.max_participants && (
              <div className="flex items-start gap-3 text-xs pt-3 border-t border-[#E8E0D8]/60">
                <Users className="h-4 w-4 text-[#541A1A] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-[#241616]">Capacity Limit</p>
                  <p className="text-[#6B5A56] mt-0.5">{event.max_participants} registered attendees</p>
                </div>
              </div>
            )}
          </div>

          {/* Documents Download */}
          {event.circular_url && (
            <div className="card-bento p-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B5A56] mb-3">Official Attachments</h3>
              <button
                onClick={() => triggerDownload(event.circular_url!, `${event.title}-circular.pdf`)}
                className="btn-secondary w-full justify-between text-xs py-2.5 px-4 font-semibold"
              >
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#541A1A]" />
                  <span>Download Circular</span>
                </span>
                <Download className="h-3.5 w-3.5 text-[#6B5A56]" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
