"use client";

import { SidebarProvider, useSidebar } from "@/context/SidebarContext";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Backdrop from "./Backdrop";

interface Props {
  children: React.ReactNode;
  fullName: string;
  email: string;
  role: string;
  tenantName: string;
}

function ContentArea({ children, fullName, email, role, tenantName }: Props) {
  const { isExpanded, isHovered } = useSidebar();
  const isWide = isExpanded || isHovered;

  return (
    <div
      className={`flex flex-col flex-1 min-h-screen transition-all duration-300 ease-in-out ${
        isWide ? "lg:ml-[290px]" : "lg:ml-[90px]"
      }`}
    >
      <Header fullName={fullName} email={email} role={role} tenantName={tenantName} />
      <main className="flex-1 p-4 md:p-6 max-w-screen-2xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}

export default function DashboardShell({ children, ...props }: Props) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <Backdrop />
        <ContentArea {...props}>{children}</ContentArea>
      </div>
    </SidebarProvider>
  );
}
