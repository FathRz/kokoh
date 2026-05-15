"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardList, Bell, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Beranda", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/reports", label: "Laporan", icon: ClipboardList, exact: false },
  { href: "#", label: "Notifikasi", icon: Bell, exact: false },
  { href: "/dashboard/settings", label: "Profil", icon: Settings2, exact: false },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-gray-200 safe-bottom">
      <div className="flex items-stretch h-16">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const isActive = href === "#"
            ? false
            : exact
            ? pathname === href
            : pathname.startsWith(href);

          const inner = (
            <div className={cn(
              "flex flex-col items-center justify-center gap-1 w-full h-full px-2 transition-colors",
              isActive ? "text-brand-500" : "text-gray-400"
            )}>
              <div className="relative">
                <Icon className={cn("w-5 h-5 transition-all", isActive && "scale-110")} strokeWidth={isActive ? 2.2 : 1.8} />
                {/* Notification dot for bell (placeholder) */}
                {href === "#" && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-500 rounded-full ring-2 ring-white" />
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium leading-none",
                isActive ? "text-brand-500" : "text-gray-400"
              )}>
                {label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-brand-500 rounded-t-full" />
              )}
            </div>
          );

          if (href === "#") {
            return (
              <div key={label} className="relative flex-1 flex items-stretch cursor-pointer" onClick={() => {}}>
                {inner}
              </div>
            );
          }

          return (
            <Link key={href} href={href} className="relative flex-1 flex items-stretch">
              {inner}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
