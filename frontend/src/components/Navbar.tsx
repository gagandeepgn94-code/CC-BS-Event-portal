"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  CalendarDays,
  ShieldCheck,
  User,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence, editorialEase } from "@/components/Motion";

type UserInfo = { name: string; role: string; email: string };

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-[#F7EFEF] text-[#541A1A] border border-[#541A1A]/20",
  coordinator: "bg-[#FDF8EC] text-[#541A1A] border border-[#D4A843]/40",
  student: "bg-[#FDF8EC] text-[#B88E2F] border border-[#D4A843]/30",
  judge: "bg-white text-[#6B5A56] border border-[#E8E0D8]",
};

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("user_info");
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
  }, [pathname]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user_info");
    setUser(null);
    router.push("/");
  };

  const navLinks = user
    ? user.role === "student"
      ? [
          { href: "/", label: "Notice Board", icon: CalendarDays },
          { href: "/student/dashboard", label: "My Events", icon: LayoutDashboard },
        ]
      : user.role === "admin"
      ? [
          { href: "/", label: "Notice Board", icon: CalendarDays },
          { href: "/coordinator/events", label: "Events", icon: CalendarDays },
          { href: "/coordinator/events", label: "Admin Hub", icon: ShieldCheck },
        ]
      : [
          { href: "/", label: "Notice Board", icon: CalendarDays },
          { href: "/coordinator/events", label: "Coordinator Hub", icon: LayoutDashboard },
        ]
    : [
        { href: "/", label: "Notice Board", icon: CalendarDays },
        { href: "/verify", label: "Verify Certificate", icon: ShieldCheck },
      ];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const isDarkHeroPage = pathname === "/" || pathname === "/login" || pathname === "/register";

  return (
    <div className="sticky top-4 z-50 px-4 sm:px-6 max-w-6xl mx-auto w-full">
      {/* Floating Pill with Mount Entrance */}
      <motion.header
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: editorialEase }}
        className={`rounded-full backdrop-blur-md px-4 sm:px-5 py-2 flex items-center justify-between transition-all ${
          isDarkHeroPage
            ? "bg-black/25 border border-white/15 text-white shadow-[0_8px_32px_rgba(0,0,0,0.2)]"
            : "bg-[#3A1010]/85 border border-white/10 text-white shadow-[0_8px_32px_rgba(36,22,22,0.18)]"
        }`}
      >
        {/* GM University Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative flex-shrink-0">
            <img
              src="/images/gmu-logo.png"
              alt="GM University"
              className="h-9 w-9 rounded-full object-contain bg-white/95 p-0.5 border border-[#D4A843]/60 shadow-xs group-hover:scale-105 transition-transform"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white leading-none tracking-tight">
              GM University
            </span>
            <span className="text-[11px] font-semibold text-[#D4A843] leading-none mt-1">
              CC-BS Portal
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links with Subtle Translucent Active Pill */}
        <nav className="hidden md:flex items-center gap-1 bg-black/20 p-1 rounded-full border border-white/10 backdrop-blur-xs">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href + label}
                href={href}
                className={`relative flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors duration-150 ${
                  active
                    ? "text-white"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active-pill"
                    className="absolute inset-0 rounded-full bg-white/15 border border-white/20 -z-10 shadow-xs"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon className="h-3.5 w-3.5 relative z-10 text-[#D4A843]" />
                <span className="relative z-10">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-2.5">
          {user ? (
            <>
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-white/15">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 border border-white/15 flex-shrink-0">
                  <User className="h-3.5 w-3.5 text-[#D4A843]" />
                </div>
                <div className="text-left">
                  <p
                    className="text-xs font-bold text-white leading-tight truncate max-w-[200px] lg:max-w-[240px]"
                    title={user.name}
                  >
                    {user.name}
                  </p>
                  <span className="inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold capitalize bg-white/15 text-[#FDF8EC] border border-white/15 mt-0.5">
                    {user.role}
                  </span>
                </div>
              </div>
              <button
                onClick={logout}
                className="btn-ghost text-xs py-1.5 px-3 text-white/80 hover:text-white hover:bg-white/10 flex-shrink-0"
                title="Logout"
              >
                <LogOut className="h-3.5 w-3.5 text-[#D4A843]" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-xs py-1.5 px-3 font-semibold text-white/85 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="btn-gold text-xs py-1.5 px-4 font-bold shadow-xs flex items-center gap-1.5"
              >
                <span>Register</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-1.5 rounded-full text-white/80 hover:bg-white/10 hover:text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle Navigation"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </motion.header>

      {/* Mobile Menu Dropdown with AnimatePresence */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: editorialEase }}
            className="md:hidden mt-2 p-3 rounded-2xl bg-[#2A0B0B]/95 backdrop-blur-2xl border border-white/15 shadow-2xl space-y-1 text-white"
          >
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href + label}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  isActive(href)
                    ? "bg-white/15 text-white border border-white/20"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4 text-[#D4A843]" />
                {label}
              </Link>
            ))}
            {user && (
              <div className="px-3 pt-2.5 border-t border-white/10 mt-2 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-white">{user.name}</p>
                  <p className="text-[11px] text-white/60">{user.email}</p>
                </div>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize bg-white/15 text-[#FDF8EC]">
                  {user.role}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
