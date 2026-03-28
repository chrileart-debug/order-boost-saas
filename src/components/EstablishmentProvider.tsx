import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

interface EstablishmentContextType {
  establishment: any | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const EstablishmentContext = createContext<EstablishmentContextType>({
  establishment: null,
  loading: true,
  refresh: async () => {},
});

export const useEstablishment = () => useContext(EstablishmentContext);

export const EstablishmentProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [establishment, setEstablishment] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEstablishment = useCallback(async () => {
    if (!user) {
      setEstablishment(null);
      setLoading(false);
      return;
    }
    // Only show loading on initial fetch, not on refetches
    setLoading(prev => establishment === null ? true : prev);
    const { data } = await supabase
      .from("establishments")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();
    // Only update state if data actually changed
    setEstablishment(prev => {
      if (prev && data && prev.id === data.id && prev.updated_at === data.updated_at) return prev;
      return data;
    });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    fetchEstablishment();
  }, [authLoading, fetchEstablishment]);

  return (
    <EstablishmentContext.Provider value={{ establishment, loading, refresh: fetchEstablishment }}>
      {children}
    </EstablishmentContext.Provider>
  );
};
