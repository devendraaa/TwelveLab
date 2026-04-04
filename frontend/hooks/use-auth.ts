"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    setMounted(true);
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);
    })();
  }, []);

  async function logout() {
    await supabase?.auth.signOut();
    router.push("/login");
  }

  return { user, mounted, logout };
}
