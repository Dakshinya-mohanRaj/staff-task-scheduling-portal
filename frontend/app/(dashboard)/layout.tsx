import { verifySession } from "@/lib/dal";
import { DashboardShell } from "./dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession();

  return (
    <DashboardShell
      user={{
        name: session.name,
        email: session.email,
        roleCode: session.roleCode,
        staffRole: session.staffRole,
      }}
    >
      {children}
    </DashboardShell>
  );
}