import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";
import { DashboardShell, SIDEBAR_COOKIE } from "@/components/dashboard/shell";
import { QueryProvider } from "@/components/query-provider";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = {
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    image: session.user.image ?? null,
  };

  const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === "1";

  // Sesi diteruskan dari server agar token API langsung tersedia tanpa fetch tambahan
  return (
    <SessionProvider session={session}>
      <QueryProvider>
        <DashboardShell user={user} initialCollapsed={collapsed}>
          {children}
        </DashboardShell>
      </QueryProvider>
    </SessionProvider>
  );
}
