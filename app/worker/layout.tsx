import { requireRole } from "@/lib/auth/require-role";

export default async function WorkerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireRole("worker");

  return <>{children}</>;
}