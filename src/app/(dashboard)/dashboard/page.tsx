"use client";

import { useCurrentUser } from "@/hooks/use-current-user";
// Placeholder page; router and mutations removed after context refactor


export default function DashboardPage() {
  const { user } = useCurrentUser();
  // const router = useRouter();

  if (!user) {
    // The layout should prevent this, but as a fallback:
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
            
    </div>
  );
}
