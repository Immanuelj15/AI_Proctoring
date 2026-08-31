"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, removeToken } from "@/lib/auth";
import { getCurrentUser } from "@/lib/api";
import { User } from "@/lib/types";
import Loading from "./Loading";

interface ProtectedRouteProps {
  children: (user: User) => React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function verifyAuth() {
      const token = getToken();
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const userData = await getCurrentUser(token);
        setUser(userData);
      } catch (error) {
        removeToken();
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    verifyAuth();
  }, [router]);

  if (loading) {
    return <Loading message="Verifying session..." />;
  }

  if (!user) {
    return null;
  }

  return <>{children(user)}</>;
}
