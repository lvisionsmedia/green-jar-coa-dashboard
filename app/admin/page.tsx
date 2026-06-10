import { AdminDashboard } from "@/components/AdminDashboard";
import { Sidebar } from "@/components/Sidebar";

export default function AdminPage() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <AdminDashboard />
      </main>
    </div>
  );
}
