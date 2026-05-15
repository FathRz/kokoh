"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard,
  BarChart2,
  Building2,
  ClipboardList,
  Package,
  Users,
  Settings2,
  ChevronDown,
  Ellipsis,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useSidebar } from "@/context/SidebarContext";

type NavChild = { href: string; label: string };
type NavItem = {
  href?: string;
  label: string;
  badge?: string;
  icon: React.ReactNode;
  children?: NavChild[];
};

const NAV_GROUPS: { section: string; items: NavItem[] }[] = [
  {
    section: "MENU",
    items: [
      {
        label: "Dashboard",
        icon: <LayoutDashboard className="w-5 h-5" />,
        children: [
          { href: "/dashboard", label: "Overview" },
          { href: "/dashboard/analytics", label: "Analitik" },
        ],
      },
      {
        href: "/dashboard/projects",
        label: "Proyek",
        icon: <Building2 className="w-5 h-5" />,
      },
      {
        href: "/dashboard/reports",
        label: "Laporan Harian",
        icon: <ClipboardList className="w-5 h-5" />,
      },
      {
        href: "/dashboard/logistics",
        label: "Logistik",
        badge: "NEW",
        icon: <Package className="w-5 h-5" />,
      },
      {
        href: "/dashboard/crm",
        label: "CRM & Penjualan",
        badge: "NEW",
        icon: <Users className="w-5 h-5" />,
      },
    ],
  },
  {
    section: "LAINNYA",
    items: [
      {
        href: "/dashboard/settings",
        label: "Pengaturan",
        icon: <Settings2 className="w-5 h-5" />,
      },
    ],
  },
];

function SubmenuItem({ child, isActive }: { child: NavChild; isActive: boolean }) {
  return (
    <Link
      href={child.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
        isActive
          ? "bg-brand-50 text-brand-500"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", isActive ? "bg-brand-500" : "bg-gray-300")} />
      {child.label}
    </Link>
  );
}

function NavGroupItem({ item, isWide }: { item: NavItem; isWide: boolean }) {
  const pathname = usePathname();
  const hasChildren = !!item.children;
  const isActive = item.href
    ? pathname === item.href
    : item.children?.some((c) => pathname === c.href) ?? false;

  const [submenuOpen, setSubmenuOpen] = useState(isActive);
  const submenuRef = useRef<HTMLDivElement>(null);
  const [submenuHeight, setSubmenuHeight] = useState(0);

  useEffect(() => {
    if (submenuRef.current) {
      setSubmenuHeight(submenuRef.current.scrollHeight);
    }
  }, []);

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setSubmenuOpen((v) => !v)}
          className={cn(
            "group relative flex items-center w-full gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all",
            isActive
              ? "bg-brand-50 text-brand-500"
              : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          )}
        >
          <span className={cn("flex-shrink-0", isActive ? "text-brand-500" : "text-gray-400 group-hover:text-gray-600")}>
            {item.icon}
          </span>
          {isWide && (
            <>
              <span className="flex-1 text-left">{item.label}</span>
              <ChevronDown
                className={cn("w-4 h-4 text-gray-400 transition-transform flex-shrink-0", submenuOpen && "rotate-180")}
              />
            </>
          )}
        </button>
        {isWide && (
          <div
            className="overflow-hidden transition-all duration-300 ease-in-out"
            style={{ maxHeight: submenuOpen ? submenuHeight : 0 }}
          >
            <div ref={submenuRef} className="ml-3 mt-0.5 space-y-0.5 border-l-2 border-gray-100 pl-3 py-1">
              {item.children!.map((child) => (
                <SubmenuItem key={child.href} child={child} isActive={pathname === child.href} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href!}
      className={cn(
        "group relative flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all",
        isActive
          ? "bg-brand-50 text-brand-500"
          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
      )}
    >
      <span className={cn("flex-shrink-0", isActive ? "text-brand-500" : "text-gray-400 group-hover:text-gray-600")}>
        {item.icon}
      </span>
      {isWide && (
        <>
          <span className="flex-1">{item.label}</span>
          {item.badge && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-500">
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}

export default function Sidebar() {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const isWide = isExpanded || isHovered;

  return (
    <aside
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "fixed top-0 left-0 h-screen z-50 flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ease-in-out",
        isWide ? "w-[290px]" : "w-[90px]",
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      {/* Logo */}
      <div className={cn("flex items-center border-b border-gray-100 flex-shrink-0 h-16", isWide ? "px-6" : "justify-center px-4")}>
        {isWide ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src="/kokoh-logo.png" alt="Kokoh" className="h-25 w-auto object-contain" />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold">K</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.section}>
            {isWide ? (
              <p className="text-[11px] font-semibold text-gray-400 tracking-widest px-3 mb-2 uppercase">
                {group.section}
              </p>
            ) : (
              <div className="flex justify-center mb-2">
                <Ellipsis className="w-4 h-4 text-gray-300" />
              </div>
            )}
            <nav className="space-y-0.5">
              {group.items.map((item) => (
                <NavGroupItem key={item.label} item={item} isWide={isWide} />
              ))}
            </nav>
          </div>
        ))}
      </div>
    </aside>
  );
}
