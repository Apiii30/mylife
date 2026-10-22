import { AuthCard } from "@/components/auth/auth-card";
import { MeshBackdrop } from "@/components/ui/mesh-backdrop";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative isolate min-h-svh overflow-hidden">
      <MeshBackdrop />
      <AuthCard>{children}</AuthCard>
    </div>
  );
}
