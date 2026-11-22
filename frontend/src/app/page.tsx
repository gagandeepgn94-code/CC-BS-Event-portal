"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listEvents } from "@/lib/api";
import {
  CalendarDays,
  MapPin,
  ArrowRight,
  CalendarX,
  Users,
  Award,
  Filter,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  FadeIn,
  HoverCard,
  editorialEase,
} from "@/components/Motion";

type Event = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  event_date: string | null;
  location: string | null;
  target_groups: number[];
  target_branches?: string[] | null;
  event_type?: string | null;
  poster_url: string | null;
  max_participants: number | null;
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-white text-[#6B5A56] border border-[#E8E0D8]",
  open: "bg-[#FDF8EC] text-[#B88E2F] border border-[#D4A843]/40",
  live: "bg-[#F7EFEF] text-[#541A1A] border border-[#541A1A]/30",
  concluded: "bg-[#FBF9F6] text-[#6B5A56] border border-[#E8E0D8]",
};

const STATUS_DOTS: Record<string, string> = {
  open: "bg-[#D4A843]",
  live: "bg-[#541A1A]",
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

type Filter = "all" | "open" | "live" | 1 | 2 | 3 | 4 | "CC" | "BS";

function parseTargetGroups(tg: unknown): number[] {
  if (Array.isArray(tg)) {
    return tg.map((x) => Number(x)).filter((n) => !isNaN(n));
  }
  if (typeof tg === "string") {
    try {
      const parsed = JSON.parse(tg);
      if (Array.isArray(parsed)) {
        return parsed.map((x) => Number(x)).filter((n) => !isNaN(n));
      }
    } catch {
      return tg.split(",").map((x) => Number(x.trim())).filter((n) => !isNaN(n));
    }
  }
  return [];
}

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState<Filter>("all");
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    setLoading(true);
    setError("");
    listEvents()
      .then((data) => {
        if (!Array.isArray(data)) {
          setEvents([]);
          return;
        }
        const normalized: Event[] = data.map((ev) => ({
          ...ev,
          status: (ev.status ?? "open").toLowerCase().trim(),
          target_groups: parseTargetGroups(ev.target_groups),
          target_branches: ev.target_branches ?? ["ALL"],
        }));
        setEvents(normalized);
      })
      .catch((err) => {
        console.error("Notice Board failed to fetch events:", err);
        setError("Failed to load events. Please try again later.");
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = events.filter((e) => {
    const s = (e.status ?? "").toLowerCase().trim();
    if (activeFilter === "all") {
      return true;
    }
    if (activeFilter === "open") return s === "open";
    if (activeFilter === "live") return s === "live";
    if (typeof activeFilter === "number") {
      const groups = parseTargetGroups(e.target_groups);
      return groups.includes(activeFilter);
    }
    if (activeFilter === "CC" || activeFilter === "BS") {
      const branches = Array.isArray(e.target_branches)
        ? e.target_branches
        : typeof e.target_branches === "string"
        ? [e.target_branches]
        : ["ALL"];
      return branches.includes("ALL") || branches.includes(activeFilter);
    }
    return true;
  });

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "All Events" },
    { key: "open", label: "Open Registrations" },
    { key: "live", label: "Live Now" },
    { key: 1, label: "1st Year" },
    { key: 2, label: "2nd Year" },
    { key: 3, label: "3rd Year" },
    { key: 4, label: "4th Year" },
    { key: "CC", label: "CC Branch" },
    { key: "BS", label: "BS Branch" },
  ];

  const formatDate = (d: string | null) => {
    if (!d) return "Date TBD";
    return new Date(d).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-[#FBF9F6] pb-24">
      {/* ── Wispr Flow–Style Editorial Hero with Campus Background & Left-Aligned Layout ── */}
      <section
        className="relative overflow-hidden bg-cover bg-center pt-24 pb-14 sm:pt-32 sm:pb-16 px-4 sm:px-6 lg:px-8"
        style={{ backgroundImage: "url('/images/campus-bg.jpg')" }}
      >
        {/* Dark Cinematic Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#2A0B0B]/90 via-[#541A1A]/55 to-[#2A0B0B]/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2A0B0B]/90 via-transparent to-black/20" />
        <div className="dot-pattern absolute inset-0 opacity-10" />

        {/* Ambient Live Glowing Blobs (Wispr Flow / Apple Motion Polish) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-0">
          <motion.div
            animate={
              shouldReduceMotion
                ? {}
                : {
                  x: [0, 45, -35, 0],
                  y: [0, -40, 25, 0],
                  scale: [1, 1.15, 0.92, 1],
                }
            }
            transition={{
              duration: 16,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
            }}
            className="absolute top-10 left-1/4 -translate-x-1/2 w-96 h-96 rounded-full bg-[#D4A843]/15 blur-3xl pointer-events-none"
          />
          <motion.div
            animate={
              shouldReduceMotion
                ? {}
                : {
                  x: [0, -50, 40, 0],
                  y: [0, 45, -35, 0],
                  scale: [1, 1.2, 0.88, 1],
                }
            }
            transition={{
              duration: 13,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
            }}
            className="absolute top-28 right-1/4 translate-x-1/2 w-[30rem] h-[30rem] rounded-full bg-[#D4A843]/10 blur-3xl pointer-events-none"
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
          {/* Left-Aligned Headline Block */}
          <div className="text-left items-start max-w-2xl">
            {/* Top Gold Pill Badge with Live Pulse */}
            <FadeIn delay={0.05} yOffset={10}>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#D4A843]/50 bg-black/40 backdrop-blur-md px-4 py-1.5 text-xs font-semibold text-[#FDF8EC] mb-6 shadow-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4A843] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D4A843]" />
                </span>
                <span>GM University</span>
                <span className="text-[#D4A843]">•</span>
                <span className="text-[#FDF8EC]/85">Dept. of CC-BS Official Portal</span>
              </div>
            </FadeIn>

            {/* Large Instrument Serif Headline (Left Aligned) */}
            <FadeIn delay={0.12} yOffset={14}>
              <h1 className="font-display text-5xl sm:text-7xl lg:text-8xl font-normal text-white tracking-tight leading-[1.04]">
                Department events,{" "}
                <span className="italic font-normal text-[#D4A843] underline decoration-[#D4A843]/60 decoration-wavy decoration-1 underline-offset-8">
                  effortlessly
                </span>{" "}
                organized.
              </h1>
            </FadeIn>

            {/* Clean Editorial Subtitle */}
            <FadeIn delay={0.2} yOffset={12}>
              <p className="mt-6 text-base sm:text-lg text-[#FDF8EC]/90 font-normal leading-relaxed">
                The unified digital home for official circulars, student registrations, live attendance tracking, and instant QR-verified event certificates.
              </p>
            </FadeIn>

            {/* Pill Action Buttons (Left Aligned) */}
            <FadeIn delay={0.28} yOffset={10}>
              <div className="mt-8 flex flex-wrap items-center justify-start gap-3">
                <motion.a
                  href="#events"
                  whileHover={shouldReduceMotion ? {} : { scale: 1.03 }}
                  whileTap={shouldReduceMotion ? {} : { scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="btn-gold text-sm px-6 py-3 shadow-lg flex items-center gap-2 font-bold"
                >
                  <span>Browse Department Circulars</span>
                  <ArrowRight className="h-4 w-4" />
                </motion.a>
                <motion.div
                  whileHover={shouldReduceMotion ? {} : { scale: 1.03 }}
                  whileTap={shouldReduceMotion ? {} : { scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <Link
                    href="/verify"
                    className="btn-secondary text-sm px-6 py-3 flex items-center gap-2 bg-white/95 text-[#241616] hover:bg-white shadow-md border-white/40 backdrop-blur-md"
                  >
                    <ShieldCheck className="h-4 w-4 text-[#541A1A]" />
                    <span>Verify Any Certificate</span>
                  </Link>
                </motion.div>
              </div>
            </FadeIn>
          </div>

          {/* ── Transparent Glassmorphic Bottom Info Bar ── */}
          <FadeIn delay={0.35} yOffset={16}>
            <div className="mt-14 sm:mt-20 p-4 sm:p-5 rounded-2xl bg-black/30 backdrop-blur-md border border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.25)] flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Left: Department Identity Strip */}
              <div className="flex items-center gap-3.5">
                <div className="h-11 w-11 rounded-xl bg-white/95 p-1.5 shadow-md border border-[#D4A843]/50 flex-shrink-0 flex items-center justify-center">
                  <img src="/images/gmu-logo.png" alt="GM University" className="h-full w-full object-contain" />
                </div>
                <div>
                  <h3 className="font-display text-lg sm:text-xl text-white tracking-wide leading-tight">
                    Excellence in Cloud Computing &amp; Business Systems
                  </h3>
                  <p className="text-xs text-[#FDF8EC]/75 mt-0.5">
                    GM University Campus • Academic Year 2026–27
                  </p>
                </div>
              </div>

              {/* Right: 3 Glass Feature Pills */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-white backdrop-blur-sm shadow-xs">
                  <Sparkles className="h-3.5 w-3.5 text-[#D4A843]" />
                  <span>Live Event Schedules</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-white backdrop-blur-sm shadow-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>One-Click Student Registration</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-white backdrop-blur-sm shadow-xs">
                  <Award className="h-3.5 w-3.5 text-[#D4A843]" />
                  <span>Tamper-Proof QR Certificates</span>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Segmented Pill Filter Bar with layoutId Indicator ── */}
      <div id="events" className="sticky top-20 z-30 py-4 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="glass-pill p-1.5 flex items-center gap-1.5 overflow-x-auto scrollbar-none shadow-[0_4px_20px_rgba(36,22,22,0.04)]">
          <Filter className="h-4 w-4 text-[#6B5A56] ml-3 mr-1 flex-shrink-0" />
          {filters.map(({ key, label }) => {
            const isSelected = activeFilter === key;
            return (
              <button
                key={String(key)}
                onClick={() => setActiveFilter(key)}
                className={`relative flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors duration-150 ${isSelected
                  ? "text-white"
                  : "text-[#6B5A56] hover:text-[#241616] hover:bg-white/60"
                  }`}
              >
                {isSelected && (
                  <motion.span
                    layoutId="filter-pill"
                    className="absolute inset-0 rounded-full bg-[#541A1A] -z-10 shadow-xs"
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  />
                )}
                <span className="relative z-10">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Bento Event Grid with AnimatePresence & Stagger ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {error && (
          <div className="mb-6 rounded-2xl border border-[#541A1A]/30 bg-[#F7EFEF] px-4 py-3 text-sm text-[#541A1A] font-medium">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card-bento p-4 animate-pulse">
                <div className="h-48 rounded-2xl bg-[#E8E0D8]/50" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-[#E8E0D8] rounded w-3/4" />
                  <div className="h-3 bg-[#E8E0D8] rounded w-1/2" />
                  <div className="h-8 bg-[#E8E0D8] rounded-full w-full mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <FadeIn yOffset={10}>
            <div className="card-bento p-16 text-center max-w-lg mx-auto">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#FDF8EC] border border-[#D4A843]/40">
                <CalendarX className="h-8 w-8 text-[#D4A843]" />
              </div>
              <h3 className="font-display text-2xl text-[#241616]">No events found</h3>
              <p className="mt-1.5 text-sm text-[#6B5A56]">
                {activeFilter === "all"
                  ? "No events are currently published on the notice board."
                  : "No events match your current filter."}
              </p>
              {activeFilter !== "all" && (
                <button
                  onClick={() => setActiveFilter("all")}
                  className="mt-6 btn-secondary text-xs"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </FadeIn>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#6B5A56]">
                Available Notices ({filtered.length})
              </p>
              <span className="text-xs text-[#6B5A56]">
                Showing filtered circulars for CC-BS students
              </span>
            </div>

            <motion.div
              layout
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              <AnimatePresence mode="popLayout">
                {filtered.map((event) => (
                  <motion.div
                    key={event.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.3, ease: editorialEase }}
                  >
                    <HoverCard lift={-8} className="h-full">
                      <div className="card-bento flex flex-col overflow-hidden h-full group hover:shadow-[0_16px_40px_rgba(84,26,26,0.08)] transition-shadow">
                        {/* Poster Image Frame */}
                        <div className="relative h-48 overflow-hidden bg-gradient-to-br from-[#541A1A] to-[#241616]">
                          {event.poster_url ? (
                            <img
                              src={event.poster_url}
                              alt={event.title}
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                            />
                          ) : (
                            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
                              <img
                                src="/images/gmu-logo.png"
                                alt="GMU"
                                className="h-10 w-10 opacity-30 object-contain"
                              />
                              <span className="font-display text-xl text-white/50 tracking-wide">
                                Official Notice
                              </span>
                            </div>
                          )}

                          {/* Floating Status Badge */}
                          <div className="absolute top-3 right-3">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold capitalize backdrop-blur-md shadow-xs ${STATUS_COLORS[(event.status ?? "").toLowerCase().trim()] ?? "bg-white text-[#6B5A56]"}`}>
                              {STATUS_DOTS[(event.status ?? "").toLowerCase().trim()] && (
                                <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${STATUS_DOTS[(event.status ?? "").toLowerCase().trim()]}`} />
                              )}
                              {event.status}
                            </span>
                          </div>
                        </div>

                        {/* Bento Body */}
                        <div className="flex flex-1 flex-col p-6 bg-white">
                          {/* Target Years & Branches */}
                          <div className="mb-3 flex flex-wrap gap-1.5">
                            {parseTargetGroups(event.target_groups).map((g) => (
                              <span
                                key={g}
                                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${GROUP_COLORS[(g - 1) % 4]}`}
                              >
                                {YEAR_LABELS[g] ?? `Year ${g}`}
                              </span>
                            ))}
                            {event.target_branches && event.target_branches.map((b) => (
                              b !== "ALL" && (
                                <span
                                  key={b}
                                  className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-[#FDF8EC] text-[#541A1A] border border-[#D4A843]/40"
                                >
                                  {b}
                                </span>
                              )
                            ))}
                          </div>

                          {/* Event Title (Editorial Serif) */}
                          <h3 className="font-display text-2xl text-[#241616] leading-tight line-clamp-2 mb-2 group-hover:text-[#541A1A] transition-colors">
                            {event.title}
                          </h3>

                          {/* Description */}
                          <p className="text-xs text-[#6B5A56] line-clamp-2 mb-5 flex-1 leading-relaxed">
                            {event.description}
                          </p>

                          {/* Metadata strip */}
                          <div className="space-y-2 mb-6 pt-3 border-t border-[#E8E0D8]/60 text-xs text-[#6B5A56]">
                            <div className="flex items-center gap-2">
                              <CalendarDays className="h-3.5 w-3.5 text-[#541A1A] flex-shrink-0" />
                              <span className="font-medium">{formatDate(event.event_date)}</span>
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3.5 w-3.5 text-[#541A1A] flex-shrink-0" />
                                <span className="truncate">{event.location}</span>
                              </div>
                            )}
                            {event.max_participants && (
                              <div className="flex items-center gap-2">
                                <Users className="h-3.5 w-3.5 text-[#541A1A] flex-shrink-0" />
                                <span>Max {event.max_participants} seats</span>
                              </div>
                            )}
                          </div>

                          {/* Bento Action Button */}
                          <Link
                            href={`/events/${event.id}`}
                            className="btn-primary w-full justify-center text-xs py-2.5 font-semibold group/btn"
                          >
                            <span>View Guidelines &amp; Register</span>
                            <motion.span
                              className="inline-flex items-center"
                              whileHover={{ x: 4 }}
                              transition={{ type: "spring", stiffness: 380, damping: 25 }}
                            >
                              <ArrowRight className="h-3.5 w-3.5 text-[#D4A843] group-hover/btn:translate-x-1.5 transition-transform" />
                            </motion.span>
                          </Link>
                        </div>
                      </div>
                    </HoverCard>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
