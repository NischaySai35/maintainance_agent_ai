import DashboardHeader from '@/components/dashboard/DashboardHeader';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#020617]">
      <DashboardHeader />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
