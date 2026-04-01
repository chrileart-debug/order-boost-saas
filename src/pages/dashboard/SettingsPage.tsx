import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useEstablishment } from "@/components/EstablishmentProvider";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Store, User, Download, Clock, AlertTriangle, Link } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import ImageCropper from "@/components/ImageCropper";
import MaskedInput from "@/components/MaskedInput";
import { maskPhone, unmask, maskCep, maskCnpj } from "@/lib/masks";
import OperatingHoursSection from "@/components/settings/OperatingHoursSection";
import { type OperatingHours } from "@/lib/storeStatus";

const niches = ["Açaí", "Pizzaria", "Hamburgueria", "Cookies", "Doceria", "Restaurante", "Sushi", "Padaria", "Cafeteria", "Outro"];

const SettingsPageSkeleton = () => (
  <div className="space-y-6 max-w-2xl">
    <Skeleton className="h-8 w-48" />
    {[1, 2, 3].map(i => (
      <Card key={i}>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    ))}
  </div>
);

const SettingsPage = () => {
  const { user } = useAuth();
  const { establishment, loading: estLoading, refresh } = useEstablishment();
  const { toast } = useToast();
  const [profileLoading, setProfileLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [profileForm, setProfileForm] = useState({ full_name: "", phone: "" });
  const [estForm, setEstForm] = useState({ name: "", slug: "", niche: "", whatsapp: "", cnpj: "" });
  const [cep, setCep] = useState("");
  const [address, setAddress] = useState<any>({});
  const [numero, setNumero] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEst, setSavingEst] = useState(false);
  const [logoBlob, setLogoBlob] = useState<Blob | null>(null);
  const [coverBlob, setCoverBlob] = useState<Blob | null>(null);
  const [operatingHours, setOperatingHours] = useState<OperatingHours | null>(null);
  const [slugError, setSlugError] = useState("");
  const [originalSlug, setOriginalSlug] = useState("");
  const profileInitialized = useRef(false);
  const estInitialized = useRef(false);

  // Fetch profile once
  useEffect(() => {
    if (!user) return;
    setProfileLoading(true);
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      setProfile(data);
      profileInitialized.current = false; // allow re-init when data arrives
      setProfileLoading(false);
    });
  }, [user]);

  // Initialize profile form only once when both profile and establishment are ready
  useEffect(() => {
    if (profileInitialized.current || !profile || estLoading) return;
    const phoneValue = profile.phone && profile.phone.trim() !== ""
      ? profile.phone
      : (establishment?.whatsapp || "");
    setProfileForm({ full_name: profile.full_name || "", phone: maskPhone(phoneValue) });
    profileInitialized.current = true;
  }, [profile, establishment, estLoading]);

  // Initialize establishment form once
  useEffect(() => {
    if (estInitialized.current || !establishment) return;
    setEstForm({
      name: establishment.name || "",
      slug: establishment.slug || "",
      niche: establishment.niche || "",
      whatsapp: maskPhone(establishment.whatsapp || ""),
      cnpj: maskCnpj(establishment.cnpj || ""),
    });
    setOriginalSlug(establishment.slug || "");
    if (establishment.operating_hours) {
      setOperatingHours(establishment.operating_hours as OperatingHours);
    }
    if (establishment.address && typeof establishment.address === "object" && !Array.isArray(establishment.address)) {
      const addr = establishment.address as Record<string, string>;
      setAddress(addr);
      setCep(maskCep(addr.cep || ""));
      setNumero(addr.numero || "");
    }
    estInitialized.current = true;
  }, [establishment]);

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    await supabase.from("profiles").update({
      full_name: profileForm.full_name,
      phone: unmask(profileForm.phone),
    }).eq("id", user.id);
    setSavingProfile(false);
    toast({ title: "Perfil atualizado!" });
  };

  const searchCep = async () => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length < 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) { toast({ title: "CEP não encontrado", variant: "destructive" }); return; }
      const newAddr = { cep: data.cep, rua: data.logradouro, bairro: data.bairro, cidade: data.localidade, uf: data.uf };
      setAddress(newAddr);
      setCep(maskCep(data.cep));
    } catch {
      toast({ title: "Erro ao buscar CEP", variant: "destructive" });
    }
  };

  const uploadImage = async (blob: Blob, path: string): Promise<string> => {
    const { error } = await supabase.storage.from("establishments").upload(path, blob, { upsert: true, contentType: "image/webp" });
    if (error) throw error;
    const { data } = supabase.storage.from("establishments").getPublicUrl(path);
    return data.publicUrl;
  };

  const saveEstablishment = async () => {
    if (!user || !estForm.name) return;
    const whatsDigits = estForm.whatsapp.replace(/\D/g, "").length;
    const cnpjDigits = estForm.cnpj.replace(/\D/g, "").length;
    if (whatsDigits < 10) {
      toast({ title: "WhatsApp inválido", description: "Informe um número completo.", variant: "destructive" });
      return;
    }
    if (cnpjDigits > 0 && cnpjDigits < 14) {
      toast({ title: "CNPJ incompleto", description: "Informe os 14 dígitos do CNPJ.", variant: "destructive" });
      return;
    }
    setSavingEst(true);
    setSlugError("");
    const slug = estForm.slug || estForm.name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");

    // Validate slug uniqueness if changed
    if (slug !== originalSlug) {
      const { data: existing } = await supabase
        .from("establishments")
        .select("id")
        .eq("slug", slug)
        .neq("id", establishment?.id || "")
        .maybeSingle();
      if (existing) {
        setSlugError("Esta URL já está em uso por outra loja.");
        setSavingEst(false);
        return;
      }
    }

    const fullAddress = { ...address, numero };
    const payload: any = {
      name: estForm.name,
      slug,
      niche: estForm.niche,
      whatsapp: unmask(estForm.whatsapp),
      cnpj: unmask(estForm.cnpj),
      address: fullAddress,
      owner_id: user.id,
      operating_hours: operatingHours,
    };

    try {
      if (logoBlob) {
        payload.logo_url = await uploadImage(logoBlob, `${user.id}/logo.webp`);
      }
      if (coverBlob) {
        payload.cover_url = await uploadImage(coverBlob, `${user.id}/cover.webp`);
      }

      if (establishment) {
        await supabase.from("establishments").update(payload).eq("id", establishment.id);
      } else {
        await supabase.from("establishments").insert(payload);
      }
      estInitialized.current = false;
      setOriginalSlug(slug);
      await refresh();
      toast({ title: "Estabelecimento salvo!" });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSavingEst(false);
    }
  };

  // Show skeleton while loading
  if (estLoading || profileLoading) {
    return <SettingsPageSkeleton />;
  }

  const InstallSection = () => {
    const { canInstall, install, isIos } = usePwaInstall();
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
    if (isStandalone || (!canInstall && !isIos)) return null;
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Download className="w-5 h-5 text-primary" /> Instalar Aplicativo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Instale o Gestor EPRATO para acesso rápido direto da tela inicial do seu celular.</p>
          {isIos ? (
            <p className="text-sm text-muted-foreground">Toque em <strong>Compartilhar</strong> → <strong>Adicionar à Tela de Início</strong></p>
          ) : (
            <Button onClick={install} className="gap-2"><Download className="h-4 w-4" /> Instalar Aplicativo</Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground">Configurações</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-primary" /> Perfil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input value={profileForm.full_name} onChange={e => setProfileForm({ ...profileForm, full_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input value={user?.email || ""} readOnly disabled className="bg-muted cursor-not-allowed" />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <MaskedInput mask="phone" value={profileForm.phone} onValueChange={v => setProfileForm({ ...profileForm, phone: v })} placeholder="(00) 00000-0000" />
            </div>
          </div>
          <Button onClick={saveProfile} disabled={savingProfile}>{savingProfile ? "Salvando..." : "Salvar Perfil"}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Store className="w-5 h-5 text-primary" /> Estabelecimento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome do negócio</Label>
              <Input value={estForm.name} onChange={e => setEstForm({ ...estForm, name: e.target.value })} placeholder="Minha Loja" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5" /> URL da Loja (Slug)
              </Label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground whitespace-nowrap">{window.location.origin}/</span>
                <Input
                  value={estForm.slug}
                  onChange={e => {
                    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-");
                    setEstForm({ ...estForm, slug: val });
                    setSlugError("");
                  }}
                  placeholder="minha-loja"
                  className={slugError ? "border-destructive" : ""}
                />
              </div>
              {slugError && <p className="text-xs text-destructive">{slugError}</p>}
              {estForm.slug !== originalSlug && estForm.slug && !slugError && (
                <Alert variant="default" className="mt-2 border-accent bg-accent/10">
                  <AlertTriangle className="h-4 w-4 text-accent-foreground" />
                  <AlertDescription className="text-xs text-accent-foreground">
                    Atenção: Mudar a URL alterará o link de acesso dos seus clientes.
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <div className="space-y-2">
              <Label>Nicho</Label>
              <select className="w-full rounded-lg border border-input px-3 py-2 text-sm bg-background" value={estForm.niche} onChange={e => setEstForm({ ...estForm, niche: e.target.value })}>
                <option value="">Selecione...</option>
                {niches.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>WhatsApp *</Label>
              <MaskedInput mask="phone" value={estForm.whatsapp} onValueChange={v => setEstForm({ ...estForm, whatsapp: v })} placeholder="(00) 00000-0000" />
            </div>
            <div className="space-y-2">
              <Label>CNPJ (opcional)</Label>
              <MaskedInput mask="cnpj" value={estForm.cnpj} onValueChange={v => setEstForm({ ...estForm, cnpj: v })} placeholder="00.000.000/0000-00" />
            </div>
          </div>

          <div className="border-t border-border pt-4 mt-4">
            <h3 className="font-medium text-foreground mb-3">Identidade Visual</h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <ImageCropper aspectRatio={1} onCropped={setLogoBlob} currentUrl={establishment?.logo_url || undefined} label="Logo" hint="Proporção 1:1 (quadrado)" />
              <ImageCropper aspectRatio={16 / 9} onCropped={setCoverBlob} currentUrl={establishment?.cover_url || undefined} label="Capa" hint="Proporção 16:9 (banner)" />
            </div>
          </div>

          <div className="border-t border-border pt-4 mt-4">
            <h3 className="font-medium text-foreground mb-3">Endereço</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>CEP</Label>
                <div className="flex gap-2">
                  <MaskedInput mask="cep" value={cep} onValueChange={setCep} placeholder="00000-000" />
                  <Button variant="outline" size="sm" onClick={searchCep}>Buscar</Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Rua</Label>
                <Input value={address.rua || ""} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Número</Label>
                <Input value={numero} onChange={e => setNumero(e.target.value)} placeholder="Nº" />
              </div>
              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input value={address.bairro || ""} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input value={address.cidade || ""} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>UF</Label>
                <Input value={address.uf || ""} readOnly className="bg-muted" />
              </div>
            </div>
          </div>

          <Button onClick={saveEstablishment} disabled={savingEst}>{savingEst ? "Salvando..." : "Salvar Estabelecimento"}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /> Horário de Funcionamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure os horários de abertura e fechamento para cada dia da semana. O cardápio será bloqueado automaticamente fora desses horários.
          </p>
          <OperatingHoursSection value={operatingHours} onChange={setOperatingHours} />
          <Button onClick={saveEstablishment} disabled={savingEst}>{savingEst ? "Salvando..." : "Salvar Horários"}</Button>
        </CardContent>
      </Card>

      <InstallSection />
    </div>
  );
};

export default SettingsPage;
