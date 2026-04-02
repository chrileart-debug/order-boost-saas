import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { useEstablishment } from "@/components/EstablishmentProvider";
import { supabase } from "@/integrations/supabase/client";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { establishment, loading: estLoading } = useEstablishment();
  const navigate = useNavigate();
  const [roleChecked, setRoleChecked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (authLoading || !user) {
      setRoleChecked(false);
      return;
    }

    const checkRole = async () => {
      const { data } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "owner",
      });
      setIsOwner(!!data);
      setRoleChecked(true);
    };

    checkRole();
  }, [user, authLoading]);

  const isLoading = authLoading || estLoading || (!!user && !roleChecked);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate("/", { replace: true });
      return;
    }
    if (!isOwner) {
      navigate("/", { replace: true });
      return;
    }
    if (!establishment || !establishment.onboarding_completed) {
      navigate("/onboarding", { replace: true });
    }
  }, [user, isLoading, isOwner, establishment, navigate]);

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

  if (!user || !isOwner || !establishment?.onboarding_completed) return null;

  return <>{children}</>;
};
