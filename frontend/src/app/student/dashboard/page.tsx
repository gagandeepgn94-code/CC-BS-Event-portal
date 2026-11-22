"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMyRegistrations, triggerDownload, submitEventFeedback } from "@/lib/api";
import { useRouter } from "next/navigation";
import {
  CalendarDays, MapPin, CheckCircle2, XCircle,
  Clock, Award, Download, ArrowRight, GraduationCap,
  Star, MessageSquare, Loader2, X,
} from "lucide-react";
import { FadeIn, HoverCard, motion, AnimatePresence, editorialEase } from "@/components/Motion";

type Registration = {
  id?: string;
  registration_id?: string;
  event_id: string;
  event_title: string;
  event_date: string | null;
  event_location?: string | null;
  event_status: string;
  attended: boolean | null;
  certificate_url: string | null;
  registered_at: string;
  attendance?: { is_present: boolean } | null;
  certificate?: { download_url?: string | null } | null;
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

export default function StudentDashboard() {
  const router = useRouter();
  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ name: string; target_group: number; role: string } | null>(null);

  // Feedback modal state
  const [feedbackModalReg, setFeedbackModalReg] = useState<Registration | null>(null);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    const stored = localStorage.getItem("user_info");
    if (stored) { try { setUser(JSON.parse(stored)); } catch {} }

    getMyRegistrations()
      .then((data) => {
        if (!Array.isArray(data)) {
          setRegs([]);
          return;
        }
        const normalized: Registration[] = data.map((r, idx) => ({
          ...r,
          id: r.id ?? r.registration_id ?? `reg-${idx}`,
          attended: r.attended ?? r.attendance?.is_present ?? null,
          certificate_url: r.certificate_url ?? r.certificate?.download_url ?? null,
          event_location: r.event_location ?? null,
        }));
        setRegs(normalized);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const handleSubmitFeedback = async () => {
    if (!feedbackModalReg) return;
    setSubmittingFeedback(true);
    try {
      await submitEventFeedback(feedbackModalReg.event_id, {
        rating,
        comment: comment.trim() || undefined,
      });
      setFeedbackSuccess("Thank you! Your feedback has been recorded.");
      setTimeout(() => {
        setFeedbackModalReg(null);
        setComment("");
        setFeedbackSuccess(null);
      }, 1500);
    } catch {
      alert("Failed to submit feedback. Please try again.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const formatDate = (d: string | null) => d
    ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "TBD";

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 pb-20">
      {/* Header */}
      <div className="mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D4A843]/40 bg-[#FDF8EC] px-3.5 py-1 text-xs font-semibold text-[#541A1A] mb-2">
              <span>GM University Student Portal</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl text-[#241616] tracking-tight">
              My Academic Events
            </h1>
            {user && (
              <div className="flex items-center gap-2.5 mt-2">
                <p className="text-[#6B5A56] text-xs font-medium">Logged in as <span className="font-bold text-[#241616]">{user.name}</span></p>
                {user.target_group && (
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${GROUP_COLORS[(user.target_group - 1) % 4]}`}>
                    {YEAR_LABELS[user.target_group] ?? `Year ${user.target_group}`}
                  </span>
                )}
              </div>
            )}
          </div>
          <Link href="/" className="btn-secondary text-xs self-start sm:self-center">
            <CalendarDays className="h-3.5 w-3.5 text-[#541A1A]" /> Browse Notice Board
          </Link>
        </div>

        {/* Bento Stat Tiles (Editorial Serif Numbers) */}
        <FadeIn delay={0.1} yOffset={20}>
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Registered", value: regs.length, icon: CalendarDays, bg: "bg-[#F7EFEF]", text: "text-[#541A1A]" },
              { label: "Events Attended", value: regs.filter(r => r.attended).length, icon: CheckCircle2, bg: "bg-[#FDF8EC]", text: "text-[#D4A843]" },
              { label: "Certificates Earned", value: regs.filter(r => r.certificate_url).length, icon: Award, bg: "bg-[#FDF8EC]", text: "text-[#D4A843]" },
              { label: "Upcoming Events", value: regs.filter(r => r.event_status === "open" || r.event_status === "live").length, icon: Clock, bg: "bg-[#FBF9F6]", text: "text-[#541A1A]" },
            ].map(({ label, value, icon: Icon, bg, text }) => (
              <div key={label} className="card-bento p-5">
                <div className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${bg} mb-2`}>
                  <Icon className={`h-4 w-4 ${text}`} />
                </div>
                <p className="font-display text-4xl text-[#241616] leading-none mt-1">
                  {loading ? "—" : value}
                </p>
                <p className="text-xs font-semibold text-[#6B5A56] mt-2">{label}</p>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>

      {/* Registrations List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6B5A56]">
            Registered Circulars ({regs.length})
          </h2>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="card-bento p-6 animate-pulse space-y-3">
                <div className="h-5 bg-[#E8E0D8]/40 rounded-xl w-1/3" />
                <div className="h-4 bg-[#E8E0D8]/30 rounded-xl w-1/4" />
              </div>
            ))}
          </div>
        ) : regs.length === 0 ? (
          <div className="card-bento p-16 text-center max-w-lg mx-auto">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#FDF8EC] border border-[#D4A843]/40">
              <GraduationCap className="h-8 w-8 text-[#D4A843]" />
            </div>
            <h3 className="font-display text-2xl text-[#241616] mb-1">No event registrations yet</h3>
            <p className="text-xs text-[#6B5A56] mb-6">Explore the CC-BS notice board to participate in department workshops and competitions.</p>
            <Link href="/" className="btn-primary inline-flex text-xs">
              <CalendarDays className="h-3.5 w-3.5 text-[#D4A843]" /> Explore Circulars
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {regs.map((reg, idx) => (
              <HoverCard lift={-4} key={reg.id ?? reg.registration_id ?? `${reg.event_id}-${idx}`}>
                <div className="card-bento p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 group hover:border-[#D4A843]/60 transition-all">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_COLORS[reg.event_status] ?? "bg-white text-[#6B5A56]"}`}>
                        {reg.event_status}
                      </span>
                      {/* Attendance indicator */}
                      {reg.attended === true && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#FDF8EC] text-[#B88E2F] border border-[#D4A843]/40">
                          <CheckCircle2 className="h-3 w-3" /> Attended
                        </span>
                      )}
                      {reg.attended === false && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#F7EFEF] text-[#541A1A] border border-[#541A1A]/30">
                          <XCircle className="h-3 w-3" /> Absent
                        </span>
                      )}
                      {reg.attended === null && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#FBF9F6] text-[#6B5A56] border border-[#E8E0D8]">
                          <Clock className="h-3 w-3" /> Attendance Pending
                        </span>
                      )}
                    </div>

                    <h3 className="font-display text-2xl text-[#241616] truncate group-hover:text-[#541A1A] transition-colors">
                      {reg.event_title}
                    </h3>

                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-[#6B5A56]">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-[#541A1A]" /> {formatDate(reg.event_date)}
                      </span>
                      {reg.event_location && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-[#541A1A]" /> {reg.event_location}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">
                    {/* Submit Feedback for attended events */}
                    {reg.attended === true && (
                      <button
                        onClick={() => {
                          setFeedbackModalReg(reg);
                          setRating(5);
                          setComment("");
                        }}
                        className="btn-secondary text-xs py-2 px-3.5 font-semibold flex items-center gap-1.5 text-[#541A1A] hover:bg-[#FDF8EC] border-[#D4A843]/50"
                      >
                        <Star className="h-3.5 w-3.5 text-[#D4A843] fill-[#D4A843]" />
                        <span>Submit Feedback</span>
                      </button>
                    )}

                    {reg.certificate_url && (
                      <button
                        onClick={() => triggerDownload(reg.certificate_url!, `certificate-${reg.event_title}.pdf`)}
                        className="btn-gold text-xs py-2 px-4 font-semibold shadow-xs"
                      >
                        <Award className="h-3.5 w-3.5" />
                        <span>Download Certificate</span>
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <Link
                      href={`/events/${reg.event_id}`}
                      className="btn-secondary text-xs py-2 px-4 flex items-center gap-1.5"
                    >
                      <span>View Notice</span>
                      <ArrowRight className="h-3.5 w-3.5 text-[#541A1A]" />
                    </Link>
                  </div>
                </div>
              </HoverCard>
            ))}
          </div>
        )}
      </div>

      {/* Student Feedback Modal with AnimatePresence */}
      <AnimatePresence>
        {feedbackModalReg && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-[#241616]/40 backdrop-blur-xs"
              onClick={() => setFeedbackModalReg(null)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 12 }}
                transition={{ duration: 0.25, ease: editorialEase }}
                className="rounded-3xl border border-[#E8E0D8] bg-white p-7 shadow-2xl w-full max-w-md relative"
              >
                <button
                  onClick={() => setFeedbackModalReg(null)}
                  className="absolute right-5 top-5 h-8 w-8 rounded-full border border-[#E8E0D8] flex items-center justify-center text-[#6B5A56] hover:bg-[#F7EFEF]"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="mb-4">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#D4A843] mb-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Post-Conduction Review</span>
                  </div>
                  <h3 className="font-display text-2xl text-[#241616]">
                    Rate Event Experience
                  </h3>
                  <p className="text-xs text-[#6B5A56] mt-0.5 line-clamp-1">
                    {feedbackModalReg.event_title}
                  </p>
                </div>

                {feedbackSuccess ? (
                  <div className="rounded-2xl bg-[#FDF8EC] border border-[#D4A843]/50 p-6 text-center text-xs font-bold text-[#541A1A]">
                    <CheckCircle2 className="h-8 w-8 text-[#D4A843] mx-auto mb-2" />
                    {feedbackSuccess}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="label">Overall Rating (1–5 Stars)</label>
                      <div className="flex items-center gap-2 mt-1">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const active = star <= (hoverRating || rating);
                          return (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRating(star)}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(0)}
                              className="p-1 hover:scale-115 transition-transform"
                            >
                              <Star
                                className={`h-7 w-7 transition-colors ${
                                  active
                                    ? "fill-[#D4A843] text-[#D4A843]"
                                    : "text-[#E8E0D8] fill-none"
                                }`}
                              />
                            </button>
                          );
                        })}
                        <span className="text-xs font-bold text-[#541A1A] ml-2">
                          {rating} of 5
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="label">What did you learn or enjoy most?</label>
                      <textarea
                        className="input min-h-[90px] h-auto py-2.5 resize-none text-xs"
                        rows={3}
                        placeholder="Share your experience, hands-on takeaways, or topics for future workshops…"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setFeedbackModalReg(null)}
                        className="btn-secondary flex-1 justify-center text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmitFeedback}
                        disabled={submittingFeedback}
                        className="btn-primary flex-1 justify-center text-xs shadow-xs"
                      >
                        {submittingFeedback ? (
                          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting…</>
                        ) : (
                          "Submit Review"
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
