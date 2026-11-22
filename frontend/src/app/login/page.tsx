"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";
import { Eye, EyeOff, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { motion, editorialEase } from "@/components/Motion";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await login(email, password);
      localStorage.setItem("token", data.access_token);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      if (res.ok) {
        const me = await res.json();
        localStorage.setItem("user_info", JSON.stringify(me));
        if (me.role === "student") router.push("/student/dashboard");
        else router.push("/coordinator/events");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid credentials. Please verify your email & password.");
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
            Welcome back
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#FDF8EC]/80 font-medium">
            GM University • CC-BS Department Portal
          </p>
        </motion.div>

        {/* High-Craft Glassmorphic Card with Smooth Entrance */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.45, ease: editorialEase }}
          className="rounded-3xl border border-white/30 bg-white/92 backdrop-blur-2xl p-8 sm:p-9 shadow-[0_20px_60px_rgba(36,22,22,0.25)]"
        >
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex items-start gap-2.5 rounded-2xl border border-[#541A1A]/20 bg-[#F7EFEF] px-4 py-3"
            >
              <AlertCircle className="h-4 w-4 text-[#541A1A] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-[#541A1A] font-medium leading-relaxed">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">Email or USN</label>
              <input
                id="email"
                type="text"
                className="input"
                placeholder="you@gmu.edu.in or 1GM22CS001"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="password">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  className="input pr-11"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B5A56] hover:text-[#241616] transition-colors"
                >
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
                <><Loader2 className="h-4 w-4 animate-spin" /> Verifying account…</>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4 text-[#D4A843]" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#E8E0D8]/70 text-center">
            <p className="text-xs text-[#6B5A56]">
              New student in CC-BS?{" "}
              <Link href="/register" className="font-semibold text-[#541A1A] hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </motion.div>

        <p className="mt-6 text-center text-xs text-[#FDF8EC]/60">
          GM University • CC-BS Department Portal &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
