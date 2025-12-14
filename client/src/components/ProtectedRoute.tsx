import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

type ProtectedRouteProps = {
  children: React.ReactNode;
  requiredRole?: "admin" | "employee" | "user";
  allowedRoles?: ("admin" | "employee" | "user")[];
  redirectTo?: string;
};

export default function ProtectedRoute({
  children,
  requiredRole,
  allowedRoles,
  redirectTo,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (loading) return;
    
    if (!user) {
      setLocation("/employee-login");
      return;
    }

    // Sprawdź rolę użytkownika
    const userRole = user.role || "user";
    
    if (requiredRole && userRole !== requiredRole) {
      // Przekieruj w zależności od roli
      if (userRole === "employee") {
        setLocation("/my-cv");
      } else {
        setLocation(redirectTo || "/");
      }
      return;
    }

    if (allowedRoles && !allowedRoles.includes(userRole as any)) {
      // Przekieruj w zależności od roli
      if (userRole === "employee") {
        setLocation("/my-cv");
      } else {
        setLocation(redirectTo || "/");
      }
      return;
    }
  }, [user, loading, requiredRole, allowedRoles, redirectTo, setLocation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const userRole = user.role || "user";
  
  // Sprawdź czy użytkownik ma odpowiednią rolę
  if (requiredRole && userRole !== requiredRole) {
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(userRole as any)) {
    return null;
  }

  return <>{children}</>;
}

