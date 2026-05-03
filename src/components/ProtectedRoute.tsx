import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

export const ProtectedRoute = ({ children, roles }: { children: ReactNode; roles?: AppRole[] }) => {
  const { user, roles: userRoles, loading } = useAuth();
  if (loading) return <div className="p-8 space-y-3"><Skeleton className="h-8 w-64" /><Skeleton className="h-32 w-full" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (roles && roles.length && !roles.some(r => userRoles.includes(r)) && !userRoles.includes("admin")) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};
