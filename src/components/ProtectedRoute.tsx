import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { useEstablishment } from "@/components/EstablishmentProvider";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { establishment, loading: estLoading } = useEstablishment();
  const navigate = useNavigate();

  const isLoading = authLoading || estLoading;

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    if (!establishment || !establishment.onboarding_completed) {
      navigate("/onboarding", { replace: true });
    }
  }, [user, isLoading, establishment, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <span className="text-sm text-muted-foreground">Carregando...</span>
        </div>
      </div>
    );
  }

  if (!user || !establishment?.onboarding_completed) return null;

  return <>{children}</>;
};
