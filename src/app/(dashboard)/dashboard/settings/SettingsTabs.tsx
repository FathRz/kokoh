"use client";

import { useState } from "react";
import { User, Users, Building2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import ProfileTab from "./ProfileTab";
import TeamTab from "./TeamTab";
import TenantTab from "./TenantTab";
import type { ProfileRow, TenantRow } from "./page";

interface Props {
  userId: string;
  email: string;
  myProfile: ProfileRow;
  members: ProfileRow[];
  tenant: TenantRow;
  isOwner: boolean;
}

type TabId = "profile" | "team" | "company";

const TABS: { id: TabId; label: string; icon: React.ElementType; ownerOnly?: boolean }[] = [
  { id: "profile", label: "Profil Saya", icon: User },
  { id: "team", label: "Tim & Anggota", icon: Users },
  { id: "company", label: "Perusahaan", icon: Building2, ownerOnly: true },
];

export default function SettingsTabs({ userId, email, myProfile, members, tenant, isOwner }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("profile");

  const visibleTabs = TABS.filter((t) => !t.ownerOnly || isOwner);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-gray-100">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-all",
                isActive
                  ? "border-brand-500 text-brand-600"
                  : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-200"
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab panels */}
      <div className="p-6">
        {activeTab === "profile" && (
          <ProfileTab userId={userId} email={email} profile={myProfile} />
        )}
        {activeTab === "team" && (
          <TeamTab
            currentUserId={userId}
            currentRole={myProfile.role}
            members={members}
            tenantId={tenant.id}
            isOwner={isOwner}
          />
        )}
        {activeTab === "company" && isOwner && (
          <TenantTab tenant={tenant} />
        )}
      </div>
    </div>
  );
}
