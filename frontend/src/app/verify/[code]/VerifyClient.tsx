"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { verifyCertificateByCode } from "@/lib/api";
import { ShieldCheck, XCircle, GraduationCap, CalendarDays, Award, ArrowLeft, Loader2 } from "lucide-react";
import { motion, editorialEase } from "@/components/Motion";

type CertInfo = {
  valid: boolean; student_name: string; event_title: string;
  cert_type: string; issued_at: string;
};

export default function VerifyClient() {
  const { code } = useParams<{ code: string }>();
  const [result, setResult] = useState<CertInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    if (!code) return;
    verifyCertificateByCode(code)
      .then(setResult)
      .catch(() => setInvalid(true))
      .finally(() => setLoading(false));
  }, [code]);

  if (loading) return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="card-bento p-10 text-center w-full max-w-sm">
        <Loader2 className="h-10 w-10 animate-spin text-[#541A1A] mx-auto mb-3" />
        <p className="text-xs text-[#6B5A56] font-semibold">Verifying certificate authenticity…</p>
      </div>
    </div>
  );

  if (invalid || (result && !result.valid)) return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: editorialEase }}
        className="card-bento p-10 text-center w-full max-w-sm border-[#541A1A]/30"
      >
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#F7EFEF] border border-[#541A1A]/20">
          <XCircle className="h-8 w-8 text-[#541A1A]" />
        </div>
        <h2 className="font-display text-3xl text-[#241616] mb-1">Invalid Certificate</h2>
        <p className="text-xs text-[#6B5A56] mb-6 leading-relaxed">
          This verification code does not match any certificate in our official university database.
        </p>
        <Link href="/" className="btn-secondary inline-flex text-xs">
          <ArrowLeft className="h-4 w-4 text-[#541A1A]" /> Return Home
        </Link>
      </motion.div>
    </div>
  );

  if (!result) return null;

  return (
    <div className="flex min-h-[75vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ scale: 0.97, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: editorialEase }}
          className="card-bento overflow-hidden shadow-[0_20px_50px_rgba(84,26,26,0.08)]"
        >
          {/* Official GMU Certificate Verification Header */}
          <div className="bg-gradient-to-r from-[#3A1010] via-[#541A1A] to-[#2A0B0B] px-8 py-8 text-center text-white border-b-2 border-[#D4A843]">
            <div className="mb-3.5 inline-flex items-center justify-center rounded-2xl bg-white p-2.5 shadow-2xl border border-[#D4A843]/50">
              <img src="/images/gmu-logo.png" alt="GM University" className="h-12 w-12 object-contain" />
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#D4A843]/20 border border-[#D4A843]/40 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#D4A843] mb-2">
              <ShieldCheck className="h-3.5 w-3.5" /> Authenticity Verified
            </div>
            <h2 className="font-display text-3xl text-white tracking-tight">GM University Certificate</h2>
            <p className="text-[#FDF8EC]/80 text-xs mt-0.5">Department of Cloud Computing &amp; Business Systems</p>
          </div>

          {/* Details */}
          <div className="p-7 space-y-4 bg-white">
            <div className="flex items-start gap-3.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F7EFEF] border border-[#541A1A]/20 flex-shrink-0">
                <GraduationCap className="h-5 w-5 text-[#541A1A]" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-[#6B5A56] uppercase tracking-wider">Recipient Name</p>
                <p className="font-display text-2xl text-[#241616] leading-tight">{result.student_name}</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 pt-3 border-t border-[#E8E0D8]/60">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FBF9F6] border border-[#E8E0D8] flex-shrink-0">
                <CalendarDays className="h-5 w-5 text-[#541A1A]" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-[#6B5A56] uppercase tracking-wider">Event Title</p>
                <p className="font-semibold text-[#241616] text-sm">{result.event_title}</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 pt-3 border-t border-[#E8E0D8]/60">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FDF8EC] border border-[#D4A843]/40 flex-shrink-0">
                <Award className="h-5 w-5 text-[#D4A843]" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-[#6B5A56] uppercase tracking-wider">Certificate Type</p>
                <p className="font-semibold text-[#241616] text-sm capitalize">{result.cert_type}</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-[#E8E0D8] bg-[#FBF9F6] p-3 text-center">
              <p className="text-[10px] uppercase font-bold text-[#6B5A56] tracking-wider mb-0.5">Verification Code</p>
              <p className="font-mono text-xs font-bold text-[#241616] break-all">{code}</p>
            </div>

            <div className="text-[11px] text-center text-[#6B5A56] pt-1">
              Issued on {new Date(result.issued_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
        </motion.div>

        <p className="mt-5 text-center text-xs text-[#6B5A56]">
          Cryptographically recorded by GM University CC-BS Portal
        </p>
        <div className="mt-3 text-center">
          <Link href="/" className="btn-ghost text-xs text-[#541A1A] font-semibold">
            <ArrowLeft className="h-3.5 w-3.5" /> Return to Notice Board
          </Link>
        </div>
      </div>
    </div>
  );
}
