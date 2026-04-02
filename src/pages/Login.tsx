import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Utensils } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    // Block drivers from accessing owner panel
    const { data: isDriver } = await supabase.rpc("has_role", { _user_id: session.user.id, _role: "driver" });
    const { data: isOwner } = await supabase.rpc("has_role", { _user_id: session.user.id, _role: "owner" });

    if (isDriver && !isOwner) {
      await supabase.auth.signOut();
      setLoading(false);
      toast({
        title: "Acesso negado",
        description: "Este e-mail está cadastrado como Motoboy. Para gerenciar um estabelecimento, use uma conta de Lojista.",
        variant: "destructive",
      });
      return;
    }

    const { data: est } = await supabase.from("establishments").select("onboarding_completed").eq("owner_id", session.user.id).maybeSingle();
    setLoading(false);
    if (!est || !est.onboarding_completed) {
      navigate("/onboarding");
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Utensils className="w-7 h-7 text-primary" />
          <span className="text-2xl font-bold text-foreground">EPRATO</span>
        </div>

        <div className="bg-card rounded-2xl shadow-lg p-8 border border-border">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground">Entrar</h1>
            <p className="text-muted-foreground mt-2">Acesse seu painel de controle</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Não tem conta?{" "}
            <Link to="/auth/select-plan" className="text-primary font-medium hover:underline">Cadastrar-se</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
