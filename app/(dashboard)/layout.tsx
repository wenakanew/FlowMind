import { DashboardAuthGuard } from "@/components/auth/dashboard-auth-guard";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <DashboardAuthGuard>
        <Header />
        <Sidebar />
        <main className="ml-56 min-h-[calc(100vh-3.5rem)] overflow-auto pt-14">
          <div className="p-6">{children}</div>
        </main>
      </DashboardAuthGuard>
    </div>
  );
}
