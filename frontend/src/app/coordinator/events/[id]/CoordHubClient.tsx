"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getEvent, getRegistrations, exportRegistrations, updateGuidelines,
  updateEventStatus, markAttendance, submitJudgement,
  generateCertificates, downloadReport, uploadEventPhotos,
  getEventFeedback, EventFeedbackSummary,
} from "@/lib/api";
import {
  ChevronRight, Users, CalendarDays, MapPin, Download, Award,
  FileText, CheckCircle2, XCircle, Loader2, Save, ArrowRight,
  ClipboardList, Gavel, GraduationCap, Lock, Camera, Star,
  IndianRupee, ShieldCheck, Trophy, Sparkles, MessageSquare,
  UploadCloud, ExternalLink, Image as ImageIcon,
} from "lucide-react";
import {
  motion,
  AnimatePresence,
  FadeIn,
  editorialEase,
} from "@/components/Motion";

type Event = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  event_date: string | null;
  location: string | null;
  rules: string | null;
  target_groups: number[];
  target_branches?: string[] | null;
  event_type?: string | null;
  budget?: string | null;
  venue_permission_status?: string | null;
  judgment_criteria?: string | null;
  prizes?: string | null;
  concluding_remarks?: string | null;
  event_photos?: string[] | null;
  max_participants: number | null;
};

type Participant = {
  id?: string;
  registration_id?: string;
  student_id?: string;
  student_name: string;
  usn: string | null;
  registered_at: string;
  attended: boolean | null;
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

type Tab = "plan" | "conduct" | "conclude";

export default function CoordHubClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [tab, setTab] = useState<Tab>("plan");
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [guidelinesSaving, setGuidelinesSaving] = useState(false);

  // Planning form state
  const [guidelines, setGuidelines] = useState({
    rules: "",
    location: "",
    max_participants: "",
    event_type: "Workshop",
    budget: "",
    venue_permission_status: "pending",
    judgment_criteria: "",
    prizes: "",
    concluding_remarks: "",
  });

  // Conclude remarks state
  const [remarksSaving, setRemarksSaving] = useState(false);
  const [feedbackData, setFeedbackData] = useState<EventFeedbackSummary | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // Photos state
  const [photosUploading, setPhotosUploading] = useState(false);
  const photosInputRef = useRef<HTMLInputElement>(null);

  // Conduction & Scoring
  const [attendanceLoading, setAttendanceLoading] = useState<string | null>(null);
  const [judgeModal, setJudgeModal] = useState<string | null>(null);
  const [judgeForm, setJudgeForm] = useState({ score: "", rank: "", remarks: "", prize_details: "" });
  const [judgeLoading, setJudgeLoading] = useState(false);
  const [certLoading, setCertLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = () => {
    if (!id) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      router.push("/login");
      return;
    }
    const storedUser = typeof window !== "undefined" ? localStorage.getItem("user_info") : null;
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        if (u.role === "student") {
          router.push("/student/dashboard");
          return;
        }
      } catch {}
    }

    Promise.all([
      getEvent(id).then(setEvent),
      getRegistrations(id).then(setParticipants),
      getEventFeedback(id).then(setFeedbackData).catch(() => null),
    ])
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    if (event) {
      setGuidelines({
        rules: event.rules ?? "",
        location: event.location ?? "",
        max_participants: event.max_participants ? String(event.max_participants) : "",
        event_type: event.event_type ?? "Workshop",
        budget: event.budget ?? "",
        venue_permission_status: event.venue_permission_status ?? "pending",
        judgment_criteria: event.judgment_criteria ?? "",
        prizes: event.prizes ?? "",
        concluding_remarks: event.concluding_remarks ?? "",
      });
    }
  }, [event]);

  // Stage unlocking logic
  const isConductUnlocked = event?.status === "open" || event?.status === "live" || event?.status === "concluded";
  const attendedCount = participants.filter((p) => p.attended === true).length;
  const isConcludeUnlocked = event?.status === "concluded" || (attendedCount > 0 && event?.status !== "draft") || event?.status === "live";

  const advanceStatus = async () => {
    if (!event) return;
    const next = STATUS_NEXT[event.status];
    if (!next) return;
    setStatusLoading(true);
    try {
      await updateEventStatus(event.id, next);
      setEvent({ ...event, status: next });
      showToast(`Status updated to "${next}".`);
      if (next === "open" && tab === "plan") {
        setTab("conduct");
      }
    } catch {
      showToast("Failed to update status.", false);
    } finally {
      setStatusLoading(false);
    }
  };

  const saveGuidelines = async () => {
    if (!event) return;
    setGuidelinesSaving(true);
    try {
      const updated = await updateGuidelines(event.id, {
        rules: guidelines.rules,
        location: guidelines.location,
        max_participants: guidelines.max_participants ? parseInt(guidelines.max_participants) : undefined,
        event_type: guidelines.event_type,
        budget: guidelines.budget,
        venue_permission_status: guidelines.venue_permission_status,
        judgment_criteria: guidelines.judgment_criteria,
        prizes: guidelines.prizes,
        concluding_remarks: guidelines.concluding_remarks,
      });
      setEvent(updated);
      showToast("Event plan & guidelines saved successfully.");
    } catch {
      showToast("Failed to save event plan.", false);
    } finally {
      setGuidelinesSaving(false);
    }
  };

  const saveConcludingRemarks = async () => {
    if (!event) return;
    setRemarksSaving(true);
    try {
      const updated = await updateGuidelines(event.id, {
        concluding_remarks: guidelines.concluding_remarks,
      });
      setEvent(updated);
      showToast("Concluding remarks saved.");
    } catch {
      showToast("Failed to save remarks.", false);
    } finally {
      setRemarksSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!event || !e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    setPhotosUploading(true);
    try {
      const res = await uploadEventPhotos(event.id, files);
      setEvent({ ...event, event_photos: res.event_photos });
      showToast(`${files.length} photo(s) uploaded successfully!`);
    } catch {
      showToast("Failed to upload photos.", false);
    } finally {
      setPhotosUploading(false);
      if (photosInputRef.current) photosInputRef.current.value = "";
    }
  };

  const toggleAttendance = async (regId: string, current: boolean | null) => {
    if (!event || !regId) return;
    setAttendanceLoading(regId);
    try {
      const attended = current !== true;
      await markAttendance(event.id, [regId], attended);
      setParticipants((ps) =>
        ps.map((p) => {
          const matches =
            (p.id && p.id === regId) ||
            (p.registration_id && p.registration_id === regId);
          return matches ? { ...p, attended } : p;
        })
      );
      showToast(attended ? "Marked as attended." : "Marked as absent.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to mark attendance.";
      showToast(msg, false);
    } finally {
      setAttendanceLoading(null);
    }
  };

  const submitScore = async () => {
    if (!event || !judgeModal) return;

    // Validate score (0–100)
    const rawScore = judgeForm.score.trim();
    if (!rawScore) {
      showToast("Please enter a valid numeric score (0–100).", false);
      return;
    }
    const numScore = parseFloat(rawScore);
    if (isNaN(numScore) || numScore < 0 || numScore > 100) {
      showToast("Score must be a number between 0 and 100.", false);
      return;
    }

    // Clean integer rank (>= 1) or undefined
    let cleanRank: number | undefined = undefined;
    const rawRank = judgeForm.rank.trim();
    if (rawRank) {
      const parsedRank = parseInt(rawRank, 10);
      if (isNaN(parsedRank) || parsedRank < 1) {
        showToast("Rank must be a positive whole number (e.g. 1, 2, 3).", false);
        return;
      }
      cleanRank = parsedRank;
    }

    setJudgeLoading(true);
    try {
      await submitJudgement(event.id, {
        registration_id: judgeModal,
        score: numScore,
        rank: cleanRank,
        remarks: judgeForm.remarks.trim() || undefined,
        prize_details: judgeForm.prize_details.trim() || undefined,
      });
      showToast("Judge evaluation recorded successfully.");
      setJudgeModal(null);
      setJudgeForm({ score: "", rank: "", remarks: "", prize_details: "" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit score.";
      showToast(msg, false);
    } finally {
      setJudgeLoading(false);
    }
  };

  const handleExport = async () => {
    if (!event) return;
    try {
      const blob = await exportRegistrations(event.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${event.title}-participants.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast("Export failed.", false);
    }
  };

  const handleGenCerts = async () => {
    if (!event) return;
    setCertLoading(true);
    try {
      await generateCertificates(event.id);
      showToast("Certificates generated successfully!");
    } catch {
      showToast("Certificate generation failed.", false);
    } finally {
      setCertLoading(false);
    }
  };

  const handleReport = async () => {
    if (!event) return;
    setReportLoading(true);
    try {
      const blob = await downloadReport(event.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${event.title}-report.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast("Report download failed.", false);
    } finally {
      setReportLoading(false);
    }
  };

  const formatDate = (d: string | null) => d
    ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "TBD";

  if (loading) return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 space-y-6">
      {[1, 2, 3].map(i => <div key={i} className="card-bento p-8 animate-pulse h-28" />)}
    </div>
  );

  if (!event) return (
    <div className="mx-auto max-w-6xl px-4 py-20 text-center">
      <div className="card-bento p-12 max-w-md mx-auto">
        <p className="font-display text-2xl text-[#241616] mb-3">Notice Not Found</p>
        <Link href="/coordinator/events" className="btn-secondary text-xs">
          <ChevronRight className="h-4 w-4 rotate-180 text-[#541A1A]" /> Return to Events
        </Link>
      </div>
    </div>
  );

  const tabs: { key: Tab; label: string; icon: React.ElementType; unlocked: boolean; hint?: string }[] = [
    { key: "plan", label: "1. Plan & Target", icon: ClipboardList, unlocked: true },
    { key: "conduct", label: "2. Conduct & Photos", icon: Gavel, unlocked: isConductUnlocked, hint: "Unlocks when status is Open or Live" },
    { key: "conclude", label: "3. Conclude & Feedback", icon: GraduationCap, unlocked: isConcludeUnlocked, hint: "Unlocks after attendance is recorded" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 pb-20">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-xs font-semibold text-[#6B5A56]">
        <Link href="/coordinator/events" className="hover:text-[#241616]">Department Events</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-[#241616] truncate max-w-xs">{event.title}</span>
      </nav>

      {/* Event Header Bento with FadeIn */}
      <FadeIn yOffset={10}>
        <div className="card-bento p-7 sm:p-8 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${STATUS_COLORS[event.status]}`}>
                  {event.status}
                </span>
                {event.event_type && (
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#FDF8EC] text-[#541A1A] border border-[#D4A843]/40">
                    {event.event_type}
                  </span>
                )}
                {event.venue_permission_status === "approved" && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <ShieldCheck className="h-3 w-3 text-emerald-600" /> Venue Approved
                  </span>
                )}
              </div>
              <h1 className="font-display text-3xl sm:text-4xl text-[#241616] mb-2">{event.title}</h1>
              <div className="flex flex-wrap gap-4 text-xs text-[#6B5A56]">
                <span className="flex items-center gap-1.5 font-medium">
                  <CalendarDays className="h-3.5 w-3.5 text-[#541A1A]" />
                  {formatDate(event.event_date)}
                </span>
                {event.location && (
                  <span className="flex items-center gap-1.5 font-medium">
                    <MapPin className="h-3.5 w-3.5 text-[#541A1A]" />
                    {event.location}
                  </span>
                )}
                {event.budget && (
                  <span className="flex items-center gap-1.5 font-medium">
                    <IndianRupee className="h-3.5 w-3.5 text-[#541A1A]" />
                    Budget: {event.budget}
                  </span>
                )}
              </div>
            </div>

            {STATUS_NEXT[event.status] && (
              <button
                onClick={advanceStatus}
                disabled={statusLoading}
                className="btn-primary flex-shrink-0 self-start sm:self-center shadow-md"
              >
                {statusLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4 text-[#D4A843]" />
                )}
                <span>{STATUS_NEXT_LABEL[event.status]}</span>
              </button>
            )}
          </div>

          {/* Bento Stat Tiles (Serif Numbers) */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-[#E8E0D8]/70 pt-6">
            {[
              { label: "Registrations", value: participants.length, icon: Users, bg: "bg-[#F7EFEF]", text: "text-[#541A1A]" },
              { label: "Verified Present", value: attendedCount, icon: CheckCircle2, bg: "bg-[#FDF8EC]", text: "text-[#D4A843]" },
              { label: "Photos Taken", value: event.event_photos?.length ?? 0, icon: Camera, bg: "bg-[#FDF8EC]", text: "text-[#D4A843]" },
              { label: "Student Feedback", value: feedbackData ? `${feedbackData.average_rating} ★ (${feedbackData.count})` : "0 ★", icon: Star, bg: "bg-[#FBF9F6]", text: "text-[#D4A843]" },
            ].map(({ label, value, icon: Icon, bg, text }) => (
              <div key={label} className="p-4 rounded-2xl border border-[#E8E0D8] bg-[#FBF9F6]/60">
                <div className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${bg} mb-2`}>
                  <Icon className={`h-3.5 w-3.5 ${text}`} />
                </div>
                <p className="font-display text-2xl sm:text-3xl text-[#241616] leading-none capitalize truncate">
                  {value}
                </p>
                <p className="text-xs font-semibold text-[#6B5A56] mt-2">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>

      {/* 4-Stage Segmented Lifecycle Tabs */}
      <div className="mb-8">
        <div className="glass-pill p-1.5 inline-flex items-center gap-1.5 flex-wrap">
          {tabs.map(({ key, label, icon: Icon, unlocked, hint }) => {
            const isSelected = tab === key;
            return (
              <button
                key={key}
                onClick={() => {
                  if (unlocked) {
                    setTab(key);
                  } else {
                    showToast(hint ?? "Complete previous stages to unlock.", false);
                  }
                }}
                className={`relative flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-full transition-all duration-150 ${
                  isSelected
                    ? "text-white"
                    : unlocked
                    ? "text-[#6B5A56] hover:text-[#241616] hover:bg-white/60"
                    : "text-[#A89C98] opacity-60 cursor-not-allowed"
                }`}
              >
                {isSelected && (
                  <motion.span
                    layoutId="coord-tab-pill"
                    className="absolute inset-0 rounded-full bg-[#541A1A] -z-10 shadow-xs"
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  />
                )}
                {unlocked ? (
                  <Icon className="h-3.5 w-3.5 relative z-10" />
                ) : (
                  <Lock className="h-3.5 w-3.5 relative z-10" />
                )}
                <span className="relative z-10">{label}</span>
                {!unlocked && (
                  <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full bg-[#E8E0D8]/60 text-[#6B5A56]">
                    Locked
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Crossfade Tab Panels */}
      <AnimatePresence mode="wait">
        {/* STAGE 1: PLAN TAB */}
        {tab === "plan" && (
          <motion.div
            key="plan"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: editorialEase }}
            className="space-y-6"
          >
            {/* Guidelines & Logistics Bento Card */}
            <div className="card-bento p-7 sm:p-8">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-display text-2xl text-[#241616]">Stage 1: Planning &amp; Logistics</h2>
                  <p className="text-xs text-[#6B5A56] mt-0.5">Edit rules, location, budget, criteria, and prizes anytime</p>
                </div>
                <button
                  onClick={saveGuidelines}
                  disabled={guidelinesSaving}
                  className="btn-primary text-xs font-semibold shadow-xs"
                >
                  {guidelinesSaving ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                  ) : (
                    <><Save className="h-4 w-4 text-[#D4A843]" /> Save Changes</>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="label">Event Type</label>
                  <input
                    className="input"
                    value={guidelines.event_type}
                    onChange={(e) => setGuidelines((g) => ({ ...g, event_type: e.target.value }))}
                    placeholder="e.g. Workshop, Hackathon"
                  />
                </div>
                <div>
                  <label className="label">Estimated Budget</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6B5A56]" />
                    <input
                      className="input pl-8"
                      value={guidelines.budget}
                      onChange={(e) => setGuidelines((g) => ({ ...g, budget: e.target.value }))}
                      placeholder="e.g. 5,000"
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Venue Permission</label>
                  <select
                    className="input cursor-pointer"
                    value={guidelines.venue_permission_status}
                    onChange={(e) => setGuidelines((g) => ({ ...g, venue_permission_status: e.target.value }))}
                  >
                    <option value="pending">⏳ Pending Approval</option>
                    <option value="approved">✅ Approved</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="label">Venue / Room</label>
                  <input
                    className="input"
                    value={guidelines.location}
                    onChange={(e) => setGuidelines((g) => ({ ...g, location: e.target.value }))}
                    placeholder="e.g. Main Auditorium, Block A"
                  />
                </div>
                <div>
                  <label className="label">Max Seats</label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    value={guidelines.max_participants}
                    onChange={(e) => setGuidelines((g) => ({ ...g, max_participants: e.target.value }))}
                    placeholder="e.g. 100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="label">Judgment Criteria</label>
                  <textarea
                    className="input min-h-[90px] h-auto py-2.5 resize-none text-xs"
                    rows={3}
                    value={guidelines.judgment_criteria}
                    onChange={(e) => setGuidelines((g) => ({ ...g, judgment_criteria: e.target.value }))}
                    placeholder="e.g. Innovation (40%), Technical Execution (40%), Presentation (20%)"
                  />
                </div>
                <div>
                  <label className="label">Prizes &amp; Rewards</label>
                  <textarea
                    className="input min-h-[90px] h-auto py-2.5 resize-none text-xs"
                    rows={3}
                    value={guidelines.prizes}
                    onChange={(e) => setGuidelines((g) => ({ ...g, prizes: e.target.value }))}
                    placeholder="e.g. 1st: ₹5,000 + Trophy, 2nd: ₹3,000"
                  />
                </div>
              </div>

              <div>
                <label className="label">Rules &amp; Guidelines</label>
                <textarea
                  className="input min-h-[110px] h-auto py-3 resize-none"
                  rows={4}
                  value={guidelines.rules}
                  onChange={(e) => setGuidelines((g) => ({ ...g, rules: e.target.value }))}
                  placeholder="Enter eligibility rules, format, code of conduct, scoring format…"
                />
              </div>
            </div>

            {/* Participant Table */}
            <div className="card-bento overflow-hidden">
              <div className="flex items-center justify-between gap-4 px-7 py-5 border-b border-[#E8E0D8] bg-[#FBF9F6]">
                <div>
                  <h2 className="font-display text-2xl text-[#241616]">
                    Registered Attendees
                  </h2>
                  <p className="text-xs text-[#6B5A56]">{participants.length} students enrolled</p>
                </div>
                <button onClick={handleExport} className="btn-secondary text-xs py-2 px-4 font-semibold">
                  <Download className="h-3.5 w-3.5 text-[#541A1A]" /> Export to Excel
                </button>
              </div>
              {participants.length === 0 ? (
                <div className="py-16 text-center text-xs text-[#6B5A56]">No student registrations yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#E8E0D8] bg-[#FBF9F6]/50">
                        <th className="text-left px-7 py-3 font-bold text-[#6B5A56] uppercase tracking-wider">Student Name</th>
                        <th className="text-left px-7 py-3 font-bold text-[#6B5A56] uppercase tracking-wider">USN</th>
                        <th className="text-left px-7 py-3 font-bold text-[#6B5A56] uppercase tracking-wider">Registered</th>
                        <th className="text-left px-7 py-3 font-bold text-[#6B5A56] uppercase tracking-wider">Attendance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E0D8]">
                      {participants.map((p, idx) => {
                        const rowKey = p.id ?? p.registration_id ?? `${p.student_id ?? p.usn ?? "student"}-${idx}`;
                        return (
                          <tr key={rowKey} className="hover:bg-[#FBF9F6] transition-colors py-4">
                            <td className="px-7 py-4 font-semibold text-[#241616]">{p.student_name}</td>
                            <td className="px-7 py-4 text-[#6B5A56] font-mono">{p.usn ?? "—"}</td>
                            <td className="px-7 py-4 text-[#6B5A56]">{formatDate(p.registered_at)}</td>
                            <td className="px-7 py-4">
                              {p.attended === true ? (
                                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-[#FDF8EC] text-[#B88E2F] border border-[#D4A843]/40">
                                  <CheckCircle2 className="h-3 w-3" /> Attended
                                </span>
                              ) : p.attended === false ? (
                                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-[#F7EFEF] text-[#541A1A] border border-[#541A1A]/30">
                                  <XCircle className="h-3 w-3" /> Absent
                                </span>
                              ) : (
                                <span className="text-[11px] text-[#6B5A56]">Pending</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* STAGE 2: CONDUCT & PHOTOS TAB */}
        {tab === "conduct" && (
          <motion.div
            key="conduct"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: editorialEase }}
            className="space-y-6"
          >
            {/* Event Conduction Photos Bento */}
            <div className="card-bento p-7 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#D4A843] mb-1">
                    <Camera className="h-3.5 w-3.5" />
                    <span>Conduction Gallery</span>
                  </div>
                  <h2 className="font-display text-2xl text-[#241616]">Upload Event Conduction Photos</h2>
                  <p className="text-xs text-[#6B5A56] mt-0.5">
                    Archive photographs from the live session or competition for departmental accreditation
                  </p>
                </div>
                <div>
                  <button
                    onClick={() => photosInputRef.current?.click()}
                    disabled={photosUploading}
                    className="btn-primary text-xs font-semibold shadow-xs"
                  >
                    {photosUploading ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…</>
                    ) : (
                      <><UploadCloud className="h-3.5 w-3.5 text-[#D4A843]" /> Upload Photos</>
                    )}
                  </button>
                  <input
                    ref={photosInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </div>
              </div>

              {/* Photo preview gallery */}
              {(!event.event_photos || event.event_photos.length === 0) ? (
                <div
                  onClick={() => photosInputRef.current?.click()}
                  className="rounded-2xl border-2 border-dashed border-[#E8E0D8] bg-[#FBF9F6] p-8 text-center cursor-pointer hover:border-[#D4A843] transition-colors"
                >
                  <ImageIcon className="h-8 w-8 text-[#6B5A56] mx-auto mb-2 opacity-60" />
                  <p className="text-xs font-bold text-[#241616]">No event photos uploaded yet</p>
                  <p className="text-[11px] text-[#6B5A56] mt-1">Click to upload JPG or PNG images from the session</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {event.event_photos.map((photoUrl, idx) => (
                    <a
                      key={idx}
                      href={photoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="group relative aspect-video rounded-2xl overflow-hidden border border-[#E8E0D8] bg-[#241616]/5 block"
                    >
                      <img
                        src={photoUrl}
                        alt={`Event Conduction ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5">
                        <ExternalLink className="h-3.5 w-3.5 text-[#D4A843]" /> View Full
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Attendance Roll Card */}
            <div className="card-bento overflow-hidden">
              <div className="px-7 py-5 border-b border-[#E8E0D8] bg-[#FBF9F6] flex items-center justify-between">
                <div>
                  <h2 className="font-display text-2xl text-[#241616]">
                    Live Attendance Roll &amp; Judging
                  </h2>
                  <p className="text-xs text-[#6B5A56]">
                    {attendedCount} of {participants.length} attendees verified present
                  </p>
                </div>
              </div>
              {participants.length === 0 ? (
                <div className="py-16 text-center text-xs text-[#6B5A56]">No registrations to take attendance for.</div>
              ) : (
                <div className="divide-y divide-[#E8E0D8]">
                  {participants.map((p, idx) => {
                    const rowKey = p.id ?? p.registration_id ?? `${p.student_id ?? p.usn ?? "student"}-${idx}`;
                    const regId = p.registration_id ?? p.id ?? rowKey;
                    return (
                      <div key={rowKey} className="flex items-center justify-between gap-4 px-7 py-4 hover:bg-[#FBF9F6] transition-colors">
                        <div>
                          <p className="font-bold text-[#241616] text-sm">{p.student_name}</p>
                          {p.usn && <p className="text-xs text-[#6B5A56] font-mono">{p.usn}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleAttendance(regId, p.attended)}
                            disabled={attendanceLoading === regId}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                              p.attended === true
                                ? "bg-[#FDF8EC] text-[#B88E2F] border border-[#D4A843]/50"
                                : p.attended === false
                                ? "bg-[#F7EFEF] text-[#541A1A] border border-[#541A1A]/30"
                                : "bg-white text-[#6B5A56] border border-[#E8E0D8] hover:bg-[#FDF8EC]"
                            }`}
                          >
                            {attendanceLoading === regId ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : p.attended === true ? (
                              <CheckCircle2 className="h-3 w-3 text-[#D4A843]" />
                            ) : (
                              <XCircle className="h-3 w-3 text-[#541A1A]" />
                            )}
                            <span>{p.attended === true ? "Attended" : p.attended === false ? "Absent" : "Mark Attendance"}</span>
                          </button>
                          <button
                            onClick={() => setJudgeModal(regId)}
                            className="btn-ghost text-xs py-1.5 px-3 text-[#541A1A] font-bold"
                          >
                            <Gavel className="h-3.5 w-3.5 text-[#D4A843]" /> Score / Prize
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Judge score modal with AnimatePresence */}
            <AnimatePresence>
              {judgeModal && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40 bg-[#241616]/40 backdrop-blur-xs"
                    onClick={() => setJudgeModal(null)}
                  />
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 12 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 12 }}
                      transition={{ duration: 0.25, ease: editorialEase }}
                      className="rounded-3xl border border-[#E8E0D8] bg-white p-7 shadow-2xl w-full max-w-sm"
                    >
                      <h3 className="font-display text-2xl text-[#241616] mb-1">Judge Evaluation</h3>
                      {(() => {
                        const target = participants.find(
                          (p) => p.id === judgeModal || p.registration_id === judgeModal
                        );
                        return target ? (
                          <p className="text-xs font-bold text-[#541A1A] mb-1">
                            {target.student_name}
                            {target.usn && (
                              <span className="text-[#6B5A56] font-normal font-mono ml-1.5">
                                ({target.usn})
                              </span>
                            )}
                          </p>
                        ) : null;
                      })()}
                      <p className="text-xs text-[#6B5A56] mb-4">Enter evaluation score and prizes</p>
                      <div className="space-y-3">
                        <div>
                          <label className="label">Score (0–100)</label>
                          <input
                            className="input"
                            type="number"
                            step="0.1"
                            placeholder="e.g. 88.5"
                            value={judgeForm.score}
                            onChange={(e) => setJudgeForm((j) => ({ ...j, score: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="label">Rank (optional)</label>
                          <input
                            className="input"
                            type="number"
                            min="1"
                            placeholder="e.g. 1"
                            value={judgeForm.rank}
                            onChange={(e) => setJudgeForm((j) => ({ ...j, rank: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="label">Prize Details</label>
                          <input
                            className="input"
                            placeholder="e.g. 1st Place Trophy + ₹5,000"
                            value={judgeForm.prize_details}
                            onChange={(e) => setJudgeForm((j) => ({ ...j, prize_details: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="label">Remarks</label>
                          <textarea
                            className="input min-h-[80px] h-auto py-2.5 resize-none"
                            rows={2}
                            placeholder="Observations, technical strengths…"
                            value={judgeForm.remarks}
                            onChange={(e) => setJudgeForm((j) => ({ ...j, remarks: e.target.value }))}
                          />
                        </div>
                        <div className="flex gap-2 pt-2">
                          <button onClick={() => setJudgeModal(null)} className="btn-secondary flex-1 justify-center text-xs">
                            Cancel
                          </button>
                          <button onClick={submitScore} disabled={judgeLoading} className="btn-primary flex-1 justify-center text-xs">
                            {judgeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Score"}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* STAGE 3: CONCLUDE & FEEDBACK TAB */}
        {tab === "conclude" && (
          <motion.div
            key="conclude"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: editorialEase }}
            className="space-y-6"
          >
            {/* Concluding Remarks Card */}
            <div className="card-bento p-7 sm:p-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-display text-2xl text-[#241616]">Coordinator Concluding Remarks</h3>
                  <p className="text-xs text-[#6B5A56] mt-0.5">
                    Official faculty summary of the event execution, learning outcomes, and recommendations
                  </p>
                </div>
                <button
                  onClick={saveConcludingRemarks}
                  disabled={remarksSaving}
                  className="btn-primary text-xs font-semibold shadow-xs"
                >
                  {remarksSaving ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                  ) : (
                    <><Save className="h-4 w-4 text-[#D4A843]" /> Save Remarks</>
                  )}
                </button>
              </div>
              <textarea
                className="input min-h-[110px] h-auto py-3 resize-none text-xs"
                rows={4}
                value={guidelines.concluding_remarks}
                onChange={(e) => setGuidelines((g) => ({ ...g, concluding_remarks: e.target.value }))}
                placeholder="The event concluded with high student engagement. 45 students successfully built and deployed serverless microservices. Winner certificates were awarded to Team CloudSprint…"
              />
            </div>

            {/* Student Feedback Bento Card */}
            <div className="card-bento p-7 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#D4A843] mb-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Post-Event Feedback</span>
                  </div>
                  <h3 className="font-display text-2xl text-[#241616]">Submitted Student Feedback</h3>
                  <p className="text-xs text-[#6B5A56]">
                    Ratings and reviews submitted by registered students who attended
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl border border-[#D4A843]/40 bg-[#FDF8EC] px-4 py-2 text-center">
                    <div className="flex items-center gap-1 text-[#241616] font-display text-2xl">
                      <span>{feedbackData?.average_rating ?? "0.0"}</span>
                      <Star className="h-5 w-5 fill-[#D4A843] text-[#D4A843]" />
                    </div>
                    <p className="text-[10px] font-semibold text-[#6B5A56]">{feedbackData?.count ?? 0} Responses</p>
                  </div>
                </div>
              </div>

              {(!feedbackData || feedbackData.feedbacks.length === 0) ? (
                <div className="rounded-2xl border border-[#E8E0D8] bg-[#FBF9F6] p-8 text-center text-xs text-[#6B5A56]">
                  No student feedback submitted yet. Students can submit ratings from their dashboard after the event.
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {feedbackData.feedbacks.map((fb) => (
                    <div key={fb.id} className="p-4 rounded-2xl border border-[#E8E0D8] bg-[#FBF9F6]/50">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-xs text-[#241616]">{fb.user_name ?? "Student"}</span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-3.5 w-3.5 ${
                                star <= fb.rating
                                  ? "fill-[#D4A843] text-[#D4A843]"
                                  : "text-[#E8E0D8]"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {fb.comment && (
                        <p className="text-xs text-[#6B5A56] leading-relaxed">{fb.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Cards: Certificates & Final Dossier */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="card-bento p-8">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FDF8EC] border border-[#D4A843]/40">
                  <Award className="h-6 w-6 text-[#D4A843]" />
                </div>
                <h3 className="font-display text-3xl text-[#241616] mb-2">Issue Certificates</h3>
                <p className="text-xs text-[#6B5A56] mb-6 leading-relaxed">
                  Generate tamper-proof digital certificates with embedded QR verification for all students marked present or awarded prizes.
                </p>
                <button
                  onClick={handleGenCerts}
                  disabled={certLoading}
                  className="btn-primary w-full justify-center text-xs py-3 font-semibold shadow-xs"
                >
                  {certLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
                  ) : (
                    <><Award className="h-4 w-4 text-[#D4A843]" /> Generate Certificates</>
                  )}
                </button>
              </div>

              <div className="card-bento p-8">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F7EFEF] border border-[#541A1A]/20">
                  <FileText className="h-6 w-6 text-[#541A1A]" />
                </div>
                <h3 className="font-display text-3xl text-[#241616] mb-2">Event Report Dossier</h3>
                <p className="text-xs text-[#6B5A56] mb-6 leading-relaxed">
                  Download the official departmental PDF dossier summarizing total registrations, verified attendance rates, and winner rosters.
                </p>
                <button
                  onClick={handleReport}
                  disabled={reportLoading}
                  className="btn-secondary w-full justify-center text-xs py-3 font-semibold"
                >
                  {reportLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
                  ) : (
                    <><Download className="h-4 w-4 text-[#541A1A]" /> Download Report (PDF)</>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast with AnimatePresence */}
      <div className="fixed bottom-6 right-6 z-50 pointer-events-none">
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.94 }}
              transition={{ duration: 0.25, ease: editorialEase }}
              className={`pointer-events-auto flex items-center gap-3 rounded-full border px-5 py-3 shadow-xl text-xs font-bold backdrop-blur-md ${
                toast.ok ? "border-[#D4A843]/50 bg-[#FDF8EC] text-[#241616]" : "border-[#541A1A]/30 bg-[#F7EFEF] text-[#541A1A]"
              }`}
            >
              {toast.ok ? <CheckCircle2 className="h-4 w-4 text-[#D4A843]" /> : <XCircle className="h-4 w-4 text-[#541A1A]" />}
              <span>{toast.msg}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
