import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SupervisorRowSkeleton } from "./skeletons";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Checkbox } from "../../components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../../components/ui/command";
import { Calendar } from "../../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { cn } from "../../components/ui/utils";
import { format, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { getDefaultFormConfig, getBackendFormCode, type FormId, type FormRole, type Group } from "../../../lib/formConfig";
import { updateFormsCache } from "../../components/FormAccessGuard";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";
import { useTheme } from "../../context/ThemeContext";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronUp, Eye, EyeOff, FileText, Grid2x2, Key, Layers, Loader2, Moon, PencilLine, Plus, Power, RefreshCw, Search, Shield, Sun, Trash2, Users, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { carrieras } from "../../data/curricula";
import { clearAvatarCache, isImageUrl, useResolvedAvatarUrl } from "../../lib/avatar";
import defaultAvatar from "../../../assets/elementos/perfil2.webp";


type ConfigTab = "formularios" | "grupos" | "cuenta" | "supervisores";

interface ConfigurationProps {
  initialTab?: ConfigTab;
  onDirtyChange?: (dirty: boolean) => void;
}

type SupervisorPermission = { user_id: number; user_name: string; email: string; sections: string[]; avatar?: string | null };

function SupervisorAvatar({ avatarUrl, name }: { avatarUrl?: string | null; name: string }) {
  const rawAvatar = avatarUrl && isImageUrl(avatarUrl) ? avatarUrl : null;
  const resolved = useResolvedAvatarUrl(rawAvatar);
  return (
    <Avatar className="h-9 w-9 shrink-0 ring-1 ring-white/80 dark:ring-slate-900/60">
      {resolved ? (
        <AvatarImage src={resolved} alt={name} className="h-full w-full object-cover" />
      ) : null}
      <AvatarFallback className="bg-transparent p-0 overflow-hidden">
        <img src={defaultAvatar} alt={name} className="h-full w-full object-cover" />
      </AvatarFallback>
    </Avatar>
  );
}

const SUPERVISOR_SECTIONS = [
  { id: "planeacion", label: "Planeación" },
  { id: "instrumento-30", label: "Instrumento 30%" },
  { id: "instrumento-40", label: "Instrumento 40%" },
  { id: "instrumento-60", label: "Instrumento 60%" },
  { id: "instrumento-70", label: "Instrumento 70%" },
  { id: "remedial", label: "Remedial" },
  { id: "lista-concentrada", label: "Lista Concentrada" },
  { id: "asesoria", label: "Asesoría" },
  { id: "portafolio", label: "Portafolio Digital Final" },
  { id: "acta-final", label: "Acta Final" },
  { id: "estadias", label: "Estadías" },
  { id: "tutorias", label: "Tutorías" },
] as const;

type CareerOption = {
  codigo: string;
  nombre: string;
  tipo: "TSU" | "Ingeniería";
};

const getCareerOptions = (selectedPlan: "nuevo-modelo" | "plan-normal"): CareerOption[] => {
  if (selectedPlan === "nuevo-modelo") {
    return [
      ...carrieras["nuevo-modelo"].tsu.map((career) => ({ ...career, tipo: "TSU" as const })),
      ...carrieras["nuevo-modelo"].ingenieria.map((career) => ({ ...career, tipo: "Ingeniería" as const })),
    ];
  }

  return carrieras["plan-normal"].ingenieria.map((career) => ({ ...career, tipo: "Ingeniería" as const }));
};

const getCuatrimestresForCareer = (selectedPlan: "nuevo-modelo" | "plan-normal", careerType: "TSU" | "Ingeniería") => {
  if (selectedPlan === "nuevo-modelo") {
    return careerType === "TSU"
      ? [0, 1, 2, 3, 4, 5, 6]
      : [7, 8, 9, 10]; // cuatrimestre 10 = Estadías en nuevo modelo
  }

  return careerType === "TSU" ? [] : [7, 8, 9, 10, 11];
};

const cuatrimestresLabel = (n: number): string => {
  if (n === 0) return "Propedéutico";
  return `Cuatrimestre ${n}`;
};

type FormSectionId = "docentes" | "tutorias" | "estadias";

const FORM_DEFINITIONS: Array<{ id: FormId; title: string; description: string; section: FormSectionId }> = [
  { id: "planeacion", title: "Planeación", description: "Planeación académica", section: "docentes" },
  { id: "instrumento-30-normal", title: "Instrumento 30%", description: "Evaluación intermedia - Plan Normal", section: "docentes" },
  { id: "instrumento-40-nuevo", title: "Instrumento 40%", description: "Evaluación intermedia - Nuevo Modelo", section: "docentes" },
  { id: "instrumento-60-nuevo", title: "Instrumento 60%", description: "Evaluación final parcial - Nuevo Modelo", section: "docentes" },
  { id: "instrumento-70-normal", title: "Instrumento 70%", description: "Evaluación final parcial - Plan Normal", section: "docentes" },
  { id: "lista-concentrada", title: "Lista Concentrada", description: "Concentrado general", section: "docentes" },
  { id: "asesoria", title: "Asesoría", description: "Registro de asesorías", section: "docentes" },
  { id: "portafolio-digital", title: "Portafolio Digital", description: "Entrega de evidencias", section: "docentes" },
  { id: "acta-final", title: "Acta Final", description: "Cierre del periodo", section: "docentes" },
  { id: "remedial", title: "Remedial", description: "Documentos de evaluación remedial", section: "docentes" },
  { id: "carga-academica", title: "Carga Académica", description: "Registro de carga académica", section: "tutorias" },
  { id: "reporte-bajas", title: "Reporte de Bajas", description: "Seguimiento de bajas reportadas", section: "tutorias" },
  { id: "concentrado-asesorias", title: "Concentrado de Asesorías", description: "Concentrado general de asesorías", section: "tutorias" },
  { id: "acta-asistencia-grupal", title: "Acta de Asistencia Grupal", description: "Registro de asistencia de grupo", section: "tutorias" },
  { id: "ficha-tecnica", title: "Ficha Técnica", description: "Ficha técnica del proceso", section: "tutorias" },
  { id: "carta-presentacion", title: "Carta de Presentación", description: "Documento inicial de estadías", section: "estadias" },
  { id: "carta-aceptacion", title: "Carta de Aceptación", description: "Confirmación de aceptación", section: "estadias" },
  { id: "carta-terminacion", title: "Carta de Terminación", description: "Cierre del periodo de estadías", section: "estadias" },
  { id: "estadias", title: "Acta Final", description: "Cierre y acta final de estadías", section: "estadias" },
];

const FORM_ROLE_LABELS: Record<FormRole, string> = {
  docente: "Docente",
  tutor: "Tutor",
};

type PasswordStrength = { score: number; label: string; color: string };

function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score, label: "Débil", color: "bg-red-500" };
  if (score === 3) return { score, label: "Media", color: "bg-yellow-500" };
  if (score === 4) return { score, label: "Fuerte", color: "bg-emerald-500" };
  return { score, label: "Muy fuerte", color: "bg-emerald-600" };
}

function DeadlineDatePicker({ value, disabled, onChange }: { value: string; disabled: boolean; onChange: (date: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const rawDate = value ? new Date(`${value}T00:00:00`) : undefined;
  const selected = rawDate && isValid(rawDate) ? rawDate : undefined;

  return (
    <Popover open={open && !disabled} onOpenChange={(o) => { if (!disabled) setOpen(o); }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "flex-1 justify-start text-left font-normal h-9 px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100",
            !selected && "text-muted-foreground",
          )}
        >
          <CalendarDays className="mr-2 h-4 w-4 shrink-0 opacity-70" />
          {selected ? format(selected, "dd/MM/yyyy", { locale: es }) : "Selecciona una fecha"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            if (date) {
              const pad = (n: number) => String(n).padStart(2, "0");
              onChange(`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`);
            } else {
              onChange("");
            }
            setOpen(false);
          }}
          disabled={{ before: new Date() }}
          locale={es}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export function Configuration(props: Readonly<ConfigurationProps>) {
  const { initialTab = "formularios", onDirtyChange } = props;
  const { user, updateProfile, refreshUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<ConfigTab>(initialTab);
  const [mobileSectionOpen, setMobileSectionOpen] = useState(false);
  // Estado inicial con getDefaultFormConfig - SIN localStorage
  const [formConfig, setFormConfig] = useState(getDefaultFormConfig());
  const [formCodeToId, setFormCodeToId] = useState<Record<FormId, number>>({} as Record<FormId, number>);
  const [, setIsFormConfigLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  // Estado inicial con getDefaultFormConfig - SIN localStorage
  const [formDrafts, setFormDrafts] = useState<Record<FormId, { roles: FormRole[]; dueAt: string | null }>>(() => getDefaultFormConfig().formAccess);
  const [savingFormIds, setSavingFormIds] = useState<Record<FormId, boolean>>({} as Record<FormId, boolean>);
  type FormUIMode = "sinLimite" | "fechaLimite" | "cerrado";
  const [formUIModes, setFormUIModes] = useState<Partial<Record<FormId, FormUIMode>>>({});

  const [plan, setPlan] = useState<"nuevo-modelo" | "plan-normal">("nuevo-modelo");
  const [careerCode, setCareerCode] = useState("");
  const [cuatrimestre, setCuatrimestre] = useState("");
  const [groupNumber, setGroupNumber] = useState(1);

  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [editingGroupPlan, setEditingGroupPlan] = useState<"nuevo-modelo" | "plan-normal">("nuevo-modelo");
  const [editingGroupCareerCode, setEditingGroupCareerCode] = useState("");
  const [editingGroupCuatrimestre, setEditingGroupCuatrimestre] = useState("");
  const [editingGroupNumber, setEditingGroupNumber] = useState(1);
  const [editingGroupOriginal, setEditingGroupOriginal] = useState<null | {
    plan: "nuevo-modelo" | "plan-normal";
    careerCode: string;
    cuatrimestre: string;
    groupNumber: number;
  }>(null);

  const [profileFirstNames, setProfileFirstNames] = useState("");
  const [profileLastNames, setProfileLastNames] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileAvatar, setProfileAvatar] = useState<string | undefined>(undefined);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [savedAvatarPreview, setSavedAvatarPreview] = useState<string | undefined>(undefined);

  const [avatarCacheBust, setAvatarCacheBust] = useState(0);

  // Extract relative path so useResolvedAvatarUrl fetches with auth+ngrok headers.
  // avatarCacheBust appended as query param forces a re-fetch after a new avatar is saved.
  const userAvatarPath = useMemo(() => {
    const src = user?.avatar;
    if (!src) return undefined;
    let path: string;
    if (src.startsWith("data:") || src.startsWith("blob:")) return src;
    if (src.startsWith("/")) {
      path = src;
    } else {
      try { path = new URL(src).pathname; } catch { path = src; }
    }
    return avatarCacheBust > 0 ? `${path}?bust=${avatarCacheBust}` : path;
  }, [user?.avatar, avatarCacheBust]);
  const resolvedCurrentAvatar = useResolvedAvatarUrl(userAvatarPath);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isBulkCreateOpen, setIsBulkCreateOpen] = useState(false);
  const [bulkPlan, setBulkPlan] = useState<"nuevo-modelo" | "plan-normal">("nuevo-modelo");
  const [bulkCareerCode, setBulkCareerCode] = useState("");
  const [bulkCuatQuantities, setBulkCuatQuantities] = useState<Record<number, number>>({});
  const [bulkExcludedCuats, setBulkExcludedCuats] = useState<Set<number>>(new Set());
  const [bulkCareerPopoverOpen, setBulkCareerPopoverOpen] = useState(false);
  const [isBulkCreating, setIsBulkCreating] = useState(false);
  const [groupSearch, setGroupSearch] = useState("");
  const [groupViewPlan, setGroupViewPlan] = useState<"nuevo-modelo" | "plan-normal">("nuevo-modelo");
  const [openFormSection, setOpenFormSection] = useState<FormSectionId | null>(null);
  const [openFormItems, setOpenFormItems] = useState<Record<FormId, boolean>>({} as Record<FormId, boolean>);
  const loadedProfileUserId = useRef<string | null>(null);

  const toggleFormItem = (id: FormId) => {
    setOpenFormItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const [deleteTarget, setDeleteTarget] = useState<null | {
    label: string;
    description: string;
    onConfirm: () => void;
  }>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  // Supervisor section permissions
  const [supervisors, setSupervisors] = useState<SupervisorPermission[]>([]);
  const [supervisorsLoading, setSupervisorsLoading] = useState(false);
  const [supervisorDrafts, setSupervisorDrafts] = useState<Record<number, string[]>>({});
  const [savingSupId, setSavingSupId] = useState<number | null>(null);
  const [supervisorSearch, setSupervisorSearch] = useState("");
  const [expandedSupervisors, setExpandedSupervisors] = useState<Set<number>>(new Set());

  const navItems = useMemo(
    () => [
      { value: "formularios" as const, label: "Formularios", icon: FileText, description: "Campos y estructura" },
      { value: "grupos" as const, label: "Grupos", icon: Users, description: "Carreras y cuatrimestres" },
      { value: "supervisores" as const, label: "Supervisores", icon: Shield, description: "Permisos de secciones" },
      { value: "cuenta" as const, label: "Cuenta", icon: Settings2, description: "Perfil y preferencias" },
    ],
    []
  );

  // useEffect de carga - SIN localStorage, solo API
  useEffect(() => {
    const loadFormConfig = async () => {
      setIsFormConfigLoading(true);

      try {
        const res = await apiFetch('/forms');
        const baseConfig = getDefaultFormConfig();
        const formAccess = { ...baseConfig.formAccess };
        const idMap = {} as Record<FormId, number>;

        const forms = res?.data ?? [];
        const formByCode = forms.reduce((acc: Record<string, any>, item: any) => {
          const backendCode = String(item.form_code).replace(/_/g, '-');
          acc[backendCode] = item;
          return acc;
        }, {} as Record<string, any>);

        for (const formId of Object.keys(formAccess) as FormId[]) {
          const item = formByCode[formId];

          if (!item) {
            continue;
          }

          formAccess[formId] = {
            roles: item.access_roles ?? [],
            dueAt: item.due_at ?? null,
          };

          idMap[formId] = item.id;
        }

        const nextConfig = { ...baseConfig, formAccess };
        setFormConfig(nextConfig);
        setFormDrafts(nextConfig.formAccess);
        setFormCodeToId(idMap);
      } catch (err: any) {
        console.error('Failed to load forms configuration', err);
      } finally {
        setIsFormConfigLoading(false);
      }
    };

    const loadGroups = async () => {
      try {
        const res = await apiFetch('/groups');
        setGroups(res?.data ?? []);
      } catch (err: any) {
        console.error('Failed to load groups', err);
        setGroups([]);
      }
    };

    loadFormConfig();
    loadGroups();
  }, []);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!user) return;

    const shouldInitializeFromUser = loadedProfileUserId.current !== String(user.id);

    if (shouldInitializeFromUser) {
      setProfileFirstNames(user.firstNames ?? "");
      setProfileLastNames(user.lastNames ?? "");
      setProfilePhone(user.phone ?? "");
      loadedProfileUserId.current = String(user.id);
    }

    setProfileAvatar(user.avatar);
  }, [user]);

  useEffect(() => {
    if (!onDirtyChange || !user) return;
    const dirty =
      profileFirstNames !== (user.firstNames ?? "") ||
      profileLastNames !== (user.lastNames ?? "") ||
      profilePhone !== (user.phone ?? "") ||
      selectedAvatarFile !== null;
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [profileFirstNames, profileLastNames, profilePhone, selectedAvatarFile, user, onDirtyChange]);

  const careerOptions = getCareerOptions(plan);
  const selectedCareer = careerOptions.find((career) => career.codigo === careerCode) ?? null;
  const cuatrimestresDisponibles = selectedCareer ? getCuatrimestresForCareer(plan, selectedCareer.tipo) : [];
  const currentGroupName = careerCode && cuatrimestre && groupNumber ? `${careerCode}${cuatrimestre}-${groupNumber}` : "N/D";
  const editingCareerOptions = getCareerOptions(editingGroupPlan);
  const editingSelectedCareer = editingCareerOptions.find((career) => career.codigo === editingGroupCareerCode) ?? null;
  const editingCuatrimestresDisponibles = editingSelectedCareer ? getCuatrimestresForCareer(editingGroupPlan, editingSelectedCareer.tipo) : [];
  const editingCurrentGroupName = editingGroupCareerCode && editingGroupCuatrimestre && editingGroupNumber
    ? `${editingGroupCareerCode}${editingGroupCuatrimestre}-${editingGroupNumber}`
    : "N/D";
  const isEditingGroupDirty = Boolean(
    editingGroupOriginal && (
      editingGroupOriginal.plan !== editingGroupPlan ||
      editingGroupOriginal.careerCode.trim().toUpperCase() !== editingGroupCareerCode.trim().toUpperCase() ||
      editingGroupOriginal.cuatrimestre !== editingGroupCuatrimestre ||
      editingGroupOriginal.groupNumber !== Number(editingGroupNumber)
    )
  );
  const filteredGroups = useMemo(
    () => groups.filter((group) => {
      const query = groupSearch.trim().toLowerCase();
      if (!query) return true;
      return [group.name, String(group.cuatrimestre), String(group.groupNumber), group.careerCode]
        .some((value) => value.toLowerCase().includes(query));
    }),
    [groups, groupSearch]
  );
  const selectedPlanGroups = useMemo(
    () => filteredGroups.filter((group) => group.plan === groupViewPlan),
    [filteredGroups, groupViewPlan]
  );
  const selectedPlanCareerGroups = useMemo(
    () => getCareerOptions(groupViewPlan)
      .map((career) => ({
        career,
        groups: selectedPlanGroups.filter((group) => group.careerCode === career.codigo),
      }))
      .filter((item) => item.groups.length > 0),
    [groupViewPlan, selectedPlanGroups]
  );

  const bulkCareerOptions = getCareerOptions(bulkPlan);
  const bulkSelectedCareer = bulkCareerOptions.find((c) => c.codigo === bulkCareerCode) ?? null;
  const bulkCuatrimestres = bulkSelectedCareer ? getCuatrimestresForCareer(bulkPlan, bulkSelectedCareer.tipo) : [];
  const bulkTotalGroups = Object.entries(bulkCuatQuantities)
    .filter(([cuat]) => !bulkExcludedCuats.has(Number(cuat)))
    .reduce((sum, [, n]) => sum + n, 0);
  const bulkExistingByCuat = useMemo(() => {
    if (!bulkCareerCode) return {} as Record<number, number>;
    const result: Record<number, number> = {};
    groups
      .filter((g) => g.careerCode === bulkCareerCode && g.plan === bulkPlan)
      .forEach((g) => { result[g.cuatrimestre] = (result[g.cuatrimestre] ?? 0) + 1; });
    return result;
  }, [groups, bulkCareerCode, bulkPlan]);

  const [openCareer, setOpenCareer] = useState<string | null>(null);
  const [openCuatrimestres, setOpenCuatrimestres] = useState<Set<string>>(new Set());

  const toggleCuatrimestre = (key: string) => {
    setOpenCuatrimestres((prev) => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      return next;
    });
  };

  useEffect(() => {
    setOpenCareer(null);
    setOpenCuatrimestres(new Set());
    setGroupSearch("");
  }, [groupViewPlan]);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setCareerCode("");
    setCuatrimestre("");
    setGroupNumber(1);
  }, [plan]);

  useEffect(() => {
    if (!bulkCareerCode) { setBulkCuatQuantities({}); return; }
    const career = getCareerOptions(bulkPlan).find((c) => c.codigo === bulkCareerCode);
    if (!career) { setBulkCuatQuantities({}); return; }
    const cuats = getCuatrimestresForCareer(bulkPlan, career.tipo);
    const initial: Record<number, number> = {};
    cuats.forEach((c) => { initial[c] = 4; });
    setBulkCuatQuantities(initial);
    setBulkExcludedCuats(new Set());
  }, [bulkCareerCode, bulkPlan]);

  useEffect(() => {
    if (!selectedCareer) {
      setCuatrimestre("");
      return;
    }

    if (cuatrimestre === "" || !cuatrimestresDisponibles.includes(Number(cuatrimestre))) {
      setCuatrimestre("");
    }
  }, [selectedCareer, cuatrimestresDisponibles, cuatrimestre]);

  useEffect(() => {
    if (!editingGroupId) return;

    if (!editingSelectedCareer) {
      setEditingGroupCuatrimestre("");
      return;
    }

    if (editingGroupCuatrimestre === "" || !editingCuatrimestresDisponibles.includes(Number(editingGroupCuatrimestre))) {
      setEditingGroupCuatrimestre("");
    }
  }, [editingGroupId, editingSelectedCareer, editingCuatrimestresDisponibles, editingGroupCuatrimestre]);

  const setFormDraftValue = (
    formId: FormId,
    updater: (current: { roles: FormRole[]; dueAt: string | null }) => { roles: FormRole[]; dueAt: string | null },
  ) => {
    setFormDrafts((current) => ({
      ...current,
      [formId]: updater(current[formId] ?? formConfig.formAccess[formId]),
    }));
  };

  const getFormUIMode = (formId: FormId): FormUIMode => {
    if (formUIModes[formId] !== undefined) return formUIModes[formId]!;
    const dueAt = formConfig.formAccess[formId]?.dueAt ?? null;
    if (!dueAt) return "sinLimite";
    const d = new Date(dueAt);
    if (!isValid(d)) return "sinLimite";
    return d <= new Date() ? "cerrado" : "fechaLimite";
  };

  const saveFormAccessRule = async (formId: FormId, nextRule: { roles: FormRole[]; dueAt: string | null }) => {
    let formIdNumber = formCodeToId[formId];

    // Si el mapa de IDs está vacío (p.ej. por re-mount en desarrollo), recargarlo antes de guardar
    if (!formIdNumber) {
      try {
        const res = await apiFetch('/forms');
        const forms = res?.data ?? [];
        const newIdMap = {} as Record<FormId, number>;
        const formByCode = forms.reduce((acc: Record<string, any>, item: any) => {
          acc[String(item.form_code).replace(/_/g, '-')] = item;
          return acc;
        }, {} as Record<string, any>);
        for (const fId of Object.keys(formByCode) as FormId[]) {
          if (formByCode[fId]) newIdMap[fId] = formByCode[fId].id;
        }
        setFormCodeToId((prev) => ({ ...prev, ...newIdMap }));
        formIdNumber = newIdMap[formId];
      } catch {
        // silencio — el toast de abajo lo cubre
      }
    }

    if (!formIdNumber) {
      toast.error('No se encontró el identificador del formulario. Actualiza la página e intenta de nuevo.');
      return false;
    }

    try {
      await apiFetch(`/forms/${formIdNumber}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_roles: nextRule.roles,
          due_at: nextRule.dueAt ?? null,
        }),
      });
      return true;
    } catch (err: any) {
      toast.error(err?.message ?? 'No fue posible guardar la configuración del formulario');
      return false;
    }
  };

  const handleSaveForm = async (formId: FormId) => {
    const currentDraft = formDrafts[formId];
    if (!currentDraft) {
      toast.error('No hay cambios para guardar.');
      return;
    }

    if (currentDraft.dueAt !== null && !currentDraft.dueAt.slice(11, 16)) {
      toast.error('Selecciona una fecha y hora límite antes de guardar.');
      return;
    }

    if (formUIModes[formId] === "fechaLimite" && currentDraft.dueAt) {
      const d = new Date(currentDraft.dueAt);
      if (isValid(d) && d <= new Date()) {
        toast.error('La fecha y hora límite ya han pasado. Selecciona una fecha futura.');
        return;
      }
    }

    const isDifferent = JSON.stringify(currentDraft) !== JSON.stringify(formConfig.formAccess[formId]);
    if (!isDifferent) {
      toast('No hay cambios pendientes.');
      return;
    }

    setSavingFormIds((current) => ({ ...current, [formId]: true }));
    const success = await saveFormAccessRule(formId, currentDraft);
    if (success) {
      // Solo actualizar estado en memoria, NO localStorage
      setFormConfig((current) => ({
        ...current,
        formAccess: {
          ...current.formAccess,
          [formId]: currentDraft,
        },
      }));
      toast.success('Configuración guardada');
      setFormUIModes((prev) => { const next = { ...prev }; delete next[formId]; return next; });
      updateFormsCache(getBackendFormCode(formId), { roles: currentDraft.roles, dueAt: currentDraft.dueAt });
      if (typeof BroadcastChannel !== "undefined") {
        const bc = new BroadcastChannel("form_config_changed");
        bc.postMessage({ formId, roles: currentDraft.roles, dueAt: currentDraft.dueAt });
        bc.close();
      }
    }
    setSavingFormIds((current) => ({ ...current, [formId]: false }));
  };

  const handleResetForm = (formId: FormId) => {
    setFormDrafts((current) => ({
      ...current,
      [formId]: formConfig.formAccess[formId],
    }));
    setFormUIModes((prev) => { const next = { ...prev }; delete next[formId]; return next; });
  };

  const toggleFormRole = (formId: FormId, role: FormRole) => {
    setFormDraftValue(formId, (current) => {
      const nextRoles = current.roles.includes(role)
        ? current.roles.filter((item) => item !== role)
        : [...current.roles, role];

      return {
        ...current,
        roles: nextRoles.length > 0 ? nextRoles : [role],
      };
    });
  };

  const handleDeadlineChange = (formId: FormId, value: string) => {
    setFormDraftValue(formId, (current) => ({
      ...current,
      dueAt: value,
    }));
  };

  const handleAddGroup = async () => {
    if (!careerCode.trim() || !cuatrimestre) return;
    setIsLoading(true);
    try {
      const payload = {
        careerCode: careerCode.trim().toUpperCase(),
        plan,
        cuatrimestre: Number(cuatrimestre),
        groupNumber: Number(groupNumber),
      };
      const res = await apiFetch('/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res?.data) setGroups((prev) => [res.data, ...prev]);
      setCareerCode("");
      setCuatrimestre("");
      setGroupNumber(1);
      setIsCreateGroupOpen(false);
      toast.success('Grupo creado');
    } catch (err: any) {
      toast.error(err?.message ?? 'No fue posible crear el grupo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkCreate = async () => {
    if (!bulkCareerCode || bulkTotalGroups === 0) return;
    setIsBulkCreating(true);
    try {
      const tasks: Array<{ cuatrimestre: number; groupNumber: number }> = [];
      for (const [cuatStr, qty] of Object.entries(bulkCuatQuantities)) {
        const cuat = Number(cuatStr);
        if (bulkExcludedCuats.has(cuat)) continue;
        // Partir del número más alto existente para no colisionar con grupos ya creados
        const maxExisting = groups
          .filter((g) => g.careerCode === bulkCareerCode && g.plan === bulkPlan && g.cuatrimestre === cuat)
          .reduce((max, g) => Math.max(max, g.groupNumber), 0);
        for (let i = maxExisting + 1; i <= maxExisting + qty; i++) {
          tasks.push({ cuatrimestre: cuat, groupNumber: i });
        }
      }
      // Procesar en lotes de 3 para no saturar el servidor
      const BATCH_SIZE = 3;
      const allResults: PromiseSettledResult<any>[] = [];
      for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
        const batch = tasks.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.allSettled(
          batch.map(({ cuatrimestre, groupNumber }) =>
            apiFetch('/groups', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ careerCode: bulkCareerCode, plan: bulkPlan, cuatrimestre, groupNumber }),
            })
          )
        );
        allResults.push(...batchResults);
      }
      const succeeded = allResults.filter((r) => r.status === "fulfilled") as PromiseFulfilledResult<any>[];
      const failedCount = allResults.filter((r) => r.status === "rejected").length;
      // Refrescar lista completa desde el API para tener el estado real
      try {
        const res = await apiFetch('/groups');
        setGroups(res?.data ?? []);
      } catch {
        // Si falla el refresco, al menos agregar los creados exitosamente
        const newGroups = succeeded.map((r) => r.value?.data).filter(Boolean);
        if (newGroups.length > 0) setGroups((prev) => [...newGroups, ...prev]);
      }
      if (failedCount === 0) {
        toast.success(`¡${succeeded.length} grupos creados correctamente!`);
      } else if (succeeded.length > 0) {
        toast.success(`${succeeded.length} grupos creados. ${failedCount} no se pudieron crear.`);
      } else {
        toast.error(`No se pudo crear ningún grupo. Intenta de nuevo.`);
      }
      setIsBulkCreateOpen(false);
      setBulkCareerCode("");
      setBulkCuatQuantities({});
      setBulkExcludedCuats(new Set());
      setBulkPlan("nuevo-modelo");
    } finally {
      setIsBulkCreating(false);
    }
  };

  const handleStartEditGroup = (group: Group) => {
    setEditingGroupId(group.id);
    setEditingGroupPlan(group.plan === "plan-normal" ? "plan-normal" : "nuevo-modelo");
    setEditingGroupCareerCode(group.careerCode);
    setEditingGroupCuatrimestre(String(group.cuatrimestre));
    setEditingGroupNumber(group.groupNumber);
    setEditingGroupOriginal({
      plan: group.plan === "plan-normal" ? "plan-normal" : "nuevo-modelo",
      careerCode: group.careerCode,
      cuatrimestre: String(group.cuatrimestre),
      groupNumber: group.groupNumber,
    });
  };

  const clearEditingGroupState = () => {
    setEditingGroupId(null);
    setEditingGroupPlan("nuevo-modelo");
    setEditingGroupCareerCode("");
    setEditingGroupCuatrimestre("");
    setEditingGroupNumber(1);
    setEditingGroupOriginal(null);
  };

  const handleSaveGroupEdit = async () => {
    if (!editingGroupId || !editingGroupCareerCode.trim() || !editingGroupCuatrimestre) return;
    setIsLoading(true);
    try {
      const payload = {
        careerCode: editingGroupCareerCode.trim().toUpperCase(),
        plan: editingGroupPlan,
        cuatrimestre: Number(editingGroupCuatrimestre),
        groupNumber: Number(editingGroupNumber),
      };
      const res = await apiFetch(`/groups/${editingGroupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res?.data) setGroups((prev) => prev.map((g) => (g.id === editingGroupId ? res.data : g)));
      clearEditingGroupState();
      toast.success('Grupo actualizado');
    } catch (err: any) {
      toast.error(err?.message ?? 'No fue posible actualizar el grupo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveGroup = (id: number) => {
    const group = groups.find((item) => item.id === id);
    if (!group) return;

    setDeleteTarget({
      label: group.name,
      description: "Grupo",
      onConfirm: async () => {
        try {
          await apiFetch(`/groups/${id}`, { method: 'DELETE' });
          setGroups((prev) => prev.filter((g) => g.id !== id));
          toast.success('Grupo eliminado');
        } catch (err: any) {
          toast.error(err?.message ?? 'No fue posible eliminar el grupo');
        }
      },
    });
    setDeleteConfirmation("");
  };

  const handleToggleGroupActive = async (group: Group) => {
    const newActive = !(group.is_active ?? true);
    try {
      await apiFetch(`/groups/${group.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newActive }),
      });
      setGroups((prev) => prev.map((g) => g.id === group.id ? { ...g, is_active: newActive } : g));
      toast.success(newActive ? `Grupo ${group.name} activado` : `Grupo ${group.name} deshabilitado`);
    } catch (err: any) {
      toast.error(err?.message ?? 'No fue posible actualizar el grupo');
    }
  };

  const loadSupervisors = useCallback(async () => {
    setSupervisorsLoading(true);
    try {
      const res = await apiFetch('/supervisor-permissions') as any;
      const data: SupervisorPermission[] = res?.data ?? [];
      setSupervisors(data);
      const drafts: Record<number, string[]> = {};
      data.forEach((s) => { drafts[s.user_id] = [...s.sections]; });
      setSupervisorDrafts(drafts);
    } catch {
      toast.error("No fue posible cargar los supervisores");
    } finally {
      setSupervisorsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "supervisores") void loadSupervisors();
  }, [activeTab, loadSupervisors]);

  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent<string>).detail as ConfigTab;
      if (tab) { setActiveTab(tab); setMobileSectionOpen(true); }
    };
    window.addEventListener("tour-sub-nav", handler);
    return () => window.removeEventListener("tour-sub-nav", handler);
  }, []);

  const handleSectionChange = (userId: number, sectionId: string, checked: boolean) => {
    setSupervisorDrafts((prev) => {
      const current = prev[userId] ?? [];
      return {
        ...prev,
        [userId]: checked
          ? [...current, sectionId]
          : current.filter((s) => s !== sectionId),
      };
    });
  };

  const handleSaveSupervisorSections = async (userId: number) => {
    setSavingSupId(userId);
    try {
      await apiFetch(`/supervisor-permissions/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: supervisorDrafts[userId] ?? [] }),
      });
      toast.success("Permisos actualizados correctamente");
      setSupervisors((prev) =>
        prev.map((s) => s.user_id === userId ? { ...s, sections: supervisorDrafts[userId] ?? [] } : s)
      );
    } catch {
      toast.error("No fue posible guardar los permisos");
    } finally {
      setSavingSupId(null);
    }
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Solo se permiten imágenes PNG, JPG o WEBP");
      event.target.value = "";
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      toast.error("La imagen no debe superar 4 MB");
      event.target.value = "";
      return;
    }

    setSelectedAvatarFile(file);
    
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : undefined;
      setProfileAvatar(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!user) {
      toast.error("No se pudo cargar el usuario actual");
      return;
    }

    const firstNames = profileFirstNames.trim();
    const lastNames = profileLastNames.trim();
    const normalizedPhone = profilePhone.replace(/\D/g, "").slice(0, 10);

    if (!firstNames || !lastNames) {
      toast.error("Debes escribir nombres y apellidos");
      return;
    }

    if (normalizedPhone.length > 0 && normalizedPhone.length !== 10) {
      toast.error("El teléfono debe contener exactamente 10 números");
      return;
    }

    const fullName = `${firstNames} ${lastNames}`.trim();
    const phoneValue = normalizedPhone.length === 10 ? normalizedPhone : null;

    setIsSavingProfile(true);

    try {
      if (selectedAvatarFile) {
        const formData = new FormData();
        formData.append("full_name", fullName);
        formData.append("first_names", firstNames);
        formData.append("last_names", lastNames);
        if (phoneValue) formData.append("phone", phoneValue);
        formData.append("avatar", selectedAvatarFile);

        // PHP solo parsea $_FILES en POST, nunca en PATCH/PUT.
        // El backend acepta POST y PATCH en /auth/profile.
        await apiFetch("/auth/profile", {
          method: "POST",
          body: formData,
        });
      } else {
        await apiFetch("/auth/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: fullName,
            first_names: firstNames,
            last_names: lastNames,
            phone: phoneValue,
          }),
        });
      }

      // Guardar preview del nuevo avatar ANTES de limpiar el archivo
      if (selectedAvatarFile && profileAvatar) {
        setSavedAvatarPreview(profileAvatar);
      }

      clearAvatarCache();
      setAvatarCacheBust((prev) => prev + 1);

      const refreshedUser = await refreshUser();

      if (refreshedUser) {
        // Si se subió un archivo, añadir bust timestamp al avatar URL para que
        // useResolvedAvatarUrl en el Sidebar (y cualquier otro componente) vea
        // una URL diferente y re-fetche el nuevo avatar automáticamente.
        let avatarForContext = refreshedUser.avatar;
        if (selectedAvatarFile && avatarForContext) {
          try {
            const parsed = new URL(avatarForContext);
            avatarForContext = `${parsed.origin}${parsed.pathname}?bust=${Date.now()}`;
          } catch {
            avatarForContext = `${avatarForContext}?bust=${Date.now()}`;
          }
        }

        updateProfile({
          name: fullName,
          firstNames,
          lastNames,
          phone: phoneValue ?? undefined,
          avatar: avatarForContext,
        });

        setProfileAvatar(avatarForContext);
      }

      setSelectedAvatarFile(null);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
      window.dispatchEvent(new CustomEvent('ut-avatar-updated', { 
        detail: { userId: user.id, avatarUrl: refreshedUser?.avatar } 
      }));

      toast.success("Configuración de cuenta actualizada");
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast.error(error instanceof Error ? error.message : "No fue posible guardar la configuración");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Completa todos los campos de contraseña");
      return;
    }

    const strength = getPasswordStrength(newPassword);
    if (strength.score < 4) {
      toast.error("La contraseña es demasiado débil. Usa mayúsculas, minúsculas, números y caracteres especiales");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("La confirmación no coincide");
      return;
    }

    setIsSavingPassword(true);

    try {
      await apiFetch("/auth/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: currentPassword,
          password: newPassword,
          password_confirmation: confirmPassword,
        }),
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setIsPasswordOpen(false);
      toast.success("Contraseña actualizada correctamente");
    } catch (error: any) {
      toast.error(error instanceof Error ? error.message : "No fue posible actualizar la contraseña");
    } finally {
      setIsSavingPassword(false);
    }
  };

  const shellClass = "text-foreground";
  const sidebarClass = "border-border/70 bg-card shadow-sm dark:border-emerald-900/30 dark:bg-slate-950/60 dark:backdrop-blur-md";
  const sidebarCardClass = "border-b border-border bg-muted/40";
  const sectionCardClass = "overflow-hidden border-border/70 bg-card shadow-sm dark:border-emerald-900/30 dark:bg-slate-950/60 dark:backdrop-blur-md";
  const sectionHeaderClass = "bg-muted/40 border-b border-border";
  const softPanelClass = "rounded-[18px] border border-border bg-muted/30 p-4";
  const softSubpanelClass = "rounded-[16px] border border-border bg-card";

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const formSections = useMemo(
    () => [
      {
        section: "docentes" as const,
        title: "Formularios Docentes",
        description: "Planeación y documentos académicos del docente.",
        forms: FORM_DEFINITIONS.filter((form) => form.section === "docentes"),
      },
      {
        section: "tutorias" as const,
        title: "Formularios Tutorías",
        description: "Carga académica, bajas, concentrados, actas y ficha técnica.",
        forms: FORM_DEFINITIONS.filter((form) => form.section === "tutorias"),
      },
      {
        section: "estadias" as const,
        title: "Formularios Estadías",
        description: "Cartas y acta final del proceso de estadías.",
        forms: FORM_DEFINITIONS.filter((form) => form.section === "estadias"),
      },
    ],
    []
  );

  return (
    <div className={`flex h-[calc(100vh-64px)] flex-col gap-4 sm:gap-6 overflow-hidden ${shellClass}`}>
      {/* Header */}
      <div className="relative shrink-0 overflow-hidden rounded-[28px] border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-5 shadow-[0_24px_90px_-35px_rgba(16,185,129,0.35)] dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_42%)]" />
        <div className="relative">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Configuración del Sistema</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">Ajustes globales y parámetros del sistema.</p>
        </div>
      </div>

      {/* Layout principal - Cambia a columna en móvil */}
      <div className="grid min-h-0 flex-1 gap-4 sm:gap-6 lg:grid-cols-[280px_minmax(0,1fr)] items-start overflow-hidden">
        {/* Sidebar - Mejorado para móvil */}
        <div className={`flex flex-col gap-4 self-start ${mobileSectionOpen ? "hidden lg:flex" : "flex"}`}>
        <Card className={`${sidebarClass} rounded-[22px] overflow-hidden`}>
          <CardHeader className={`${sidebarCardClass} p-3 sm:p-6`}>
            <CardTitle className="text-base sm:text-lg">Secciones</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Navega por la configuración</CardDescription>
          </CardHeader>
          <CardContent data-tour="admin-config-nav" className="space-y-1 sm:space-y-2 p-2 sm:p-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  disabled={Boolean(editingGroupId && item.value !== activeTab)}
                  onClick={() => {
                    setActiveTab(item.value);
                    setMobileSectionOpen(true);
                  }}
                  className={`flex w-full items-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-3 text-left transition-all ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70 dark:bg-emerald-400/15 dark:text-emerald-300 dark:ring-emerald-400/30"
                      : "text-slate-600 hover:bg-muted hover:text-foreground dark:text-slate-300"
                  }`}
                >
                  <span className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl ${isActive ? "bg-emerald-100 dark:bg-emerald-400/15" : "bg-muted"}`}>
                    <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${isActive ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"}`} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs sm:text-sm font-semibold truncate">{item.label}</span>
                    <span className="hidden sm:block text-xs text-muted-foreground">{item.description}</span>
                  </span>
                </button>
              );
            })}
          </CardContent>
        </Card>

        </div>

        {/* Contenido principal */}
        <div className={`h-full min-h-0 flex flex-col overflow-hidden ${mobileSectionOpen ? "flex" : "hidden lg:flex"}`}>
          <button
            type="button"
            onClick={() => setMobileSectionOpen(false)}
            className="mb-2 inline-flex items-center gap-1.5 self-start rounded-lg bg-white/90 px-2.5 py-1.5 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200 transition hover:bg-white dark:bg-slate-900/85 dark:text-emerald-300 dark:ring-slate-700 lg:hidden"
          >
            <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">Volver a secciones</span>
          </button>
          {activeTab === "cuenta" && (
            <Card data-tour="admin-config-cuenta" className={`${sectionCardClass} flex flex-col min-h-0 flex-1`}>
              <CardHeader className={`${sectionHeaderClass} shrink-0 p-4 sm:p-6`}>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  Configuración de tu Cuenta
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Gestiona tu foto, datos básicos y preferencias visuales.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 overflow-y-auto space-y-4 sm:space-y-6 p-4 sm:p-6 scrollbar-thin scrollbar-thumb-emerald-500/20 scrollbar-track-transparent">
                {/* Avatar - Mejorado para móvil */}
                <div className="flex flex-col sm:flex-row gap-4 rounded-2xl border border-slate-200/70 bg-slate-50 p-4 sm:p-4 sm:items-center dark:border-slate-800 dark:bg-slate-900/60">
                  <Avatar className="h-16 w-16 sm:h-20 sm:w-20 ring-2 ring-emerald-200/70 dark:ring-emerald-900/40">
                    <AvatarImage
                      src={selectedAvatarFile ? profileAvatar : (savedAvatarPreview ?? resolvedCurrentAvatar)}
                      alt={profileFirstNames || "Usuario"}
                      className="cursor-pointer"
                      onClick={() => setIsAvatarOpen(true)}
                    />
                    <AvatarFallback
                      className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-base sm:text-xl cursor-pointer"
                      onClick={() => setIsAvatarOpen(true)}
                    >
                      {(profileFirstNames || profileLastNames || user?.name || "U").split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="avatar" className="text-sm">Foto de perfil</Label>
                    <Input 
                      ref={fileInputRef}
                      id="avatar" 
                      type="file" 
                      accept="image/png,image/jpeg,image/webp" 
                      onChange={handleAvatarChange}
                      className="text-sm" 
                    />
                    <p className="text-xs text-muted-foreground">Formatos: PNG/JPG/WEBP. Tamaño máximo: 4MB.</p>
                  </div>
                </div>

                <Dialog open={isAvatarOpen} onOpenChange={setIsAvatarOpen}>
                  <DialogContent className="max-w-[95vw] sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Foto de perfil</DialogTitle>
                      <DialogDescription>Vista previa de tu imagen de perfil</DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 flex justify-center">
                      {profileAvatar ? (
                        <img src={profileAvatar} alt={profileFirstNames || "Usuario"} className="max-h-[50vh] sm:max-h-[70vh] max-w-full rounded-lg object-contain" />
                      ) : (
                        <div className="h-32 w-32 sm:h-40 sm:w-40 rounded-lg bg-emerald-100 flex items-center justify-center text-2xl">
                          {(profileFirstNames || profileLastNames || user?.name || "U").split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog
                  open={isPasswordOpen}
                  onOpenChange={(open) => {
                    setIsPasswordOpen(open);
                    if (!open) {
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                      setShowCurrentPassword(false);
                      setShowNewPassword(false);
                      setShowConfirmPassword(false);
                    }
                  }}
                >
                  <DialogContent className="max-w-[95vw] sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Cambiar contraseña</DialogTitle>
                      <DialogDescription>Actualiza tu contraseña de acceso al sistema.</DialogDescription>
                    </DialogHeader>
                    <div className="mt-2 space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Contraseña actual</Label>
                        <div className="relative">
                          <Input
                            type={showCurrentPassword ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Ingresa tu contraseña actual"
                            autoComplete="new-password"
                            className="pr-10 text-sm"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                            onClick={() => setShowCurrentPassword((v) => !v)}
                            aria-label={showCurrentPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                          >
                            {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Nueva contraseña</Label>
                        <div className="relative">
                          <Input
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Ingresa la nueva contraseña"
                            className="pr-10 text-sm"
                            autoComplete="new-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                            onClick={() => setShowNewPassword((v) => !v)}
                            aria-label={showNewPassword ? "Ocultar nueva contraseña" : "Mostrar nueva contraseña"}
                          >
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        {newPassword.length > 0 && (() => {
                          const strength = getPasswordStrength(newPassword);
                          return (
                            <div className="space-y-1.5">
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((step) => (
                                  <div
                                    key={step}
                                    className={`h-1.5 flex-1 rounded-full transition-colors ${step <= strength.score ? strength.color : "bg-muted"}`}
                                  />
                                ))}
                              </div>
                              <p className={`text-xs font-medium ${strength.score < 4 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
                                {strength.label}
                                {strength.score < 4 && " — usa mayúsculas, minúsculas, números y caracteres especiales"}
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Confirmar contraseña</Label>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repite la nueva contraseña"
                            className="pr-10 text-sm"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                            onClick={() => setShowConfirmPassword((v) => !v)}
                            aria-label={showConfirmPassword ? "Ocultar confirmación" : "Mostrar confirmación"}
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <DialogFooter className="mt-2 flex-col sm:flex-row gap-2">
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => setIsPasswordOpen(false)}
                        disabled={isSavingPassword}
                        className="w-full sm:w-auto text-sm"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        variant="success"
                        onClick={handleSavePassword}
                        disabled={isSavingPassword}
                        className="w-full sm:w-auto text-sm"
                      >
                        {isSavingPassword ? "Guardando..." : "Actualizar contraseña"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Campos de perfil - Mejorado para móvil */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cfg-nombres" className="text-sm">Nombres</Label>
                    <Input id="cfg-nombres" value={profileFirstNames} onChange={(e) => setProfileFirstNames(e.target.value)} placeholder="Ej. María Fernanda" className="text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cfg-apellidos" className="text-sm">Apellidos</Label>
                    <Input id="cfg-apellidos" value={profileLastNames} onChange={(e) => setProfileLastNames(e.target.value)} placeholder="Ej. González López" className="text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cfg-correo" className="text-sm">Correo electrónico</Label>
                    <Input id="cfg-correo" value={user?.email ?? ""} disabled className="text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cfg-telefono" className="text-sm">Teléfono</Label>
                    <Input
                      id="cfg-telefono"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="Ej. 6531234567"
                      className="text-sm"
                    />
                  </div>
                </div>

                {/* Seguridad */}
                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold">Seguridad</p>
                      <p className="text-xs text-muted-foreground">Gestiona el acceso a tu cuenta.</p>
                    </div>
                    <Button
                      variant="outline"
                      type="button"
                      className="w-full justify-start text-sm"
                      onClick={() => setIsPasswordOpen(true)}
                    >
                      <Key className="h-4 w-4 mr-2" />
                      Cambiar contraseña
                    </Button>
                  </div>
                </div>

                {/* Tema - Mejorado para móvil */}
                <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="space-y-3">
                    <Label className="block text-sm">Tema de la aplicación</Label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={toggleTheme}
                      className="w-full sm:w-fit gap-2 border-slate-200 bg-white text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 text-sm"
                    >
                      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                      {theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button variant="success" onClick={handleSaveProfile} disabled={isSavingProfile} className="w-full sm:w-auto text-sm">
                    {isSavingProfile ? "Guardando..." : "Guardar cambios"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "formularios" && (
            <Card className={`${sectionCardClass} flex flex-col min-h-0 flex-1`}>
              <CardHeader className={`${sectionHeaderClass} shrink-0 p-4 sm:p-6`}>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  Formularios
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Configura el acceso y vencimiento de cada formulario del sistema.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 overflow-y-auto space-y-4 sm:space-y-6 p-4 sm:p-6 scrollbar-thin scrollbar-thumb-emerald-500/20 scrollbar-track-transparent">
                <div data-tour="admin-config-formularios" className={softPanelClass}>
                  <div className="mb-3">
                    <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100">Control por formulario</h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Define vencimiento y roles permitidos para cada apartado del sistema.</p>
                  </div>

                  {/* SCROLL SOLO EN LA LISTA DE FORMULARIOS DE CADA SECCIÓN - Títulos fijos */}
                  <div className="space-y-2 sm:space-y-3">
                    {formSections.map((section) => {
                      const isOpen = openFormSection === section.section;
                      return (
                        <div key={section.section} className={softSubpanelClass}>
                          <button
                            type="button"
                            onClick={() => setOpenFormSection(isOpen ? null : section.section)}
                            className="flex w-full items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 text-left"
                            aria-expanded={isOpen}
                          >
                            <div className="min-w-0">
                              <h4 className="truncate text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">{section.title}</h4>
                              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">{section.description}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                {section.forms.length}
                              </span>
                              {isOpen ? (
                                <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                              ) : (
                                <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                              )}
                            </div>
                          </button>

                          {isOpen && (
                            <div className="border-t border-emerald-200/35 p-2 sm:p-3 dark:border-emerald-900/20">
                              {/* SCROLL SOLO EN LA LISTA DE FORMULARIOS - Título de sección queda fijo */}
                              <div className="space-y-2 pr-1 sm:pr-2">
                                {section.forms.map((form) => {
                                  const savedConfig = formConfig.formAccess[form.id];
                                  const draftConfig = formDrafts[form.id] ?? savedConfig;
                                  const allowedRoles = draftConfig.roles.map((role) => FORM_ROLE_LABELS[role]).join(" y ");
                                  const isTutoriasForm = form.section === "tutorias";
                                  const dueAtDate = draftConfig.dueAt ? new Date(draftConfig.dueAt) : null;
                                  const dueAtLabel = dueAtDate && isValid(dueAtDate)
                                    ? dueAtDate.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })
                                    : "Sin vencimiento";

                                  const isOpenItem = Boolean(openFormItems[form.id]);
                                  const isDraftChanged = JSON.stringify(draftConfig) !== JSON.stringify(savedConfig);
                                  return (
                                    <div key={form.id} className="rounded-[14px] border border-border bg-card">
                                      <button
                                        type="button"
                                        onClick={() => toggleFormItem(form.id)}
                                        className="w-full flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 text-left"
                                        aria-expanded={isOpenItem}
                                      >
                                        <div className="min-w-0">
                                          <p className="truncate text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100">{form.title}</p>
                                          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">{form.description}</p>
                                        </div>

                                        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
                                          <span className="hidden sm:inline rounded-full bg-white px-2 py-1 text-[10px] sm:text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-300">{allowedRoles}</span>
                                          <span className="hidden sm:inline rounded-full bg-white px-2 py-1 text-[10px] sm:text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-300">{dueAtLabel}</span>
                                          {isOpenItem ? (
                                            <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                                          ) : (
                                            <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                                          )}
                                        </div>
                                      </button>

                                      {isOpenItem && (
                                        <div className="border-t border-emerald-200/35 p-2 sm:p-3 dark:border-emerald-900/20">
                                          <div className="grid gap-3 sm:grid-cols-2">
                                            <div className="space-y-2 sm:col-span-2">
                                              {(() => {
                                                const formUIMode = getFormUIMode(form.id);
                                                const isCerrado = formUIMode === "cerrado";
                                                const isFechaLimite = formUIMode === "fechaLimite";
                                                const _dueDate = draftConfig.dueAt ? new Date(draftConfig.dueAt) : null;
                                                const _dueDateValid = _dueDate !== null && isValid(_dueDate);
                                                const _isPastDeadline = isFechaLimite && _dueDateValid && _dueDate! <= new Date();
                                                return (
                                                  <>
                                                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                                                      <Label className="text-sm shrink-0">Fecha y hora de vencimiento</Label>
                                                      <div className="flex flex-wrap items-center gap-4 ml-auto">
                                                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                                                          <Checkbox
                                                            checked={formUIMode === "sinLimite"}
                                                            onCheckedChange={(val) => {
                                                              if (val) {
                                                                setFormUIModes((prev) => ({ ...prev, [form.id]: "sinLimite" }));
                                                                setFormDraftValue(form.id, (current) => ({ ...current, dueAt: null }));
                                                              }
                                                            }}
                                                          />
                                                          <span>Sin límite</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                                                          <Checkbox
                                                            checked={isFechaLimite}
                                                            onCheckedChange={(val) => {
                                                              if (val) {
                                                                setFormUIModes((prev) => ({ ...prev, [form.id]: "fechaLimite" }));
                                                                setFormDraftValue(form.id, (current) => {
                                                                  const existingDate = current.dueAt && current.dueAt.slice(11, 16) ? new Date(current.dueAt) : null;
                                                                  const keepExisting = existingDate && isValid(existingDate) && existingDate > new Date();
                                                                  return { ...current, dueAt: keepExisting ? current.dueAt : "" };
                                                                });
                                                              }
                                                            }}
                                                          />
                                                          <span>Con fecha límite</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                                                          <Checkbox
                                                            checked={isCerrado}
                                                            onCheckedChange={(val) => {
                                                              if (val) {
                                                                const d = new Date(Date.now() - 60_000);
                                                                const pad = (n: number) => String(n).padStart(2, "0");
                                                                setFormUIModes((prev) => ({ ...prev, [form.id]: "cerrado" }));
                                                                setFormDraftValue(form.id, (current) => ({ ...current, dueAt: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}` }));
                                                              } else {
                                                                setFormUIModes((prev) => ({ ...prev, [form.id]: "sinLimite" }));
                                                                setFormDraftValue(form.id, (current) => ({ ...current, dueAt: null }));
                                                              }
                                                            }}
                                                            disabled={Boolean(savingFormIds[form.id])}
                                                          />
                                                          <span>Cerrar formulario</span>
                                                        </label>
                                                      </div>
                                                    </div>
                                                    {isFechaLimite && (
                                                      <div className="flex gap-2">
                                                        <DeadlineDatePicker
                                                          value={draftConfig.dueAt ? draftConfig.dueAt.slice(0, 10) : ""}
                                                          disabled={false}
                                                          onChange={(date) => {
                                                            const timePart = draftConfig.dueAt?.slice(11, 16) || "23:59";
                                                            handleDeadlineChange(form.id, date ? `${date}T${timePart}` : "");
                                                          }}
                                                        />
                                                        <Input
                                                          type="time"
                                                          value={draftConfig.dueAt ? draftConfig.dueAt.slice(11, 16) : ""}
                                                          onChange={(event) => {
                                                            const datePart = draftConfig.dueAt?.slice(0, 10) ?? "";
                                                            if (!event.target.value || !datePart) return;
                                                            handleDeadlineChange(form.id, `${datePart}T${event.target.value}`);
                                                          }}
                                                          className="text-sm dark:[&::-webkit-calendar-picker-indicator]:invert w-28"
                                                        />
                                                      </div>
                                                    )}
                                                    {_isPastDeadline && (
                                                      <p className="text-xs text-amber-600 dark:text-amber-400">
                                                        ⚠ La fecha y hora seleccionadas ya han pasado. Cámbiala antes de guardar.
                                                      </p>
                                                    )}
                                                    {isCerrado && (
                                                      <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
                                                        <span className="shrink-0 font-bold">⊘</span>
                                                        <span>Formulario cerrado manualmente</span>
                                                      </div>
                                                    )}
                                                    {isFechaLimite && _dueDateValid && _dueDate! > new Date() && (
                                                      <p className="text-xs text-muted-foreground">
                                                        Fecha límite: {_dueDate!.toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                                      </p>
                                                    )}
                                                  </>
                                                );
                                              })()}
                                            </div>

                                            <div className="space-y-2 sm:col-span-2">
                                              <Label className="text-sm">Roles permitidos</Label>
                                              {isTutoriasForm ? (
                                                <div className="flex items-center gap-2">
                                                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Tutor</span>
                                                  <span className="text-xs text-muted-foreground">Este formulario queda asignado sólo a tutores.</span>
                                                </div>
                                              ) : (
                                                <div className="flex flex-wrap items-center gap-4">
                                                  <label className="flex items-center gap-2">
                                                    <Checkbox
                                                      checked={draftConfig.roles.includes("docente")}
                                                      onCheckedChange={() => toggleFormRole(form.id, "docente")}
                                                    />
                                                    <span className="text-sm">Docente</span>
                                                  </label>
                                                  <label className="flex items-center gap-2">
                                                    <Checkbox
                                                      checked={draftConfig.roles.includes("tutor")}
                                                      onCheckedChange={() => toggleFormRole(form.id, "tutor")}
                                                    />
                                                    <span className="text-sm">Tutor</span>
                                                  </label>
                                                </div>
                                              )}
                                              {!isTutoriasForm && <p className="text-xs text-muted-foreground">Selecciona si el formulario aplica para Docente, Tutor o ambos.</p>}
                                            </div>
                                          </div>
                                          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                                            <div className="flex flex-col gap-2 sm:flex-row">
                                              <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => handleResetForm(form.id)}
                                                disabled={!isDraftChanged || Boolean(savingFormIds[form.id])}
                                                className="w-full sm:w-auto text-sm"
                                              >
                                                Cancelar
                                              </Button>
                                              <Button
                                                type="button"
                                                onClick={() => handleSaveForm(form.id)}
                                                disabled={!isDraftChanged || Boolean(savingFormIds[form.id]) || (draftConfig.dueAt !== null && !draftConfig.dueAt.slice(11, 16)) || (formUIModes[form.id] === "fechaLimite" && Boolean(draftConfig.dueAt) && isValid(new Date(draftConfig.dueAt!)) && new Date(draftConfig.dueAt!) <= new Date())}
                                                className="w-full sm:w-auto text-sm"
                                              >
                                                {savingFormIds[form.id] ? 'Guardando...' : 'Guardar cambios'}
                                              </Button>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "grupos" && (
            <Card className={`${sectionCardClass} flex flex-col min-h-0 flex-1`}>
              <CardHeader className={`${sectionHeaderClass} shrink-0 p-4 sm:p-6`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      Grupos
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Crear y administrar grupos que aparecerán en los formularios</CardDescription>
                  </div>
                  <div data-tour="admin-config-grupos-btns" className="flex flex-col sm:flex-row gap-2 shrink-0">
                    <Button onClick={() => setIsBulkCreateOpen(true)} variant="outline" className="gap-2 text-sm">
                      <Layers className="h-4 w-4" aria-hidden="true" />
                      Creación rápida
                    </Button>
                    <Button onClick={() => setIsCreateGroupOpen(true)} variant="success" className="gap-2 text-sm">
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Crear grupo
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 overflow-y-auto space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0 sm:pt-0 scrollbar-thin scrollbar-thumb-emerald-500/20 scrollbar-track-transparent">
                {/* Lista de grupos */}
                <div className={softPanelClass}>
                  {/* Controles: búsqueda y selector de plan */}
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm sm:text-base">Grupos creados</h3>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        {selectedPlanGroups.length} {selectedPlanGroups.length === 1 ? "grupo" : "grupos"} en {selectedPlanCareerGroups.length} {selectedPlanCareerGroups.length === 1 ? "carrera" : "carreras"} · {groupViewPlan === "nuevo-modelo" ? "Plan Nuevo Modelo" : "Plan Normal"}
                      </p>
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto md:items-center">
                      <div className="relative w-full sm:w-56">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <Input
                          value={groupSearch}
                          onChange={(event) => setGroupSearch(event.target.value)}
                          placeholder="Buscar grupo"
                          className="pl-8 text-sm h-9"
                        />
                      </div>
                      <Select value={groupViewPlan} onValueChange={(value) => setGroupViewPlan(value as "nuevo-modelo" | "plan-normal")}>
                        <SelectTrigger className="w-full sm:w-52 text-sm h-9">
                          <SelectValue placeholder="Ver plan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nuevo-modelo">Plan Nuevo Modelo</SelectItem>
                          <SelectItem value="plan-normal">Plan Normal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Lista scrollable */}
                  <div className="mt-4 space-y-3 max-h-[420px] sm:max-h-[520px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-emerald-500/20 scrollbar-track-transparent hover:scrollbar-thumb-emerald-500/40">
                    {selectedPlanCareerGroups.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/20 py-10 text-center">
                        <Users className="h-8 w-8 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">
                          {groups.length === 0
                            ? "Aún no hay grupos creados."
                            : groupSearch.trim()
                            ? "No hay grupos que coincidan con la búsqueda."
                            : "No hay grupos en este plan todavía."}
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Banner del plan */}
                        <div className="flex items-center justify-between gap-2 rounded-2xl border border-emerald-200/50 bg-gradient-to-r from-emerald-50 via-emerald-50/60 to-transparent px-3 py-2.5 dark:border-emerald-900/30 dark:from-emerald-950/50 dark:via-emerald-950/20 dark:to-transparent">
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-900/60">
                              <Grid2x2 className="h-3 w-3 text-emerald-700 dark:text-emerald-400" />
                            </div>
                            <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                              {groupViewPlan === "nuevo-modelo" ? "Plan Nuevo Modelo" : "Plan Normal"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-[10px] font-medium text-slate-500 ring-1 ring-emerald-200/70 dark:bg-slate-900/60 dark:text-slate-400 dark:ring-emerald-800/40">
                              {selectedPlanCareerGroups.length} {selectedPlanCareerGroups.length === 1 ? "carrera" : "carreras"}
                            </span>
                            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400">
                              {selectedPlanGroups.length} {selectedPlanGroups.length === 1 ? "grupo" : "grupos"}
                            </span>
                          </div>
                        </div>

                        {/* Acordeones por carrera */}
                        {selectedPlanCareerGroups.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                            No hay grupos creados para este plan.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {selectedPlanCareerGroups.map(({ career, groups: careerGroups }) => (
                              <div key={career.codigo} className="overflow-hidden rounded-[14px] border border-border/60 bg-card shadow-sm transition-shadow dark:border-slate-800/60 dark:bg-slate-900/40">
                                {/* Header de carrera */}
                                <button
                                  type="button"
                                  onClick={() => setOpenCareer(openCareer === career.codigo ? null : career.codigo)}
                                  className={`w-full flex items-center justify-between gap-3 px-3 sm:px-4 py-2.5 sm:py-3 text-left transition-colors hover:bg-muted/40 dark:hover:bg-slate-800/30 ${openCareer === career.codigo ? "bg-muted/30 dark:bg-slate-800/20" : ""}`}
                                  aria-expanded={openCareer === career.codigo}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className={`shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${career.tipo === "TSU" ? "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400" : "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400"}`}>
                                      {career.tipo}
                                    </span>
                                    <p className="truncate text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">{career.nombre}</p>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                                      {careerGroups.length}
                                    </span>
                                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${openCareer === career.codigo ? "rotate-180" : ""}`} />
                                  </div>
                                </button>

                                {/* Contenido expandido: cuatrimestres */}
                                {openCareer === career.codigo && (() => {
                                  const byCuat = careerGroups.reduce<Record<number, typeof careerGroups>>(
                                    (acc, g) => { (acc[g.cuatrimestre] ??= []).push(g); return acc; },
                                    {}
                                  );
                                  const cuatNums = Object.keys(byCuat).map(Number).sort((a, b) => a - b);
                                  return (
                                    <div className="border-t border-border/50 dark:border-slate-800/50">
                                      {cuatNums.map((cuat, idx) => {
                                        const key = `${career.codigo}-${cuat}`;
                                        const isOpen = openCuatrimestres.has(key);
                                        return (
                                          <div key={key} className={idx > 0 ? "border-t border-border/30 dark:border-slate-800/30" : ""}>
                                            {/* Header de cuatrimestre */}
                                            <button
                                              type="button"
                                              onClick={() => toggleCuatrimestre(key)}
                                              className="flex w-full items-center justify-between gap-2 bg-muted/30 px-4 py-2 text-left transition-colors hover:bg-muted/60 dark:bg-slate-800/20 dark:hover:bg-slate-800/40"
                                            >
                                              <div className="flex items-center gap-2">
                                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{cuatrimestresLabel(cuat)}</span>
                                              </div>
                                              <div className="flex items-center gap-1.5">
                                                {(() => {
                                                  const total = byCuat[cuat].length;
                                                  const active = byCuat[cuat].filter((g) => g.is_active ?? true).length;
                                                  const hasInactive = active < total;
                                                  return hasInactive ? (
                                                    <>
                                                      <span className="rounded-full bg-emerald-100/80 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                                                        {active} activos
                                                      </span>
                                                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                                                        {total} total
                                                      </span>
                                                    </>
                                                  ) : (
                                                    <span className="rounded-full bg-emerald-100/80 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                                                      {total} {total !== 1 ? "grupos" : "grupo"}
                                                    </span>
                                                  );
                                                })()}
                                                <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`} />
                                              </div>
                                            </button>

                                            {/* Chips de grupos */}
                                            {isOpen && (
                                              <div className="bg-background/60 p-2.5 dark:bg-slate-950/30">
                                                <div className={`grid gap-1.5 ${byCuat[cuat].length > 1 ? "grid-cols-2" : ""}`}>
                                                  {byCuat[cuat].map((g) => {
                                                    const isActive = g.is_active ?? true;
                                                    return (
                                                    <div
                                                      key={g.id}
                                                      className={`group flex items-center justify-between gap-2 rounded-xl border px-3 py-2 transition-all hover:shadow-sm ${isActive ? "border-border/50 bg-background/80 hover:border-emerald-200/70 dark:border-slate-800/50 dark:bg-slate-900/50 dark:hover:border-emerald-900/50" : "border-border/30 bg-muted/30 opacity-60 dark:border-slate-800/30 dark:bg-slate-900/20"}`}
                                                    >
                                                      <div className="flex min-w-0 items-center gap-2.5">
                                                        <div className={`h-2 w-2 shrink-0 rounded-full shadow-sm ${isActive ? "bg-emerald-500 shadow-emerald-500/40 dark:bg-emerald-400" : "bg-slate-400 dark:bg-slate-600"}`} />
                                                        <span className={`truncate font-mono text-sm font-bold tracking-wide ${isActive ? "text-slate-800 dark:text-slate-100" : "text-slate-400 line-through dark:text-slate-500"}`}>{g.name}</span>
                                                        {!isActive && (
                                                          <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                                                            Inactivo
                                                          </span>
                                                        )}
                                                      </div>
                                                      <div className="flex shrink-0 items-center gap-0.5 opacity-50 transition-opacity group-hover:opacity-100">
                                                        <Button
                                                          variant="ghost"
                                                          size="icon"
                                                          onClick={() => void handleToggleGroupActive(g)}
                                                          disabled={Boolean(editingGroupId)}
                                                          className={`h-7 w-7 rounded-lg ${isActive ? "text-amber-500 hover:bg-amber-50 hover:text-amber-600 dark:text-amber-400 dark:hover:bg-amber-950/40" : "text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600 dark:text-emerald-400 dark:hover:bg-emerald-950/40"}`}
                                                          aria-label={isActive ? `Deshabilitar grupo ${g.name}` : `Activar grupo ${g.name}`}
                                                          title={isActive ? "Deshabilitar grupo" : "Activar grupo"}
                                                        >
                                                          <Power className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                          variant="ghost"
                                                          size="icon"
                                                          onClick={() => handleStartEditGroup(g)}
                                                          disabled={Boolean(editingGroupId)}
                                                          className="h-7 w-7 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400"
                                                          aria-label={`Editar grupo ${g.name}`}
                                                          title="Editar grupo"
                                                        >
                                                          <PencilLine className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                          variant="ghost"
                                                          size="icon"
                                                          onClick={() => handleRemoveGroup(g.id)}
                                                          disabled={Boolean(editingGroupId)}
                                                          className="h-7 w-7 rounded-lg text-rose-400 hover:bg-rose-50 hover:text-rose-600 dark:text-rose-500 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                                                          aria-label={`Eliminar grupo ${g.name}`}
                                                          title="Eliminar grupo"
                                                        >
                                                          <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                      </div>
                                                    </div>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "supervisores" && (
            <div className="flex flex-col flex-1 min-h-0 space-y-4">
              <Card data-tour="admin-config-supervisores" className={`${sectionCardClass} flex flex-col min-h-0 flex-1`}>
                <CardHeader className={`${sectionHeaderClass} shrink-0 p-4 sm:p-6`}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        Permisos de Supervisores
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm mt-1">
                        Asigna las secciones a las que puede acceder cada supervisor. Solo las secciones habilitadas aparecerán en su menú.
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="icon" onClick={() => void loadSupervisors()} disabled={supervisorsLoading} className="shrink-0 h-8 w-8">
                      <RefreshCw className={`h-4 w-4 ${supervisorsLoading ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
                  <div className="relative mt-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Buscar por nombre o correo..."
                      value={supervisorSearch}
                      onChange={(e) => setSupervisorSearch(e.target.value)}
                      className="pl-9 text-sm"
                    />
                  </div>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 pt-3 sm:pt-4 scrollbar-thin scrollbar-thumb-emerald-500/20 scrollbar-track-transparent">
                  {supervisorsLoading ? (
                    <SupervisorRowSkeleton />
                  ) : supervisors.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
                      <Shield className="h-10 w-10 opacity-30" />
                      <p className="text-sm">No hay supervisores registrados.</p>
                      <p className="text-xs">Crea un usuario con rol de supervisor para asignarle permisos.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {supervisors
                        .filter((sup) => {
                          const q = supervisorSearch.toLowerCase().trim();
                          if (!q) return true;
                          return sup.user_name.toLowerCase().includes(q) || sup.email.toLowerCase().includes(q);
                        })
                        .map((sup) => {
                          const draft = supervisorDrafts[sup.user_id] ?? [];
                          const isSaving = savingSupId === sup.user_id;
                          const isExpanded = expandedSupervisors.has(sup.user_id);
                          const toggle = () => setExpandedSupervisors((prev) => {
                            const next = new Set(prev);
                            if (next.has(sup.user_id)) next.delete(sup.user_id);
                            else next.add(sup.user_id);
                            return next;
                          });
                          return (
                            <div key={sup.user_id} className="overflow-hidden rounded-xl border border-border/70 bg-background/80 dark:bg-slate-950/60">
                              <button
                                type="button"
                                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/60 dark:hover:bg-slate-900/70"
                                onClick={toggle}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <SupervisorAvatar avatarUrl={sup.avatar} name={sup.user_name} />
                                  <div className="min-w-0">
                                    <p className="font-medium text-sm truncate">{sup.user_name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{sup.email}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-xs text-muted-foreground">
                                    {draft.length === 0 ? "Sin acceso" : `${draft.length} sección${draft.length !== 1 ? "es" : ""}`}
                                  </span>
                                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                                </div>
                              </button>

                              {isExpanded && (
                                <div className="border-t border-border/60 px-4 pb-4 space-y-4">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3">
                                    {SUPERVISOR_SECTIONS.map((section) => {
                                      const isChecked = draft.includes(section.id);
                                      return (
                                        <div key={section.id} className="flex items-center gap-2">
                                          <Checkbox
                                            id={`sup-${sup.user_id}-${section.id}`}
                                            checked={isChecked}
                                            disabled={isSaving}
                                            onCheckedChange={(checked) => handleSectionChange(sup.user_id, section.id, Boolean(checked))}
                                          />
                                          <label
                                            htmlFor={`sup-${sup.user_id}-${section.id}`}
                                            className={`text-sm cursor-pointer select-none ${isChecked ? "font-medium" : "text-muted-foreground"}`}
                                          >
                                            {section.label}
                                          </label>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <div className="flex gap-2 justify-end">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-xs"
                                      onClick={() => setSupervisorDrafts((prev) => ({ ...prev, [sup.user_id]: [] }))}
                                      disabled={isSaving || draft.length === 0}
                                    >
                                      Quitar todo
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-xs"
                                      onClick={() => setSupervisorDrafts((prev) => ({ ...prev, [sup.user_id]: SUPERVISOR_SECTIONS.map((s) => s.id) }))}
                                      disabled={isSaving || draft.length === SUPERVISOR_SECTIONS.length}
                                    >
                                      Dar todo
                                    </Button>
                                    <Button
                                      variant="success"
                                      size="sm"
                                      className="text-xs"
                                      onClick={() => void handleSaveSupervisorSections(sup.user_id)}
                                      disabled={isSaving}
                                    >
                                      {isSaving ? "Guardando..." : "Guardar"}
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Diálogos - Mejorados para móvil */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteConfirmation("");
          }
        }}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Confirmar eliminación</DialogTitle>
            <DialogDescription className="text-sm">
              Escribe exactamente <strong>{deleteTarget?.label}</strong> para confirmar el borrado de {deleteTarget?.description?.toLowerCase()}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-sm">Texto de confirmación</Label>
            <Input
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              placeholder={deleteTarget?.label ?? "Escribe aquí"}
              className="text-sm"
            />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteConfirmation("");
              }}
              className="w-full sm:w-auto text-sm"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deleteTarget) return;
                if (deleteConfirmation.trim() !== deleteTarget.label.trim()) {
                  toast.error(`Debes escribir "${deleteTarget.label}" para confirmar`);
                  return;
                }
                setIsLoading(true);
                try {
                  deleteTarget.onConfirm();
                } finally {
                  setDeleteTarget(null);
                  setDeleteConfirmation("");
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
              className="w-full sm:w-auto text-sm"
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editingGroupId)}
        onOpenChange={(open) => {
          if (!open && !isEditingGroupDirty) {
            clearEditingGroupState();
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-[95vw] sm:max-w-2xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Editar grupo</DialogTitle>
            <DialogDescription className="text-sm">
              Modifica los datos del grupo seleccionado. Si haces cambios, debes guardarlos antes de salir.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-3 sm:p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Nombre final: <strong className="ml-1 text-slate-900 dark:text-slate-100">{editingCurrentGroupName}</strong>
              </div>
              {isEditingGroupDirty ? (
                <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">Hay cambios sin guardar. El modal permanecerá abierto hasta que guardes.</p>
              ) : (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">No hay cambios pendientes. Puedes cerrar este modal sin guardar.</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Select value={editingGroupPlan} onValueChange={(value) => setEditingGroupPlan(value as "nuevo-modelo" | "plan-normal")}>
                <SelectTrigger className="min-w-0 text-sm">
                  <SelectValue placeholder="Plan" className="min-w-0 flex-1 truncate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nuevo-modelo">Plan Nuevo Modelo</SelectItem>
                  <SelectItem value="plan-normal">Plan Normal</SelectItem>
                </SelectContent>
              </Select>
              <Select value={editingGroupCareerCode} onValueChange={setEditingGroupCareerCode} disabled={!editingGroupPlan}>
                <SelectTrigger className="min-w-0 text-sm">
                  <SelectValue placeholder="Carrera" className="min-w-0 flex-1 truncate" />
                </SelectTrigger>
                <SelectContent>
                  {editingCareerOptions.map((career) => (
                    <SelectItem key={career.codigo} value={career.codigo} className="whitespace-normal py-2 pr-3">
                      <span className="block max-w-[18rem] break-words leading-snug text-sm">{career.nombre}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={editingGroupCuatrimestre} onValueChange={setEditingGroupCuatrimestre} disabled={!editingSelectedCareer}>
                <SelectTrigger className="min-w-0 text-sm">
                  <SelectValue placeholder="Cuatrimestre" className="min-w-0 flex-1 truncate" />
                </SelectTrigger>
                <SelectContent>
                  {editingCuatrimestresDisponibles.map((number) => (
                    <SelectItem key={number} value={String(number)}>
                      {cuatrimestresLabel(number)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(editingGroupNumber)} onValueChange={(value) => setEditingGroupNumber(Number(value))}>
                <SelectTrigger className="min-w-0 text-sm">
                  <SelectValue placeholder="Número" className="min-w-0 flex-1 truncate" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 20 }, (_, index) => index + 1).map((number) => (
                    <SelectItem key={number} value={String(number)}>
                      {number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={clearEditingGroupState}
              disabled={isLoading}
              className="w-full sm:w-auto text-sm"
            >
              {isEditingGroupDirty ? "Descartar cambios" : "Cerrar"}
            </Button>
            <Button
              variant="success"
              onClick={handleSaveGroupEdit}
              disabled={isLoading || !editingGroupId || !editingGroupCareerCode.trim() || !editingGroupCuatrimestre}
              className="w-full sm:w-auto text-sm"
            >
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de creación rápida por lote */}
      <Dialog open={isBulkCreateOpen} onOpenChange={(open) => { if (!isBulkCreating) { setIsBulkCreateOpen(open); if (!open) { setBulkCareerCode(""); setBulkCuatQuantities({}); setBulkExcludedCuats(new Set()); setBulkPlan("nuevo-modelo"); } } }}>
        <DialogContent className="max-w-[95vw] sm:max-w-xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Creación rápida de grupos</DialogTitle>
            <DialogDescription className="text-sm">
              Selecciona la carrera y define cuántos grupos crear por cuatrimestre. Descarta los que ya tengas creados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select value={bulkPlan} onValueChange={(v: any) => { setBulkPlan(v); setBulkCareerCode(""); setBulkCuatQuantities({}); setBulkExcludedCuats(new Set()); }}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nuevo-modelo">Plan Nuevo Modelo</SelectItem>
                  <SelectItem value="plan-normal">Plan Normal</SelectItem>
                </SelectContent>
              </Select>
              <Popover open={bulkCareerPopoverOpen} onOpenChange={setBulkCareerPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={bulkCareerPopoverOpen}
                    className="w-full justify-between text-sm font-normal h-9 px-3"
                  >
                    <span className="truncate text-left">
                      {bulkCareerCode
                        ? (bulkCareerOptions.find((c) => c.codigo === bulkCareerCode)?.nombre ?? "Carrera")
                        : <span className="text-muted-foreground">Carrera</span>}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[--radix-popover-trigger-width] p-0"
                  align="start"
                  onWheel={(e) => e.stopPropagation()}
                >
                  <Command>
                    <CommandInput placeholder="Buscar carrera..." className="h-9 text-sm" />
                    <CommandList className="max-h-60">
                      <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">
                        No se encontró ninguna carrera.
                      </CommandEmpty>
                      <CommandGroup>
                        {bulkCareerOptions.map((career) => (
                          <CommandItem
                            key={career.codigo}
                            value={`${career.nombre} ${career.codigo}`}
                            onSelect={() => { setBulkCareerCode(career.codigo); setBulkCareerPopoverOpen(false); }}
                            className="py-2 text-sm"
                          >
                            <Check className={cn("mr-2 h-4 w-4 shrink-0", bulkCareerCode === career.codigo ? "opacity-100" : "opacity-0")} />
                            <span className="break-words leading-snug">{career.nombre}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {bulkSelectedCareer && bulkCuatrimestres.length > 0 && (
              <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Grupos por cuatrimestre
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    {bulkExcludedCuats.size > 0 && `${bulkExcludedCuats.size} descartado${bulkExcludedCuats.size !== 1 ? "s" : ""}`}
                  </p>
                </div>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                  {bulkCuatrimestres.map((cuat) => {
                    const excluded = bulkExcludedCuats.has(cuat);
                    return (
                      <div
                        key={cuat}
                        className={`flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors ${excluded ? "bg-muted/40 opacity-50" : "hover:bg-muted/30"}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-sm ${excluded ? "line-through text-muted-foreground" : "text-slate-700 dark:text-slate-300"}`}>
                            {cuatrimestresLabel(cuat)}
                          </span>
                          {(bulkExistingByCuat[cuat] ?? 0) > 0 && (
                            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                              {bulkExistingByCuat[cuat]} ya {bulkExistingByCuat[cuat] === 1 ? "existe" : "existen"}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!excluded ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setBulkCuatQuantities((prev) => ({ ...prev, [cuat]: Math.max(1, (prev[cuat] ?? 4) - 1) }))}
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background text-sm font-bold transition-colors hover:bg-muted"
                              >
                                −
                              </button>
                              <span className="w-5 text-center font-mono text-sm font-semibold tabular-nums">
                                {bulkCuatQuantities[cuat] ?? 4}
                              </span>
                              <button
                                type="button"
                                onClick={() => setBulkCuatQuantities((prev) => ({ ...prev, [cuat]: Math.min(8, (prev[cuat] ?? 4) + 1) }))}
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background text-sm font-bold transition-colors hover:bg-muted"
                              >
                                +
                              </button>
                              <button
                                type="button"
                                title="Descartar este cuatrimestre"
                                onClick={() => setBulkExcludedCuats((prev) => { const next = new Set(prev); next.add(cuat); return next; })}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              title="Incluir este cuatrimestre"
                              onClick={() => setBulkExcludedCuats((prev) => { const next = new Set(prev); next.delete(cuat); return next; })}
                              className="rounded-md border border-dashed border-slate-300 px-2.5 py-1 text-[11px] font-medium text-slate-400 transition-colors hover:border-emerald-400 hover:text-emerald-600 dark:border-slate-600 dark:hover:border-emerald-600 dark:hover:text-emerald-400"
                            >
                              Incluir
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between border-t border-border pt-2 mt-1">
                  <span className="text-xs text-muted-foreground">Total a crear</span>
                  <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {bulkTotalGroups} {bulkTotalGroups === 1 ? "grupo" : "grupos"}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => { setIsBulkCreateOpen(false); setBulkCareerCode(""); setBulkCuatQuantities({}); setBulkExcludedCuats(new Set()); setBulkPlan("nuevo-modelo"); }}
              disabled={isBulkCreating}
              className="w-full sm:w-auto text-sm"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleBulkCreate}
              variant="success"
              disabled={!bulkCareerCode || bulkTotalGroups === 0 || isBulkCreating}
              className="w-full sm:w-auto gap-2 text-sm"
            >
              {isBulkCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creando grupos...
                </>
              ) : (
                <>
                  <Layers className="h-4 w-4" />
                  {bulkTotalGroups > 0 ? `Crear ${bulkTotalGroups} grupos` : "Crear grupos"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para crear grupo */}
      <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Crear nuevo grupo</DialogTitle>
            <DialogDescription className="text-sm">
              Selecciona el plan, carrera, cuatrimestre y número para generar el grupo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select value={plan} onValueChange={(v: any) => setPlan(v)}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nuevo-modelo">Plan Nuevo Modelo</SelectItem>
                  <SelectItem value="plan-normal">Plan Normal</SelectItem>
                </SelectContent>
              </Select>
              <Select value={careerCode} onValueChange={(value) => setCareerCode(value)} disabled={!plan}>
                <SelectTrigger className="min-w-0 text-sm">
                  <SelectValue placeholder="Carrera" className="min-w-0 flex-1 truncate" />
                </SelectTrigger>
                <SelectContent>
                  {careerOptions.map((career) => (
                    <SelectItem key={career.codigo} value={career.codigo} className="whitespace-normal py-2 pr-3">
                      <span className="block max-w-[18rem] break-words leading-snug text-sm">{career.nombre}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={cuatrimestre} onValueChange={setCuatrimestre} disabled={!selectedCareer}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Cuatrimestre" />
                </SelectTrigger>
                <SelectContent>
                  {cuatrimestresDisponibles.map((number) => (
                    <SelectItem key={number} value={String(number)}>
                      {cuatrimestresLabel(number)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(groupNumber)} onValueChange={(value) => setGroupNumber(Number(value))}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Asignación de número" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 20 }, (_, index) => index + 1).map((number) => (
                    <SelectItem key={number} value={String(number)}>
                      {number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex min-w-0 items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
              <CalendarDays className="h-4 w-4 text-emerald-500 shrink-0" aria-hidden="true" />
              <div className="min-w-0 truncate text-xs sm:text-sm">Nombre: <strong className="text-slate-900 dark:text-slate-100">{currentGroupName}</strong></div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => { setIsCreateGroupOpen(false); setCareerCode(""); setCuatrimestre(""); setGroupNumber(1); }}
              className="w-full sm:w-auto text-sm"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddGroup}
              variant="success"
              disabled={!careerCode || !cuatrimestre}
              className="w-full sm:w-auto text-sm"
            >
              Crear grupo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Loader - Ajustado para móvil */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="status" aria-live="polite">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative z-10 flex flex-col items-center gap-3 rounded-lg bg-white/90 p-6 shadow-lg dark:bg-slate-900/90 max-w-[90vw]">
            <svg className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-emerald-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Procesando...</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Configuration;