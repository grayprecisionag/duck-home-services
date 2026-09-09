"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SuccessAlert({
  message,
}: {
  message: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.replace("/admin/services");
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [router]);

  return (
    <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4">
      <p className="font-medium text-green-800">{message}</p>
    </div>
  );
}