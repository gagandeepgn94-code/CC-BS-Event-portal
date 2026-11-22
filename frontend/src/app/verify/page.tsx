"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { motion, editorialEase } from "@/components/Motion";

export default function VerifyIndexPage() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = code.trim();
    if (clean) {
      router.push(`/verify/${clean}`);
    }
  }

  return (
    <div className="mx-auto max-w-lg py-20 px-4 flex items-center justify-center min-h-[75vh]">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: editorialEase }}
        className="card-bento p-8 sm:p-10 text-center w-full shadow-[0_20px_50px_rgba(84,26,26,0.06)]"
      >
        {/* GMU Logo */}
        <div className="mx-auto mb-5 inline-flex items-center justify-center rounded-2xl bg-white p-2.5 border border-[#D4A843]/50 shadow-md">
          <img src="/images/gmu-logo.png" alt="GM University" className="h-12 w-12 object-contain" />
        </div>

        <h1 className="font-display text-4xl text-[#241616] mb-2">Certificate Verification</h1>
        <p className="text-xs sm:text-sm text-[#6B5A56] mb-7 leading-relaxed max-w-sm mx-auto">
          Enter the unique alphanumeric verification code printed on any GM University CC-BS certificate.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. 5a1b3c7d..."
              className="input text-center font-mono text-sm tracking-wider h-12"
            />
          </div>
          <button
            type="submit"
            className="btn-primary w-full justify-center py-3 text-sm font-semibold shadow-md flex items-center gap-2"
          >
            <ShieldCheck className="h-4 w-4 text-[#D4A843]" />
            <span>Verify Authenticity</span>
            <ArrowRight className="h-4 w-4 text-[#D4A843]" />
          </button>
        </form>

        <p className="text-[11px] text-[#6B5A56] mt-6">
          QR codes on printed certificates redirect directly to this authentication engine.
        </p>
      </motion.div>
    </div>
  );
}
