"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  User,
  Settings2,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSidebar } from "@/context/SidebarContext";

interface HeaderProps {
  fullName: string;
  email: string;
  role: string;
  tenantName: string;
}

const ROLE_LABELS: Record<string, string> = {
  superadmin: "Super Admin",
  tenant_owner: "Owner",
  project_manager: "Project Manager",
  site_manager: "Site Manager",
  logistik: "Logistik",
  finance: "Finance",
  sales_admin: "Sales Admin",
};

export default function Header({ fullName, email, role, tenantName }: HeaderProps) {
  const router = useRouter();
  const { toggleSidebar, toggleMobileSidebar } = useSidebar();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = fullName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <header className="sticky top-0 z-40 flex w-full bg-white border-b border-gray-200 h-16 flex-shrink-0">
      <div className="flex items-center w-full px-4 gap-3">

        {/* Desktop hamburger — toggles sidebar collapse */}
        <button
          onClick={toggleSidebar}
          className="hidden lg:flex p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile hamburger — opens drawer */}
        <button
          onClick={toggleMobileSidebar}
          className="flex lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile logo */}
        <div className="lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/kokoh-logo.png" alt="Kokoh" className="h-7 w-auto object-contain" />
        </div>

        {/* Search — desktop only */}
        <div className="hidden lg:flex flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari atau ketik perintah..."
              className="w-full pl-9 pr-16 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">
              ⌘K
            </kbd>
          </div>
        </div>

        <div className="flex-1" />

        {/* Right actions */}
        <div className="flex items-center gap-1">

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <Bell className="w-5 h-5" strokeWidth={1.8} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full ring-2 ring-white" />
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-100 z-50">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <p className="font-semibold text-sm text-gray-800">Notifikasi</p>
                  <span className="text-xs text-brand-500 font-medium cursor-pointer hover:underline">
                    Tandai semua dibaca
                  </span>
                </div>
                <div className="py-8 text-center">
                  <Bell className="w-10 h-10 text-gray-300 mx-auto mb-2" strokeWidth={1.2} />
                  <p className="text-sm text-gray-400">Belum ada notifikasi</p>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* User dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 pl-1 pr-2 py-1.5 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {initials}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-semibold text-gray-800 leading-tight">{fullName}</p>
                <p className="text-xs text-gray-400 leading-tight">{ROLE_LABELS[role] ?? role}</p>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                strokeWidth={2}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-800">{fullName}</p>
                  <p className="text-xs text-gray-400 truncate">{email}</p>
                  <p className="text-xs text-brand-500 font-medium mt-0.5">{tenantName}</p>
                </div>
                <div className="py-1">
                  {[
                    { href: "/dashboard/settings", label: "Profil Saya", icon: <User className="w-4 h-4 text-gray-400" strokeWidth={1.8} /> },
                    { href: "/dashboard/settings", label: "Pengaturan", icon: <Settings2 className="w-4 h-4 text-gray-400" strokeWidth={1.8} /> },
                  ].map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {item.icon}
                      {item.label}
                    </a>
                  ))}
                </div>
                <div className="border-t border-gray-100 pt-1">
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <LogOut className="w-4 h-4" strokeWidth={1.8} />
                    {loggingOut ? "Keluar..." : "Keluar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
