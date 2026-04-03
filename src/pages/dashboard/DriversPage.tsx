import { useEffect, useState, useCallback, useRef } from "react";
import { useEstablishment } from "@/components/EstablishmentProvider";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Users, UserCheck, Briefcase, Plus, Star, Bike, Car, Ban, MapPin, CreditCard, ShieldCheck, MessageSquare, BarChart3, Clock, DollarSign, CheckCircle2 } from "lucide-react";

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
  cnh_number?: string | null;
  cnh_category?: string | null;
  source: "contracted" | "history";
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
  start_time: string | null;
  end_time: string | null;
  requirements: any;
  bonus_value: number | null;
  extended_minutes: number | null;
  extension_confirmed: boolean | null;
};

type Review = {
  rating: number;
  comment: string | null;
  created_at: string;
  establishment_name: string;
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

  // Fleet profile sheet
  const [selectedFleetMember, setSelectedFleetMember] = useState<FleetMember | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [fleetProfileTab, setFleetProfileTab] = useState<"ratings" | "comments">("ratings");

  // Job creation/editing
  const [jobSheet, setJobSheet] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
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

  // Shift-end management
  const [endingJob, setEndingJob] = useState<Job | null>(null);
  const [endingDriverName, setEndingDriverName] = useState("");
  const [shiftEndMode, setShiftEndMode] = useState<"choose" | "extend" | "finalize">("choose");
  const [extendMinutes, setExtendMinutes] = useState<number | null>(null);
  const [offerBonus, setOfferBonus] = useState(false);
  const [bonusValue, setBonusValue] = useState("");
  const [finalBonus, setFinalBonus] = useState("");
  const [savingShiftEnd, setSavingShiftEnd] = useState(false);
  const shiftEndProcessedRef = useRef<Set<string>>(new Set());

  // Review after completion
  const [reviewJob, setReviewJob] = useState<Job | null>(null);
  const [reviewDriverId, setReviewDriverId] = useState<string | null>(null);
  const [reviewDriverName, setReviewDriverName] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTags, setReviewTags] = useState<string[]>([]);
  const [reviewComment, setReviewComment] = useState("");
  const [savingReview, setSavingReview] = useState(false);


  useEffect(() => {
    if (establishment?.id) {
      fetchAll();
    }
  }, [establishment?.id]);

  // Realtime: listen for job_applications changes to auto-refresh fleet
  useEffect(() => {
    if (!establishment?.id) return;
    const channel = supabase
      .channel("fleet-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "job_applications" },
        () => {
          fetchFleet();
          fetchApplicants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [establishment?.id]);

  // Shift-end monitoring: check every 30s for jobs past end_time + 1 min
  useEffect(() => {
    if (!establishment?.id) return;
    const checkEndingJobs = async () => {
      const { data: activeJobs } = await supabase
        .from("jobs")
        .select("id, title, status, end_time, bonus_value, extended_minutes, extension_confirmed, fixed_value, km_value, shift_type, hiring_type, payment_type, created_at, start_time, requirements")
        .eq("establishment_id", establishment.id)
        .in("status", ["open", "contracted", "confirmed"]);

      if (!activeJobs?.length) return;
      const now = new Date();
      for (const job of activeJobs) {
        if (!job.end_time) continue;
        const endPlusOne = new Date(new Date(job.end_time).getTime() + 60000);
        if (now >= endPlusOne && !shiftEndProcessedRef.current.has(job.id) && !endingJob && !reviewJob) {
          shiftEndProcessedRef.current.add(job.id);
          const { data: apps } = await supabase
            .from("job_applications").select("driver_id").eq("job_id", job.id)
            .in("status", ["contracted", "confirmed"]).limit(1);
          let name = "Motorista";
          if (apps?.[0]?.driver_id) {
            const { data: p } = await supabase.from("profiles").select("full_name").eq("id", apps[0].driver_id).maybeSingle();
            if (p) name = p.full_name;
          }
          setEndingDriverName(name);
          setEndingJob(job as Job);
          setShiftEndMode("choose");
          setExtendMinutes(null);
          setOfferBonus(false);
          setBonusValue("");
          setFinalBonus("");
          break;
        }
      }
    };
    checkEndingJobs();
    const interval = setInterval(checkEndingJobs, 30000);
    return () => clearInterval(interval);
  }, [establishment?.id, endingJob, reviewJob]);

  // Listen for job completion to trigger review
  useEffect(() => {
    if (!establishment?.id) return;
    const channel = supabase.channel("job-complete-review")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "jobs" }, async (payload) => {
        const updated = payload.new as any;
        if (updated.status === "completed" && updated.establishment_id === establishment.id && !reviewJob) {
          const { data: apps } = await supabase.from("job_applications").select("driver_id")
            .eq("job_id", updated.id).in("status", ["contracted", "confirmed"]).limit(1);
          if (apps?.[0]?.driver_id) {
            const driverId = apps[0].driver_id;
            const { data: p } = await supabase.from("profiles").select("full_name").eq("id", driverId!).maybeSingle();
            setReviewDriverId(driverId);
            setReviewDriverName(p?.full_name || "Motorista");
            setReviewJob(updated as Job);
            setReviewRating(5);
            setReviewTags([]);
            setReviewComment("");
          }
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [establishment?.id, reviewJob]);

  const handleExtendShift = async () => {
    if (!endingJob || !extendMinutes) return;
    setSavingShiftEnd(true);
    const bonus = offerBonus && bonusValue ? parseFloat(bonusValue) : 0;
    const { error } = await supabase.from("jobs").update({
      extended_minutes: extendMinutes,
      bonus_value: bonus,
      extension_confirmed: false,
      status: "open",
    } as any).eq("id", endingJob.id);
    setSavingShiftEnd(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Extensão enviada!", description: "Aguardando aceite do piloto..." });
      setEndingJob(null);
      fetchJobs();
    }
  };

  const handleFinalizeShift = async () => {
    if (!endingJob) return;
    setSavingShiftEnd(true);
    const bonus = finalBonus ? parseFloat(finalBonus) : 0;
    const { error } = await supabase.from("jobs").update({
      status: "completed",
      bonus_value: (endingJob.bonus_value || 0) + bonus,
    } as any).eq("id", endingJob.id);
    setSavingShiftEnd(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Turno finalizado!", description: "O turno foi encerrado com sucesso." });
      // The review drawer will open via realtime listener
      setEndingJob(null);
      fetchJobs();
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewDriverId || !establishment) return;
    setSavingReview(true);
    const fullComment = [
      reviewTags.length ? `Tags: ${reviewTags.join(", ")}` : "",
      reviewComment,
    ].filter(Boolean).join(" — ");

    const { error } = await supabase.from("establishment_reviews").insert({
      driver_id: reviewDriverId,
      establishment_id: establishment.id,
      rating: reviewRating,
      comment: fullComment || null,
    });
    setSavingReview(false);
    if (error) {
      toast({ title: "Erro ao avaliar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Avaliação enviada!", description: "Obrigado pelo feedback." });
      setReviewJob(null);
      setReviewDriverId(null);
    }
  };

  const toggleReviewTag = (tag: string) => {
    setReviewTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };


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

    // 1) fleet_history (both active and inactive for history)
    const { data: fleetData } = await supabase
      .from("fleet_history")
      .select("id, driver_id, is_active, hired_at")
      .eq("establishment_id", establishment.id);

    // 2) contracted job_applications (active drivers)
    const { data: estJobs } = await supabase
      .from("jobs")
      .select("id, status")
      .eq("establishment_id", establishment.id);

    let contractedDriverIds: string[] = [];
    if (estJobs?.length) {
      // Only look at jobs that are NOT finalized
      const activeJobIds = estJobs.filter(j => j.status !== "finalizado").map(j => j.id);
      if (activeJobIds.length) {
        const { data: contracted } = await supabase
          .from("job_applications")
          .select("driver_id")
          .in("job_id", activeJobIds)
          .in("status", ["contracted", "confirmed"]);
        contractedDriverIds = (contracted || []).map(c => c.driver_id).filter(Boolean) as string[];
      }
    }

    const fleetDriverIds = (fleetData || []).map(f => f.driver_id).filter(Boolean) as string[];
    const allDriverIds = [...new Set([...contractedDriverIds, ...fleetDriverIds])];

    if (!allDriverIds.length) { setFleet([]); return; }

    const [{ data: profiles }, { data: driverProfiles }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, phone").in("id", allDriverIds),
      supabase.from("driver_profiles").select("id, vehicle_type, has_bag, profile_photo_url, rating_avg, total_deliveries, cnh_number, cnh_category").in("id", allDriverIds),
    ]);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));
    const driverMap = new Map((driverProfiles || []).map(d => [d.id, d]));
    const fleetMap = new Map((fleetData || []).map(f => [f.driver_id!, f]));
    const contractedSet = new Set(contractedDriverIds);

    const result: FleetMember[] = allDriverIds.map(driverId => {
      const profile = profileMap.get(driverId);
      const driver = driverMap.get(driverId);
      const fh = fleetMap.get(driverId);
      const isContracted = contractedSet.has(driverId);
      return {
        fleet_id: fh?.id || driverId,
        driver_id: driverId,
        is_active: isContracted || (fh?.is_active ?? false),
        hired_at: fh?.hired_at || new Date().toISOString(),
        full_name: profile?.full_name || "Sem nome",
        phone: profile?.phone || null,
        vehicle_type: driver?.vehicle_type || null,
        has_bag: driver?.has_bag || false,
        profile_photo_url: driver?.profile_photo_url || null,
        rating_avg: driver?.rating_avg ?? null,
        total_deliveries: driver?.total_deliveries ?? 0,
        cnh_number: driver?.cnh_number || null,
        cnh_category: driver?.cnh_category || null,
        source: isContracted ? "contracted" : "history",
      };
    });

    // Sort: contracted (active) first
    result.sort((a, b) => {
      if (a.source === "contracted" && b.source !== "contracted") return -1;
      if (a.source !== "contracted" && b.source === "contracted") return 1;
      return 0;
    });

    setFleet(result);
  };

  const fetchJobs = async () => {
    if (!establishment) return;
    const { data } = await supabase
      .from("jobs")
      .select("id, title, status, shift_type, hiring_type, payment_type, fixed_value, km_value, created_at, start_time, end_time, requirements, bonus_value, extended_minutes, extension_confirmed")
      .eq("establishment_id", establishment.id)
      .order("created_at", { ascending: false });
    setJobs((data || []) as Job[]);
  };

  const fetchReviews = async (driverId: string) => {
    setLoadingReviews(true);
    const { data } = await supabase
      .from("establishment_reviews")
      .select("rating, comment, created_at, establishment_id")
      .eq("driver_id", driverId);

    if (!data?.length) { setReviews([]); setLoadingReviews(false); return; }

    const estIds = [...new Set(data.map(r => r.establishment_id))];
    const { data: ests } = await supabase.from("establishments").select("id, name").in("id", estIds);
    const estMap = new Map((ests || []).map(e => [e.id, e.name]));

    setReviews(data.map(r => ({
      rating: r.rating,
      comment: r.comment,
      created_at: r.created_at,
      establishment_name: estMap.get(r.establishment_id) || "Estabelecimento",
    })));
    setLoadingReviews(false);
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

  const openJobSheet = (job?: Job) => {
    if (job) {
      setEditingJob(job);
      const startDate = job.start_time ? new Date(job.start_time) : null;
      const endDate = job.end_time ? new Date(job.end_time) : null;
      setJobForm({
        title: job.title || "",
        shift_type: job.shift_type || "full",
        hiring_type: job.hiring_type || "freelancer",
        payment_type: job.payment_type || "fixed",
        fixed_value: job.fixed_value != null ? String(job.fixed_value) : "",
        km_value: job.km_value != null ? String(job.km_value) : "",
        vehicle_type: job.requirements?.vehicle_type || "moto",
        start_time: startDate ? startDate.toTimeString().slice(0, 5) : "",
        end_time: endDate ? endDate.toTimeString().slice(0, 5) : "",
        job_date: startDate ? startDate.toISOString().slice(0, 10) : "",
      });
    } else {
      setEditingJob(null);
      setJobForm({ title: "", shift_type: "full", hiring_type: "freelancer", payment_type: "fixed", fixed_value: "", km_value: "", vehicle_type: "moto", start_time: "", end_time: "", job_date: "" });
    }
    setJobSheet(true);
  };

  const handleSaveJob = async () => {
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

    const startDateTime = `${jobForm.job_date}T${jobForm.start_time}:00-03:00`;
    const endDateTime = `${jobForm.job_date}T${jobForm.end_time}:00-03:00`;

    const payload = {
      title: jobForm.title || `Entregador ${vehicleLabel(jobForm.vehicle_type)}`,
      shift_type: jobForm.shift_type,
      hiring_type: jobForm.hiring_type,
      payment_type: jobForm.payment_type,
      fixed_value: jobForm.fixed_value ? parseFloat(jobForm.fixed_value) : null,
      km_value: jobForm.km_value ? parseFloat(jobForm.km_value) : null,
      start_time: startDateTime,
      end_time: endDateTime,
      requirements: { vehicle_type: jobForm.vehicle_type },
    };

    let error;
    if (editingJob) {
      ({ error } = await supabase.from("jobs").update(payload as any).eq("id", editingJob.id));
    } else {
      ({ error } = await supabase.from("jobs").insert({ ...payload, establishment_id: establishment.id, status: "open" } as any));
    }

    if (error) {
      toast({ title: "Erro ao salvar vaga", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingJob ? "Vaga atualizada!" : "Vaga publicada!", description: editingJob ? "As alterações foram salvas." : "Os motoristas da região já podem vê-la no Radar." });
      setJobSheet(false);
      setEditingJob(null);
      fetchJobs();
    }
    setSavingJob(false);
  };

  const openFleetProfile = (member: FleetMember) => {
    setSelectedFleetMember(member);
    setFleetProfileTab("ratings");
    fetchReviews(member.driver_id);
  };

  // Rating distribution for chart
  const ratingDistribution = () => {
    const dist = [0, 0, 0, 0, 0]; // 1-5
    reviews.forEach(r => {
      if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++;
    });
    const max = Math.max(...dist, 1);
    return dist.map((count, i) => ({ stars: i + 1, count, pct: (count / max) * 100 }));
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "—";

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
    <div className="space-y-6 animate-fade-in relative">
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
                <Card
                  key={m.fleet_id}
                  className={`cursor-pointer hover:border-primary/30 transition-colors ${m.source === "contracted" ? "border-green-400 ring-1 ring-green-200" : ""}`}
                  onClick={() => openFleetProfile(m)}
                >
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
                    {m.source === "contracted" ? (
                      <Badge className="bg-green-100 text-green-700 border-green-300 hover:bg-green-100 shrink-0 text-[10px]">Em Serviço</Badge>
                    ) : m.is_active ? (
                      <Badge variant="outline" className="text-green-600 border-green-300 shrink-0 text-[10px]">Ativo</Badge>
                    ) : (
                      <Badge variant="secondary" className="shrink-0 text-[10px]">Histórico</Badge>
                    )}
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
                    {a.status === "approved" ? (
                      <Badge className="bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-100 shrink-0 text-[10px]">Aguardando Confirmação</Badge>
                    ) : (
                      <Badge variant="outline" className="text-blue-600 border-blue-300 shrink-0 text-[10px]">Novo</Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ============ MINHAS VAGAS ============ */}
        <TabsContent value="jobs" className="mt-4 space-y-4">
          {loadingData ? (
            <div className="grid gap-3">{[1,2].map(i => <Skeleton key={i} className="h-20" />)}</div>
          ) : jobs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-2">
                <Briefcase className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-muted-foreground">Nenhuma vaga criada.</p>
                <p className="text-xs text-muted-foreground">Clique no botão + para criar sua primeira vaga.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {jobs.map(j => (
                <Card key={j.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => openJobSheet(j)}>
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

          {/* FAB */}
          <Button
            className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg p-0"
            onClick={() => openJobSheet()}
          >
            <Plus className="w-6 h-6" />
          </Button>
        </TabsContent>
      </Tabs>

      {/* ============ SHEET PERFIL MOTORISTA INTERESSADO ============ */}
      <Sheet open={!!selectedApplicant} onOpenChange={(open) => !open && setSelectedApplicant(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Perfil do Motorista</SheetTitle>
          </SheetHeader>
          {selectedApplicant && (
            <div className="space-y-5 mt-4">
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

              {selectedApplicant.status === "approved" ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center text-sm text-amber-700">
                  Aprovado — aguardando confirmação de presença do motorista.
                </div>
              ) : (
                <Button className="w-full" onClick={() => handleApprove(selectedApplicant)} disabled={hiring}>
                  {hiring ? "Aprovando..." : "Aprovar Motorista"}
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ============ SHEET PERFIL FROTA ============ */}
      <Sheet open={!!selectedFleetMember} onOpenChange={(open) => !open && setSelectedFleetMember(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Perfil do Motorista</SheetTitle>
          </SheetHeader>
          {selectedFleetMember && (
            <div className="space-y-5 mt-4">
              <div className="flex flex-col items-center gap-3">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={getAvatarUrl(selectedFleetMember.profile_photo_url)} />
                  <AvatarFallback className="text-2xl">{selectedFleetMember.full_name.charAt(0)}</AvatarFallback>
                </Avatar>
                <h2 className="text-lg font-semibold text-foreground">{selectedFleetMember.full_name}</h2>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">{vehicleIcon(selectedFleetMember.vehicle_type)} {vehicleLabel(selectedFleetMember.vehicle_type)}</span>
                  {selectedFleetMember.has_bag && <Badge variant="secondary" className="text-xs">Bag</Badge>}
                  <span>· {selectedFleetMember.total_deliveries} entregas</span>
                </div>
              </div>

              {(selectedFleetMember.cnh_number || selectedFleetMember.cnh_category) && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                  <p className="font-medium text-foreground">CNH</p>
                  {selectedFleetMember.cnh_number && <p className="text-muted-foreground">Número: {selectedFleetMember.cnh_number}</p>}
                  {selectedFleetMember.cnh_category && <p className="text-muted-foreground">Categoria: {selectedFleetMember.cnh_category}</p>}
                </div>
              )}

              {/* Sub-tabs: Avaliações / Comentários */}
              <div className="flex gap-2 border-b">
                <button
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${fleetProfileTab === "ratings" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                  onClick={() => setFleetProfileTab("ratings")}
                >
                  <BarChart3 className="w-4 h-4" /> Avaliações
                </button>
                <button
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${fleetProfileTab === "comments" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                  onClick={() => setFleetProfileTab("comments")}
                >
                  <MessageSquare className="w-4 h-4" /> Comentários
                </button>
              </div>

              {loadingReviews ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : fleetProfileTab === "ratings" ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl font-bold text-foreground">{avgRating}</div>
                    <div className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span>{reviews.length} avaliação(ões)</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {ratingDistribution().reverse().map(d => (
                      <div key={d.stars} className="flex items-center gap-2 text-sm">
                        <span className="w-4 text-muted-foreground">{d.stars}</span>
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <Progress value={d.pct} className="h-2 flex-1" />
                        <span className="w-6 text-right text-muted-foreground text-xs">{d.count}</span>
                      </div>
                    ))}
                  </div>
                  {reviews.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhuma avaliação ainda.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum comentário ainda.</p>
                  ) : (
                    reviews.filter(r => r.comment).map((r, i) => (
                      <div key={i} className="bg-muted/50 rounded-lg p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">{r.establishment_name}</span>
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            <span className="text-xs text-muted-foreground">{r.rating}</span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{r.comment}</p>
                        <p className="text-xs text-muted-foreground/60">{new Date(r.created_at).toLocaleDateString("pt-BR")}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ============ SHEET CRIAR/EDITAR VAGA ============ */}
      <Sheet open={jobSheet} onOpenChange={(open) => { if (!open) { setJobSheet(false); setEditingJob(null); } }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingJob ? "Editar Vaga" : "Nova Vaga de Entregador"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
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
            <Button className="w-full" onClick={handleSaveJob} disabled={savingJob}>
              {savingJob ? "Salvando..." : editingJob ? "Salvar Alterações" : "Publicar Vaga"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ============ SHEET FINAL DE TURNO ============ */}
      <Sheet open={!!endingJob} onOpenChange={(open) => { if (!open) setEndingJob(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              O turno encerrou
            </SheetTitle>
          </SheetHeader>
          {endingJob && (
            <div className="space-y-5 mt-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">Motorista</p>
                <p className="text-lg font-semibold text-foreground">{endingDriverName}</p>
                <p className="text-xs text-muted-foreground mt-1">Vaga: {endingJob.title}</p>
              </div>

              {shiftEndMode === "choose" && (
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full h-14 text-base gap-2"
                    onClick={() => setShiftEndMode("extend")}
                  >
                    <Clock className="w-5 h-5" />
                    Estender Turno
                  </Button>
                  <Button
                    className="w-full h-14 text-base gap-2"
                    onClick={() => setShiftEndMode("finalize")}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Finalizar e Pagar
                  </Button>
                </div>
              )}

              {shiftEndMode === "extend" && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Tempo extra</Label>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {[10, 20, 30, 60].map(min => (
                        <button
                          key={min}
                          onClick={() => setExtendMinutes(min)}
                          className={`rounded-xl border-2 p-3 text-center transition-all ${
                            extendMinutes === min
                              ? "border-primary bg-primary/10 text-primary font-bold"
                              : "border-border bg-background text-foreground hover:border-primary/50"
                          }`}
                        >
                          <span className="text-lg font-semibold">{min}</span>
                          <span className="block text-xs text-muted-foreground">min</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Oferecer Bônus?</Label>
                    <Switch checked={offerBonus} onCheckedChange={setOfferBonus} />
                  </div>

                  {offerBonus && (
                    <div className="space-y-2">
                      <Label>Valor do bônus (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="10.00"
                        value={bonusValue}
                        onChange={e => setBonusValue(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setShiftEndMode("choose")}>Voltar</Button>
                    <Button className="flex-1" onClick={handleExtendShift} disabled={!extendMinutes || savingShiftEnd}>
                      {savingShiftEnd ? "Enviando..." : "Enviar Proposta"}
                    </Button>
                  </div>
                </div>
              )}

              {shiftEndMode === "finalize" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Bônus de gratificação (R$) — opcional</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={finalBonus}
                      onChange={e => setFinalBonus(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Valor extra para o motorista como reconhecimento.</p>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setShiftEndMode("choose")}>Voltar</Button>
                    <Button className="flex-1" onClick={handleFinalizeShift} disabled={savingShiftEnd}>
                      {savingShiftEnd ? "Finalizando..." : "Finalizar Turno"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ============ SHEET AVALIAÇÃO DO MOTORISTA ============ */}
      <Sheet open={!!reviewJob} onOpenChange={(open) => { if (!open) { setReviewJob(null); setReviewDriverId(null); } }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              Avaliar Motorista
            </SheetTitle>
          </SheetHeader>
          {reviewJob && (
            <div className="space-y-5 mt-4">
              <div className="text-center">
                <p className="text-lg font-semibold text-foreground">{reviewDriverName}</p>
                <p className="text-sm text-muted-foreground">Vaga: {reviewJob.title}</p>
              </div>

              {/* Stars */}
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => setReviewRating(s)} className="transition-transform hover:scale-110">
                    <Star
                      className={`w-10 h-10 ${s <= reviewRating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`}
                    />
                  </button>
                ))}
              </div>

              {/* Quick tags */}
              <div>
                <Label className="text-sm">Tags rápidas</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {["Pontual", "Educado", "Ágil", "Cuidadoso", "Proativo"].map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleReviewTag(tag)}
                      className={`rounded-full px-3 py-1.5 text-sm border transition-all ${
                        reviewTags.includes(tag)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-border hover:border-primary/50"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div className="space-y-2">
                <Label>Comentário (opcional)</Label>
                <Textarea
                  placeholder="Como foi a experiência com este motorista?"
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  rows={3}
                />
              </div>

              <Button className="w-full" onClick={handleSubmitReview} disabled={savingReview}>
                {savingReview ? "Enviando..." : "Enviar Avaliação"}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default DriversPage;
