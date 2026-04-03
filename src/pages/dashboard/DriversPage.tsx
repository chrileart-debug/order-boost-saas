import { useEffect, useState } from "react";
import { useEstablishment } from "@/components/EstablishmentProvider";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, Briefcase, Plus, Star, Bike, Car, Truck, Ban, MapPin, CreditCard, ShieldCheck } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

type Applicant = {
  application_id: string;
  driver_id: string;
  status: string;
  job_title: string;
  job_id: string;
  full_name: string;
  phone: string | null;
  vehicle_type: string | null;
  has_bag: boolean | null;
  has_machine: boolean | null;
  profile_photo_url: string | null;
  cnh_number: string | null;
  cnh_category: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  rating_avg: number | null;
  total_deliveries: number | null;
};

type FleetMember = {
  fleet_id: string;
  driver_id: string;
  is_active: boolean;
  hired_at: string;
  full_name: string;
  phone: string | null;
  vehicle_type: string | null;
  has_bag: boolean | null;
  profile_photo_url: string | null;
  rating_avg: number | null;
  total_deliveries: number | null;
};

type Job = {
  id: string;
  title: string;
  status: string | null;
  shift_type: string | null;
  hiring_type: string | null;
  payment_type: string | null;
  fixed_value: number | null;
  km_value: number | null;
  created_at: string | null;
};

const vehicleIcon = (type: string | null) => {
  switch (type) {
    case "moto": return <Bike className="w-4 h-4" />;
    case "carro": return <Car className="w-4 h-4" />;
    case "bike": return <Bike className="w-4 h-4" />;
    default: return <Ban className="w-4 h-4 text-muted-foreground" />;
  }
};

const vehicleLabel = (type: string | null) => {
  switch (type) {
    case "moto": return "Moto";
    case "carro": return "Carro";
    case "bike": return "Bike";
    default: return "Nenhum";
  }
};

const getAvatarUrl = (path: string | null) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/avatars/${path}`;
};

const DriversPage = () => {
  const { establishment, loading: estLoading } = useEstablishment();
  const { toast } = useToast();

  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [fleet, setFleet] = useState<FleetMember[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [hiring, setHiring] = useState(false);

  // Job creation
  const [jobDialog, setJobDialog] = useState(false);
  const [jobForm, setJobForm] = useState({
    title: "",
    shift_type: "full",
    hiring_type: "freelancer",
    payment_type: "fixed",
    fixed_value: "",
    km_value: "",
    vehicle_type: "moto",
    start_time: "",
    end_time: "",
    job_date: "",
  });
  const [savingJob, setSavingJob] = useState(false);

  useEffect(() => {
    if (establishment?.id) {
      fetchAll();
    }
  }, [establishment?.id]);

  const fetchAll = async () => {
    if (!establishment) return;
    setLoadingData(true);
    await Promise.all([fetchApplicants(), fetchFleet(), fetchJobs()]);
    setLoadingData(false);
  };

  const fetchApplicants = async () => {
    if (!establishment) return;
    const { data: jobsData } = await supabase
      .from("jobs")
      .select("id")
      .eq("establishment_id", establishment.id);

    if (!jobsData?.length) { setApplicants([]); return; }

    const jobIds = jobsData.map(j => j.id);
    const { data: apps } = await supabase
      .from("job_applications")
      .select("id, driver_id, status, job_id")
      .in("job_id", jobIds)
      .in("status", ["interested", "approved"]);

    if (!apps?.length) { setApplicants([]); return; }

    const driverIds = [...new Set(apps.map(a => a.driver_id).filter(Boolean))] as string[];

    const [{ data: profiles }, { data: driverProfiles }, { data: jobsList }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, phone").in("id", driverIds),
      supabase.from("driver_profiles").select("*").in("id", driverIds),
      supabase.from("jobs").select("id, title").in("id", jobIds),
    ]);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));
    const driverMap = new Map((driverProfiles || []).map(d => [d.id, d]));
    const jobMap = new Map((jobsList || []).map(j => [j.id, j]));

    const result: Applicant[] = apps.map(a => {
      const profile = profileMap.get(a.driver_id!);
      const driver = driverMap.get(a.driver_id!);
      const job = jobMap.get(a.job_id!);
      return {
        application_id: a.id,
        driver_id: a.driver_id!,
        status: a.status!,
        job_title: job?.title || "Vaga",
        job_id: a.job_id!,
        full_name: profile?.full_name || "Sem nome",
        phone: profile?.phone || null,
        vehicle_type: driver?.vehicle_type || null,
        has_bag: driver?.has_bag || false,
        has_machine: driver?.has_machine || false,
        profile_photo_url: driver?.profile_photo_url || null,
        cnh_number: driver?.cnh_number || null,
        cnh_category: driver?.cnh_category || null,
        address_neighborhood: driver?.address_neighborhood || null,
        address_city: driver?.address_city || null,
        rating_avg: driver?.rating_avg ?? null,
        total_deliveries: driver?.total_deliveries ?? 0,
      };
    });

    setApplicants(result);
  };

  const fetchFleet = async () => {
    if (!establishment) return;
    const { data: fleetData } = await supabase
      .from("fleet_history")
      .select("id, driver_id, is_active, hired_at")
      .eq("establishment_id", establishment.id)
      .eq("is_active", true);

    if (!fleetData?.length) { setFleet([]); return; }

    const driverIds = fleetData.map(f => f.driver_id).filter(Boolean) as string[];

    const [{ data: profiles }, { data: driverProfiles }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, phone").in("id", driverIds),
      supabase.from("driver_profiles").select("id, vehicle_type, has_bag, profile_photo_url, rating_avg, total_deliveries").in("id", driverIds),
    ]);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));
    const driverMap = new Map((driverProfiles || []).map(d => [d.id, d]));

    const result: FleetMember[] = fleetData.map(f => {
      const profile = profileMap.get(f.driver_id!);
      const driver = driverMap.get(f.driver_id!);
      return {
        fleet_id: f.id,
        driver_id: f.driver_id!,
        is_active: f.is_active ?? true,
        hired_at: f.hired_at || "",
        full_name: profile?.full_name || "Sem nome",
        phone: profile?.phone || null,
        vehicle_type: driver?.vehicle_type || null,
        has_bag: driver?.has_bag || false,
        profile_photo_url: driver?.profile_photo_url || null,
        rating_avg: driver?.rating_avg ?? null,
        total_deliveries: driver?.total_deliveries ?? 0,
      };
    });

    setFleet(result);
  };

  const fetchJobs = async () => {
    if (!establishment) return;
    const { data } = await supabase
      .from("jobs")
      .select("id, title, status, shift_type, hiring_type, payment_type, fixed_value, km_value, created_at")
      .eq("establishment_id", establishment.id)
      .order("created_at", { ascending: false });
    setJobs((data || []) as Job[]);
  };

  const handleApprove = async (applicant: Applicant) => {
    if (!establishment) return;
    setHiring(true);

    const { error } = await supabase
      .from("job_applications")
      .update({ status: "approved" } as any)
      .eq("id", applicant.application_id);

    if (error) {
      toast({ title: "Erro ao aprovar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Motorista aprovado!", description: `${applicant.full_name} foi aprovado. Aguardando confirmação de presença.` });
      setSelectedApplicant(null);
      fetchAll();
    }
    setHiring(false);
  };

  const handleCreateJob = async () => {
    if (!establishment) return;
    if (!jobForm.vehicle_type || !jobForm.start_time || !jobForm.end_time || !jobForm.job_date) {
      toast({ title: "Campos obrigatórios", description: "Preencha tipo de veículo, valor, horário e data.", variant: "destructive" });
      return;
    }
    if (jobForm.payment_type === "fixed" && !jobForm.fixed_value) {
      toast({ title: "Campo obrigatório", description: "Preencha o valor do turno.", variant: "destructive" });
      return;
    }
    if (jobForm.payment_type === "per_km" && !jobForm.km_value) {
      toast({ title: "Campo obrigatório", description: "Preencha o valor por KM.", variant: "destructive" });
      return;
    }

    setSavingJob(true);

    const startDateTime = `${jobForm.job_date}T${jobForm.start_time}:00`;
    const endDateTime = `${jobForm.job_date}T${jobForm.end_time}:00`;

    const { error } = await supabase.from("jobs").insert({
      establishment_id: establishment.id,
      title: jobForm.title || `Entregador ${vehicleLabel(jobForm.vehicle_type)}`,
      shift_type: jobForm.shift_type,
      hiring_type: jobForm.hiring_type,
      payment_type: jobForm.payment_type,
      fixed_value: jobForm.fixed_value ? parseFloat(jobForm.fixed_value) : null,
      km_value: jobForm.km_value ? parseFloat(jobForm.km_value) : null,
      start_time: startDateTime,
      end_time: endDateTime,
      requirements: { vehicle_type: jobForm.vehicle_type },
      status: "open",
    } as any);

    if (error) {
      toast({ title: "Erro ao criar vaga", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Vaga publicada!", description: "Os motoristas da região já podem vê-la no Radar." });
      setJobDialog(false);
      setJobForm({ title: "", shift_type: "full", hiring_type: "freelancer", payment_type: "fixed", fixed_value: "", km_value: "", vehicle_type: "moto", start_time: "", end_time: "", job_date: "" });
      fetchJobs();
    }
    setSavingJob(false);
  };

  if (estLoading || !establishment) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Motoristas</h1>

      <Tabs defaultValue="interested" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="fleet" className="gap-1.5"><UserCheck className="w-4 h-4" /> Minha Frota</TabsTrigger>
          <TabsTrigger value="interested" className="gap-1.5"><Users className="w-4 h-4" /> Interessados</TabsTrigger>
          <TabsTrigger value="jobs" className="gap-1.5"><Briefcase className="w-4 h-4" /> Minhas Vagas</TabsTrigger>
        </TabsList>

        {/* ============ MINHA FROTA ============ */}
        <TabsContent value="fleet" className="mt-4">
          {loadingData ? (
            <div className="grid gap-3 md:grid-cols-2">{[1,2].map(i => <Skeleton key={i} className="h-24" />)}</div>
          ) : fleet.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-2">
                <UserCheck className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-muted-foreground">Nenhum motorista na sua frota ainda.</p>
                <p className="text-xs text-muted-foreground">Contrate interessados nas suas vagas para começar.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {fleet.map(m => (
                <Card key={m.fleet_id}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={getAvatarUrl(m.profile_photo_url)} />
                      <AvatarFallback>{m.full_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm text-foreground truncate">{m.full_name}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">{vehicleIcon(m.vehicle_type)} {vehicleLabel(m.vehicle_type)}</span>
                        {m.has_bag && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Bag</Badge>}
                      </div>
                      {m.rating_avg != null && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          <span>{Number(m.rating_avg).toFixed(1)}</span>
                          <span>· {m.total_deliveries} entregas</span>
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className="text-green-600 border-green-300">Ativo</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ============ INTERESSADOS ============ */}
        <TabsContent value="interested" className="mt-4">
          {loadingData ? (
            <div className="grid gap-3 md:grid-cols-2">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>
          ) : applicants.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-2">
                <Users className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-muted-foreground">Nenhum motorista interessado nas suas vagas.</p>
                <p className="text-xs text-muted-foreground">Crie vagas na aba "Minhas Vagas" para atrair entregadores.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {applicants.map(a => (
                <Card key={a.application_id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setSelectedApplicant(a)}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={getAvatarUrl(a.profile_photo_url)} />
                      <AvatarFallback>{a.full_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm text-foreground truncate">{a.full_name}</h3>
                      <p className="text-xs text-muted-foreground truncate">Vaga: {a.job_title}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">{vehicleIcon(a.vehicle_type)} {vehicleLabel(a.vehicle_type)}</span>
                        {a.has_bag && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Bag</Badge>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ============ MINHAS VAGAS ============ */}
        <TabsContent value="jobs" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5" onClick={() => setJobDialog(true)}>
              <Plus className="w-4 h-4" /> Nova Vaga
            </Button>
          </div>

          {loadingData ? (
            <div className="grid gap-3">{[1,2].map(i => <Skeleton key={i} className="h-20" />)}</div>
          ) : jobs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-2">
                <Briefcase className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-muted-foreground">Nenhuma vaga criada.</p>
                <Button variant="outline" size="sm" className="gap-1.5 mt-2" onClick={() => setJobDialog(true)}>
                  <Plus className="w-4 h-4" /> Criar primeira vaga
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {jobs.map(j => (
                <Card key={j.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <h3 className="font-medium text-sm text-foreground">{j.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {j.shift_type === "full" ? "Integral" : j.shift_type === "part" ? "Meio Período" : j.shift_type || "—"}
                        {" · "}
                        {j.hiring_type === "freelancer" ? "Freelancer" : j.hiring_type === "fixed" ? "Fixo" : j.hiring_type || "—"}
                        {j.fixed_value != null && ` · R$ ${Number(j.fixed_value).toFixed(2)}`}
                      </p>
                    </div>
                    <Badge variant={j.status === "open" ? "default" : "secondary"}>
                      {j.status === "open" ? "Aberta" : j.status === "closed" ? "Fechada" : j.status || "—"}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ============ MODAL PERFIL DO MOTORISTA ============ */}
      <Dialog open={!!selectedApplicant} onOpenChange={(open) => !open && setSelectedApplicant(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Perfil do Motorista</DialogTitle>
          </DialogHeader>
          {selectedApplicant && (
            <div className="space-y-5">
              <div className="flex flex-col items-center gap-3">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={getAvatarUrl(selectedApplicant.profile_photo_url)} />
                  <AvatarFallback className="text-2xl">{selectedApplicant.full_name.charAt(0)}</AvatarFallback>
                </Avatar>
                <h2 className="text-lg font-semibold text-foreground">{selectedApplicant.full_name}</h2>
                {selectedApplicant.rating_avg != null && (
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium">{Number(selectedApplicant.rating_avg).toFixed(1)}</span>
                    <span className="text-muted-foreground">· {selectedApplicant.total_deliveries} entregas</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  {vehicleIcon(selectedApplicant.vehicle_type)}
                  <span>{vehicleLabel(selectedApplicant.vehicle_type)}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ShieldCheck className="w-4 h-4" />
                  <span>{selectedApplicant.has_bag ? "Possui Bag" : "Sem Bag"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CreditCard className="w-4 h-4" />
                  <span>{selectedApplicant.has_machine ? "Possui Maquininha" : "Sem Maquininha"}</span>
                </div>
                {(selectedApplicant.address_neighborhood || selectedApplicant.address_city) && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{[selectedApplicant.address_neighborhood, selectedApplicant.address_city].filter(Boolean).join(", ")}</span>
                  </div>
                )}
              </div>

              {(selectedApplicant.cnh_number || selectedApplicant.cnh_category) && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                  <p className="font-medium text-foreground">CNH</p>
                  {selectedApplicant.cnh_number && <p className="text-muted-foreground">Número: {selectedApplicant.cnh_number}</p>}
                  {selectedApplicant.cnh_category && <p className="text-muted-foreground">Categoria: {selectedApplicant.cnh_category}</p>}
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center">
                Interessado na vaga: <strong>{selectedApplicant.job_title}</strong>
              </p>

              <Button className="w-full" onClick={() => handleHire(selectedApplicant)} disabled={hiring}>
                {hiring ? "Contratando..." : "Contratar para este Turno"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ============ MODAL CRIAR VAGA ============ */}
      <Dialog open={jobDialog} onOpenChange={setJobDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Vaga de Entregador</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2 max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>Título da Vaga (opcional)</Label>
              <Input value={jobForm.title} onChange={e => setJobForm({ ...jobForm, title: e.target.value })} placeholder="Ex: Entregador Noturno" />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Veículo *</Label>
              <Select value={jobForm.vehicle_type} onValueChange={v => setJobForm({ ...jobForm, vehicle_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="moto">Moto</SelectItem>
                  <SelectItem value="bike">Bike</SelectItem>
                  <SelectItem value="carro">Carro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Turno</Label>
              <Select value={jobForm.shift_type} onValueChange={v => setJobForm({ ...jobForm, shift_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Integral</SelectItem>
                  <SelectItem value="part">Meio Período</SelectItem>
                  <SelectItem value="night">Noturno</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Horário Início *</Label>
                <Input type="time" value={jobForm.start_time} onChange={e => setJobForm({ ...jobForm, start_time: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Horário Fim *</Label>
                <Input type="time" value={jobForm.end_time} onChange={e => setJobForm({ ...jobForm, end_time: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input type="date" value={jobForm.job_date} onChange={e => setJobForm({ ...jobForm, job_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Contratação</Label>
              <Select value={jobForm.hiring_type} onValueChange={v => setJobForm({ ...jobForm, hiring_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="freelancer">Freelancer</SelectItem>
                  <SelectItem value="fixed">Fixo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Pagamento</Label>
              <Select value={jobForm.payment_type} onValueChange={v => setJobForm({ ...jobForm, payment_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Valor Fixo</SelectItem>
                  <SelectItem value="per_km">Por KM</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {jobForm.payment_type === "fixed" && (
              <div className="space-y-2">
                <Label>Valor do Turno (R$) *</Label>
                <Input type="number" step="0.01" value={jobForm.fixed_value} onChange={e => setJobForm({ ...jobForm, fixed_value: e.target.value })} placeholder="50.00" />
              </div>
            )}
            {jobForm.payment_type === "per_km" && (
              <div className="space-y-2">
                <Label>Valor por KM (R$) *</Label>
                <Input type="number" step="0.01" value={jobForm.km_value} onChange={e => setJobForm({ ...jobForm, km_value: e.target.value })} placeholder="2.50" />
              </div>
            )}
            <Button className="w-full" onClick={handleCreateJob} disabled={savingJob}>
              {savingJob ? "Criando..." : "Publicar Vaga"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DriversPage;
