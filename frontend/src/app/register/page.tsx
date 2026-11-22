"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { register } from "@/lib/api";
import { Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { motion, editorialEase } from "@/components/Motion";

const GROUPS = [1, 2, 3, 4] as const;

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", email: "", password: "", usn: "", target_group: 1 as 1|2|3|4,
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await register(form.name, form.email, form.password, form.usn, form.target_group);
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed. Please check your details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-[92vh] flex items-center justify-center py-16 px-4 bg-cover bg-center"
      style={{ backgroundImage: "url('/images/campus-bg.jpg')" }}
    >
      {/* Full-screen blurred version with dark overlay */}
      <div className="absolute inset-0 bg-[#2A0B0B]/75 backdrop-blur-sm" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#241616] via-[#3A1010]/50 to-transparent" />

      <div className="relative w-full max-w-md">
        {/* Animated Brand Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: editorialEase }}
          className="mb-6 text-center"
        >
          <div className="inline-flex items-center justify-center rounded-2xl bg-white p-2.5 shadow-2xl border border-[#D4A843]/50 mb-3 backdrop-blur-xl">
            <img src="/images/gmu-logo.png" alt="GM University" className="h-12 w-12 object-contain" />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl text-white tracking-tight">
            Create account
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#FDF8EC]/80 font-medium">
            Join the CC-BS Department Portal
          </p>
        </motion.div>

        {/* Card with Smooth Entrance */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.45, ease: editorialEase }}
          className="rounded-3xl border border-white/30 bg-white/92 backdrop-blur-2xl p-8 sm:p-9 shadow-[0_20px_60px_rgba(36,22,22,0.25)]"
        >
          {success ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-3 py-8 text-center"
            >
              <CheckCircle2 className="h-14 w-14 text-[#D4A843]" />
              <h2 className="font-display text-3xl text-[#241616]">Account Created</h2>
              <p className="text-xs text-[#6B5A56]">Redirecting you to the login screen…</p>
            </motion.div>
          ) : (
            <>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-5 flex items-start gap-2.5 rounded-2xl border border-[#541A1A]/20 bg-[#F7EFEF] px-4 py-3"
                >
                  <AlertCircle className="h-4 w-4 text-[#541A1A] mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-[#541A1A] font-medium">{error}</p>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Full Name</label>
                  <input className="input" placeholder="e.g. Rahul Sharma" value={form.name}
                    onChange={(e) => set("name", e.target.value)} required />
                </div>

                <div>
                  <label className="label">University Email</label>
                  <input className="input" type="email" placeholder="you@gmu.edu.in" value={form.email}
                    onChange={(e) => set("email", e.target.value)} required />
                </div>

                <div>
                  <label className="label">USN (University Seat Number)</label>
                  <input className="input" placeholder="e.g. 1GM22CS045" value={form.usn}
                    onChange={(e) => set("usn", e.target.value)} />
                </div>

                <div>
                  <label className="label">Target Group</label>
                  <div className="flex gap-2 mt-1">
                    {GROUPS.map((g) => (
                      <button
                        key={g} type="button"
                        onClick={() => set("target_group", g)}
                        className={`flex-1 rounded-xl border py-2 text-xs font-bold transition-all ${
                          form.target_group === g
                            ? "border-[#541A1A] bg-[#541A1A] text-white shadow-xs"
                            : "border-[#E8E0D8] bg-white text-[#6B5A56] hover:border-[#D4A843]"
                        }`}
                      >
                        G{g}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label">Password</label>
                  <div className="relative">
                    <input className="input pr-11" type={showPw ? "text" : "password"}
                      placeholder="Min 8 characters" value={form.password}
                      onChange={(e) => set("password", e.target.value)} required minLength={8} />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B5A56] hover:text-[#241616]">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full justify-center py-3 text-sm mt-3 font-semibold shadow-md flex items-center gap-2"
                >
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Registering…</>
                  ) : (
                    <>
                      <span>Complete Registration</span>
                      <ArrowRight className="h-4 w-4 text-[#D4A843]" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-[#E8E0D8]/70 text-center">
                <p className="text-xs text-[#6B5A56]">
                  Already have an account?{" "}
                  <Link href="/login" className="font-semibold text-[#541A1A] hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
