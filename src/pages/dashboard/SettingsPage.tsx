import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useEstablishment } from "@/components/EstablishmentProvider";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Store, User } from "lucide-react";
import ImageCropper from "@/components/ImageCropper";
import MaskedInput from "@/components/MaskedInput";
import { maskPhone, unmask, maskCep, maskCnpj } from "@/lib/masks";
import OperatingHoursSection from "@/components/settings/OperatingHoursSection";
import { type OperatingHours } from "@/lib/storeStatus";
import { Clock } from "lucide-react";

const niches = ["Açaí", "Pizzaria", "Hamburgueria", "Cookies", "Doceria", "Restaurante", "Sushi", "Padaria", "Cafeteria", "Outro"];

const SettingsPage = () => {
  const { user } = useAuth();
  const { establishment, refresh } = useEstablishment();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [profileForm, setProfileForm] = useState({ full_name: "", phone: "" });
  const [estForm, setEstForm] = useState({ name: "", slug: "", niche: "", whatsapp: "", cnpj: "" });
  const [formValid, setFormValid] = useState(true);
  const [cep, setCep] = useState("");
  const [address, setAddress] = useState<any>({});
  const [numero, setNumero] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEst, setSavingEst] = useState(false);
  const [logoBlob, setLogoBlob] = useState<Blob | null>(null);
  const [coverBlob, setCoverBlob] = useState<Blob | null>(null);
  const [operatingHours, setOperatingHours] = useState<OperatingHours | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      setProfile(data);
      if (data) setProfileForm({ full_name: data.full_name || "", phone: maskPhone(data.phone || "") });
    });
  }, [user]);

  useEffect(() => {
    if (!establishment) return;
    setEstForm({
      name: establishment.name || "",
      slug: establishment.slug || "",
      niche: establishment.niche || "",
      whatsapp: maskPhone(establishment.whatsapp || ""),
      cnpj: maskCnpj(establishment.cnpj || ""),
    });
    if (establishment.operating_hours) {
      setOperatingHours(establishment.operating_hours as OperatingHours);
    }
    if (establishment.address && typeof establishment.address === "object" && !Array.isArray(establishment.address)) {
      const addr = establishment.address as Record<string, string>;
      setAddress(addr);
      setCep(maskCep(addr.cep || ""));
      setNumero(addr.numero || "");
    }
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
    const slug = estForm.slug || estForm.name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
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
      await refresh();
      toast({ title: "Estabelecimento salvo!" });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSavingEst(false);
    }
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
    </div>
  );
};

export default SettingsPage;
