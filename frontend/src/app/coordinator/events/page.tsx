"use client";

import { useEffect, useState, useRef, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { listEvents, createEvent, updateEventStatus } from "@/lib/api";
import {
  Plus, CalendarDays, MapPin, Users, Upload,
  X, Loader2, FolderOpen, ArrowRight, CheckCircle2,
  Tag, IndianRupee, ShieldCheck, Trophy, Sparkles, Check,
} from "lucide-react";
import {
  motion,
  AnimatePresence,
  HoverCard,
  FadeIn,
  editorialEase,
} from "@/components/Motion";

type Event = {
  id: string; title: string; description: string | null; status: string;
  event_date: string | null; location: string | null;
  target_groups: number[]; target_branches?: string[] | null;
  event_type?: string | null; max_participants: number | null;
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-white text-[#6B5A56] border border-[#E8E0D8]",
  open: "bg-[#FDF8EC] text-[#B88E2F] border border-[#D4A843]/40",
  live: "bg-[#F7EFEF] text-[#541A1A] border border-[#541A1A]/30",
  concluded: "bg-[#FBF9F6] text-[#6B5A56] border border-[#E8E0D8]",
};
const STATUS_NEXT: Record<string, string | null> = {
  draft: "open", open: "live", live: "concluded", concluded: null,
};
const STATUS_NEXT_LABEL: Record<string, string> = {
  draft: "Open Registrations", open: "Mark Live", live: "Conclude Event",
};

type Toast = { id: number; message: string; type: "success" | "error" };

const YEARS = [
  { group: 1, label: "1st Year" },
  { group: 2, label: "2nd Year" },
  { group: 3, label: "3rd Year" },
  { group: 4, label: "4th Year" },
] as const;

const EVENT_TYPES = [
  "Workshop",
  "Hackathon",
  "Seminar",
  "1-Hour Session",
  "Competition",
  "Guest Lecture",
];

export default function CoordinatorEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);
  const toastId = useRef(0);

  const [form, setForm] = useState({
    title: "",
    description: "",
    event_date: "",
    location: "",
    max_participants: "",
    rules: "",
    target_groups: [1, 2, 3, 4] as number[],
    target_branches: ["ALL"] as string[],
    event_type: "Workshop",
    budget: "",
    venue_permission_status: "pending",
    judgment_criteria: "",
    prizes: "",
  });
  const [circular, setCircular] = useState<File | null>(null);
  const [poster, setPoster] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const circularRef = useRef<HTMLInputElement>(null);
  const posterRef = useRef<HTMLInputElement>(null);

  const addToast = (message: string, type: "success" | "error") => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  };

  const fetchEvents = () => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }

    // Role guard: non-coordinators/non-admins are redirected to student dashboard
    const storedUser = localStorage.getItem("user_info");
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        if (u.role === "student") {
          router.push("/student/dashboard");
          return;
        }
      } catch {}
    }

    setLoading(true);
    listEvents()
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch(() => addToast("Failed to load events.", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchEvents(); }, []);

  const setF = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const toggleGroup = (g: number) => {
    const current = form.target_groups;
    if (current.includes(g)) {
      setF("target_groups", current.filter((x) => x !== g));
    } else {
      setF("target_groups", [...current, g].sort());
    }
  };

  const toggleAllGroups = () => {
    if (form.target_groups.length === 4) {
      setF("target_groups", []);
    } else {
      setF("target_groups", [1, 2, 3, 4]);
    }
  };

  const selectBranch = (branch: "ALL" | "CC" | "BS") => {
    if (branch === "ALL") {
      setF("target_branches", ["ALL"]);
      return;
    }
    const filtered = form.target_branches.filter((b) => b !== "ALL");
    if (filtered.includes(branch)) {
      const next = filtered.filter((b) => b !== branch);
      setF("target_branches", next.length === 0 ? ["ALL"] : next);
    } else {
      setF("target_branches", [...filtered, branch]);
    }
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (form.target_groups.length === 0) {
      addToast("Select at least one eligible year.", "error");
      return;
    }
    setCreating(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("description", form.description);
      if (form.event_date) fd.append("event_date", new Date(form.event_date).toISOString());
      if (form.location) fd.append("location", form.location);
      if (form.max_participants) fd.append("max_participants", form.max_participants);
      if (form.rules) fd.append("rules", form.rules);
      fd.append("target_groups", JSON.stringify(form.target_groups.map(Number)));
      fd.append("target_branches", JSON.stringify(form.target_branches));
      if (form.event_type) fd.append("event_type", form.event_type);
      if (form.budget) fd.append("budget", form.budget);
      fd.append("venue_permission_status", form.venue_permission_status);
      if (form.judgment_criteria) fd.append("judgment_criteria", form.judgment_criteria);
      if (form.prizes) fd.append("prizes", form.prizes);
      fd.append("status", "open");
      if (circular) fd.append("circular", circular);
      if (poster) fd.append("poster", poster);

      const created = await createEvent(fd);
      addToast("Event circular & plan published successfully!", "success");
      setDrawerOpen(false);
      setForm({
        title: "",
        description: "",
        event_date: "",
        location: "",
        max_participants: "",
        rules: "",
        target_groups: [1, 2, 3, 4],
        target_branches: ["ALL"],
        event_type: "Workshop",
        budget: "",
        venue_permission_status: "pending",
        judgment_criteria: "",
        prizes: "",
      });
      setCircular(null);
      setPoster(null);
      if (created && created.id) {
        setEvents((prev) => [created, ...prev.filter((e) => e.id !== created.id)]);
      }
      fetchEvents();
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : "Failed to create event.", "error");
    } finally {
      setCreating(false);
    }
  };

  const advanceStatus = async (eventId: string, nextStatus: string) => {
    setStatusLoading(eventId);
    try {
      await updateEventStatus(eventId, nextStatus);
      setEvents((evs) => evs.map((e) => e.id === eventId ? { ...e, status: nextStatus } : e));
      addToast(`Status updated to "${nextStatus}".`, "success");
    } catch {
      addToast("Failed to update status.", "error");
    } finally {
      setStatusLoading(null);
    }
  };

  const formatDate = (d: string | null) => d
    ? new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })
    : "TBD";

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 pb-20">
      {/* Header with FadeIn */}
      <FadeIn yOffset={10}>
        <div className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D4A843]/40 bg-[#FDF8EC] px-3.5 py-1 text-xs font-semibold text-[#541A1A] mb-2">
              <Sparkles className="h-3.5 w-3.5 text-[#D4A843]" />
              <span>Coordinator Hub</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl text-[#241616] tracking-tight">
              Department Notices &amp; Events
            </h1>
            <p className="text-xs text-[#6B5A56] mt-1 font-medium">GM University • Dept. of Cloud Computing &amp; Business Systems</p>
          </div>
          <button onClick={() => setDrawerOpen(true)} className="btn-primary flex-shrink-0 self-start sm:self-center shadow-md">
            <Plus className="h-4 w-4 text-[#D4A843]" />
            <span>Publish New Notice</span>
          </button>
        </div>
      </FadeIn>

      {/* Events bento grid */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="card-bento p-6 animate-pulse space-y-4">
              <div className="h-6 bg-[#E8E0D8]/40 rounded-xl w-3/4" />
              <div className="h-4 bg-[#E8E0D8]/30 rounded-xl w-1/2" />
              <div className="h-4 bg-[#E8E0D8]/30 rounded-xl w-5/6" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <FadeIn yOffset={8}>
          <div className="card-bento p-16 text-center max-w-lg mx-auto">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#FDF8EC] border border-[#D4A843]/40">
              <FolderOpen className="h-8 w-8 text-[#D4A843]" />
            </div>
            <h3 className="font-display text-2xl text-[#241616] mb-1">No circulars created yet</h3>
            <p className="text-xs text-[#6B5A56] mb-6">Create the first department notice or competition to begin accepting registrations.</p>
            <button onClick={() => setDrawerOpen(true)} className="btn-primary inline-flex text-xs">
              <Plus className="h-3.5 w-3.5 text-[#D4A843]" /> Create Notice
            </button>
          </div>
        </FadeIn>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => {
            const next = STATUS_NEXT[event.status];
            return (
              <HoverCard lift={-8} key={event.id} className="h-full">
                <div className="card-bento flex flex-col p-6 h-full hover:shadow-[0_16px_40px_rgba(84,26,26,0.08)] transition-all">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${STATUS_COLORS[event.status]}`}>
                      {event.status}
                    </span>
                    {next && (
                      <button
                        onClick={() => advanceStatus(event.id, next)}
                        disabled={statusLoading === event.id}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#541A1A] hover:text-[#3E1212] disabled:opacity-50"
                      >
                        {statusLoading === event.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <CheckCircle2 className="h-3.5 w-3.5 text-[#D4A843]" />}
                        <span>{STATUS_NEXT_LABEL[event.status]}</span>
                      </button>
                    )}
                  </div>

                  {event.event_type && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#D4A843] mb-1">
                      <Tag className="h-3 w-3" /> {event.event_type}
                    </span>
                  )}

                  <h3 className="font-display text-2xl text-[#241616] mb-2 line-clamp-2 leading-tight">{event.title}</h3>
                  <p className="text-xs text-[#6B5A56] line-clamp-2 mb-5 flex-1 leading-relaxed">{event.description}</p>

                  <div className="space-y-1.5 mb-5 pt-3 border-t border-[#E8E0D8]/60 text-xs text-[#6B5A56]">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-3.5 w-3.5 text-[#541A1A]" /> {formatDate(event.event_date)}
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-[#541A1A]" /> {event.location}
                      </div>
                    )}
                    {event.max_participants && (
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-[#541A1A]" /> Max {event.max_participants} seats
                      </div>
                    )}
                  </div>

                  <Link href={`/coordinator/events/${event.id}`} className="btn-secondary text-xs justify-center w-full py-2.5">
                    <span>Manage Event Hub</span>
                    <ArrowRight className="h-3.5 w-3.5 text-[#541A1A]" />
                  </Link>
                </div>
              </HoverCard>
            );
          })}
        </div>
      )}

      {/* Slide-over Drawer with AnimatePresence */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop with Fade */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-40 bg-[#241616]/40 backdrop-blur-xs"
              onClick={() => setDrawerOpen(false)}
            />

            {/* Drawer with Spring Physics Slide */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-xl flex flex-col bg-white shadow-2xl border-l border-[#E8E0D8]"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between border-b border-[#E8E0D8] px-7 py-5 flex-shrink-0 bg-[#FBF9F6]">
                <div>
                  <h2 className="font-display text-3xl text-[#241616]">Create Department Notice</h2>
                  <p className="text-xs text-[#6B5A56] mt-0.5">Define targeting, planning, guidelines &amp; circular</p>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="h-8 w-8 rounded-full border border-[#E8E0D8] flex items-center justify-center text-[#6B5A56] hover:bg-[#F7EFEF] hover:text-[#241616] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Drawer form */}
              <form onSubmit={handleCreate} className="flex-1 overflow-y-auto px-7 py-6 space-y-5">
                <div>
                  <label className="label">Event Title *</label>
                  <input
                    className="input"
                    placeholder="e.g. AWS Cloud Architecture Hackathon 2026"
                    value={form.title}
                    onChange={(e) => setF("title", e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Event Type</label>
                    <select
                      className="input cursor-pointer"
                      value={form.event_type}
                      onChange={(e) => setF("event_type", e.target.value)}
                    >
                      {EVENT_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Estimated Budget</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6B5A56]" />
                      <input
                        className="input pl-8"
                        placeholder="e.g. 5,000"
                        value={form.budget}
                        onChange={(e) => setF("budget", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="label">Overview / Description *</label>
                  <textarea
                    className="input min-h-[85px] h-auto py-3 resize-none"
                    placeholder="Summary of the event objective, agenda, and outcomes…"
                    value={form.description}
                    onChange={(e) => setF("description", e.target.value)}
                    required
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Date &amp; Time *</label>
                    <input
                      className="input"
                      type="datetime-local"
                      value={form.event_date}
                      onChange={(e) => setF("event_date", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Max Seats</label>
                    <input
                      className="input"
                      type="number"
                      min="1"
                      placeholder="e.g. 100"
                      value={form.max_participants}
                      onChange={(e) => setF("max_participants", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Venue Location</label>
                    <input
                      className="input"
                      placeholder="e.g. Lab 402, Block A"
                      value={form.location}
                      onChange={(e) => setF("location", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Venue Permission</label>
                    <select
                      className="input cursor-pointer"
                      value={form.venue_permission_status}
                      onChange={(e) => setF("venue_permission_status", e.target.value)}
                    >
                      <option value="pending">⏳ Pending Approval</option>
                      <option value="approved">✅ Approved by Dean</option>
                    </select>
                  </div>
                </div>

                {/* Target Years */}
                <div className="rounded-2xl border border-[#E8E0D8] bg-[#FBF9F6] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="label mb-0">Eligible Academic Years *</label>
                    <button
                      type="button"
                      onClick={toggleAllGroups}
                      className="text-xs font-bold text-[#541A1A] hover:underline"
                    >
                      {form.target_groups.length === 4 ? "Deselect All" : "Select All Years"}
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {YEARS.map(({ group, label }) => {
                      const selected = form.target_groups.includes(group);
                      return (
                        <button
                          key={group}
                          type="button"
                          onClick={() => toggleGroup(group)}
                          className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold transition-all ${
                            selected
                              ? "border-[#541A1A] bg-[#541A1A] text-white shadow-xs"
                              : "border-[#E8E0D8] bg-white text-[#6B5A56] hover:border-[#D4A843] hover:bg-[#FDF8EC]"
                          }`}
                        >
                          {selected && <Check className="h-3 w-3 text-[#D4A843]" />}
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {form.target_groups.length === 0 && (
                    <p className="mt-1.5 text-xs text-[#541A1A]">Select at least one academic year</p>
                  )}
                </div>

                {/* Target Branches */}
                <div className="rounded-2xl border border-[#E8E0D8] bg-[#FBF9F6] p-4">
                  <label className="label mb-2">Eligible Branches</label>
                  <div className="flex gap-2">
                    {[
                      { key: "ALL", label: "All Branches" },
                      { key: "CC", label: "Cloud Computing (CC)" },
                      { key: "BS", label: "Business Systems (BS)" },
                    ].map(({ key, label }) => {
                      const selected =
                        key === "ALL"
                          ? form.target_branches.includes("ALL")
                          : form.target_branches.includes(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => selectBranch(key as "ALL" | "CC" | "BS")}
                          className={`flex-1 rounded-xl border py-2 px-2 text-xs font-bold transition-all ${
                            selected
                              ? "border-[#D4A843] bg-[#FDF8EC] text-[#241616] shadow-xs"
                              : "border-[#E8E0D8] bg-white text-[#6B5A56] hover:border-[#D4A843]"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Judgment Criteria</label>
                    <textarea
                      className="input min-h-[75px] h-auto py-2.5 resize-none text-xs"
                      rows={2}
                      placeholder="e.g. Architecture (40%), Execution (40%), Presentation (20%)"
                      value={form.judgment_criteria}
                      onChange={(e) => setF("judgment_criteria", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Prizes &amp; Rewards</label>
                    <textarea
                      className="input min-h-[75px] h-auto py-2.5 resize-none text-xs"
                      rows={2}
                      placeholder="e.g. 1st: ₹5,000 + Merit Cert; 2nd: ₹3,000"
                      value={form.prizes}
                      onChange={(e) => setF("prizes", e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Rules &amp; Guidelines</label>
                  <textarea
                    className="input min-h-[80px] h-auto py-3 resize-none"
                    rows={3}
                    placeholder="Eligibility criteria, code of conduct, scoring format…"
                    value={form.rules}
                    onChange={(e) => setF("rules", e.target.value)}
                  />
                </div>

                {/* File dropzones */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Official Circular (PDF)</label>
                    <div
                      onClick={() => circularRef.current?.click()}
                      className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-3 py-4 text-center transition-all ${
                        circular ? "border-[#D4A843] bg-[#FDF8EC]" : "border-[#E8E0D8] bg-[#FBF9F6] hover:border-[#D4A843]"
                      }`}
                    >
                      <Upload className={`h-4 w-4 mb-1 ${circular ? "text-[#541A1A]" : "text-[#6B5A56]"}`} />
                      <p className="text-xs font-bold text-[#241616] truncate max-w-[160px]">
                        {circular ? circular.name : "Select PDF"}
                      </p>
                      <p className="text-[10px] text-[#6B5A56]">Max 10 MB</p>
                    </div>
                    <input
                      ref={circularRef}
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => setCircular(e.target.files?.[0] ?? null)}
                    />
                  </div>

                  <div>
                    <label className="label">Event Poster (PNG / JPG)</label>
                    <div
                      onClick={() => posterRef.current?.click()}
                      className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-3 py-4 text-center transition-all ${
                        poster ? "border-[#D4A843] bg-[#FDF8EC]" : "border-[#E8E0D8] bg-[#FBF9F6] hover:border-[#D4A843]"
                      }`}
                    >
                      <Upload className={`h-4 w-4 mb-1 ${poster ? "text-[#541A1A]" : "text-[#6B5A56]"}`} />
                      <p className="text-xs font-bold text-[#241616] truncate max-w-[160px]">
                        {poster ? poster.name : "Select Poster"}
                      </p>
                      <p className="text-[10px] text-[#6B5A56]">Max 5 MB</p>
                    </div>
                    <input
                      ref={posterRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setPoster(e.target.files?.[0] ?? null)}
                    />
                  </div>
                </div>

                <div className="pt-2 pb-6">
                  <button
                    type="submit"
                    disabled={creating}
                    className="btn-primary w-full justify-center py-3 text-sm font-semibold shadow-md"
                  >
                    {creating ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Publishing…</>
                    ) : (
                      <><Plus className="h-4 w-4 text-[#D4A843]" /> Publish Notice &amp; Plan</>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast stack with AnimatePresence */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.94 }}
              transition={{ duration: 0.25, ease: editorialEase }}
              className={`pointer-events-auto flex items-center gap-3 rounded-full border px-5 py-3 shadow-xl text-xs font-bold backdrop-blur-md ${
                t.type === "success"
                  ? "border-[#D4A843]/50 bg-[#FDF8EC] text-[#241616]"
                  : "border-[#541A1A]/30 bg-[#F7EFEF] text-[#541A1A]"
              }`}
            >
              {t.type === "success"
                ? <CheckCircle2 className="h-4 w-4 text-[#D4A843] flex-shrink-0" />
                : <X className="h-4 w-4 text-[#541A1A] flex-shrink-0" />}
              <span>{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
