import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Checkbox } from "../../components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { getFormConfig, getGroups, addGroup, removeGroup, saveGroups, saveFormConfig, Group, type FormId, type FormRole } from "../../../lib/formConfig";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { CalendarDays, ChevronDown, ChevronUp, FileText, Grid2x2, Moon, PencilLine, Search, Sun, Trash2, Users, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { carrieras } from "../../data/curricula";

type ConfigTab = "formularios" | "grupos" | "cuenta";

interface ConfigurationProps {
  initialTab?: ConfigTab;
}

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
      : [7, 8, 9, 10];
  }

  return careerType === "TSU" ? [] : [7, 8, 9, 10, 11];
};

type FormSectionId = "docentes" | "tutorias" | "estadias";

const FORM_DEFINITIONS: Array<{ id: FormId; title: string; description: string; section: FormSectionId }> = [
  { id: "planeacion", title: "Planeación", description: "Planeación académica", section: "docentes" },
  { id: "instrumento-3040", title: "Instrumento 30/40%", description: "Evaluación intermedia", section: "docentes" },
  { id: "instrumento-6070", title: "Instrumento 60/70%", description: "Evaluación final parcial", section: "docentes" },
  { id: "lista-concentrada", title: "Lista Concentrada", description: "Concentrado general", section: "docentes" },
  { id: "asesoria", title: "Asesoría", description: "Registro de asesorías", section: "docentes" },
  { id: "portafolio-digital", title: "Portafolio Digital", description: "Entrega de evidencias", section: "docentes" },
  { id: "acta-final", title: "Acta Final", description: "Cierre del periodo", section: "docentes" },
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

export function Configuration(props: Readonly<ConfigurationProps>) {
  const { initialTab = "formularios" } = props;
  const { user, updateProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<ConfigTab>(initialTab);
  const [formConfig, setFormConfig] = useState(getFormConfig());
  const [groups, setGroups] = useState<Group[]>(getGroups());

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

  const [profileName, setProfileName] = useState("");
  const [profileFirstNames, setProfileFirstNames] = useState("");
  const [profileLastNames, setProfileLastNames] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileAvatar, setProfileAvatar] = useState<string | undefined>(undefined);
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [groupSearch, setGroupSearch] = useState("");
  const [groupViewPlan, setGroupViewPlan] = useState<"nuevo-modelo" | "plan-normal">("nuevo-modelo");
  const [openFormSection, setOpenFormSection] = useState<FormSectionId | null>(null);
  const [openFormItems, setOpenFormItems] = useState<Record<FormId, boolean>>({});

  const toggleFormItem = (id: FormId) => {
    setOpenFormItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const [deleteTarget, setDeleteTarget] = useState<null | {
    label: string;
    description: string;
    onConfirm: () => void;
  }>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const navItems = useMemo(
    () => [
      { value: "formularios" as const, label: "Formularios", icon: FileText, description: "Campos y estructura" },
      { value: "grupos" as const, label: "Grupos", icon: Users, description: "Carreras y cuatrimestres" },
      { value: "cuenta" as const, label: "Cuenta", icon: Settings2, description: "Perfil y preferencias" },
    ],
    []
  );

  useEffect(() => {
    setFormConfig(getFormConfig());
    setGroups(getGroups());
  }, []);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!user) return;
    const nameParts = (user.name ?? "").trim().split(/\s+/).filter(Boolean);
    if (nameParts.length <= 1) {
      setProfileFirstNames(user.name ?? "");
      setProfileLastNames("");
    } else {
      setProfileFirstNames(nameParts.slice(0, Math.max(1, nameParts.length - 2)).join(" "));
      setProfileLastNames(nameParts.slice(Math.max(1, nameParts.length - 2)).join(" "));
    }
    setProfileName(user.name ?? "");
    setProfilePhone(user.phone ?? "");
    setProfileAvatar(user.avatar);
  }, [user]);

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
      editingGroupOriginal.careerCode !== editingGroupCareerCode.trim().toUpperCase() ||
      editingGroupOriginal.cuatrimestre !== editingGroupCuatrimestre ||
      editingGroupOriginal.groupNumber !== Number(editingGroupNumber)
    )
  );
  const filteredGroups = useMemo(
    () => groups.filter((group) => {
      const query = groupSearch.trim().toLowerCase();
      if (!query) return true;
      return [group.name, group.plan, String(group.cuatrimestre), String(group.groupNumber), group.careerCode]
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

  const [openCareer, setOpenCareer] = useState<string | null>(null);

  useEffect(() => {
    setOpenCareer(null);
  }, [groupViewPlan]);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setCareerCode("");
    setCuatrimestre("");
    setGroupNumber(1);
  }, [plan]);

  useEffect(() => {
    if (!selectedCareer) {
      setCuatrimestre("");
      return;
    }

    if (!cuatrimestresDisponibles.includes(Number(cuatrimestre))) {
      setCuatrimestre("");
    }
  }, [selectedCareer, cuatrimestresDisponibles, cuatrimestre]);

  useEffect(() => {
    if (!editingGroupId) return;

    if (!editingSelectedCareer) {
      setEditingGroupCuatrimestre("");
      return;
    }

    if (!editingCuatrimestresDisponibles.includes(Number(editingGroupCuatrimestre))) {
      setEditingGroupCuatrimestre("");
    }
  }, [editingGroupId, editingSelectedCareer, editingCuatrimestresDisponibles, editingGroupCuatrimestre]);

  const updateFormAccess = (formId: FormId, updater: (current: { roles: FormRole[]; dueAt: string | null }) => { roles: FormRole[]; dueAt: string | null }) => {
    setFormConfig((current) => {
      const next = {
        ...current,
        formAccess: {
          ...current.formAccess,
          [formId]: updater(current.formAccess[formId]),
        },
      };
      saveFormConfig(next);
      return next;
    });
  };

  const toggleFormRole = (formId: FormId, role: FormRole) => {
    updateFormAccess(formId, (current) => {
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
    updateFormAccess(formId, (current) => ({
      ...current,
      dueAt: value || null,
    }));
  };

  const handleAddGroup = () => {
    if (!careerCode.trim() || !cuatrimestre) return;
    setIsLoading(true);
    setTimeout(() => {
      addGroup({ careerCode: careerCode.toUpperCase(), plan, cuatrimestre: Number(cuatrimestre), groupNumber: Number(groupNumber) });
      setGroups(getGroups());
      // clear inputs
      setCareerCode("");
      setCuatrimestre("");
      setGroupNumber(1);
      setIsLoading(false);
      toast.success("Grupo creado");
    }, 400);
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

  const handleSaveGroupEdit = () => {
    if (!editingGroupId || !editingGroupCareerCode.trim() || !editingGroupCuatrimestre) return;
    setIsLoading(true);

    setTimeout(() => {
      const nextGroups = groups.map((group) => (
        group.id === editingGroupId
          ? {
              ...group,
              plan: editingGroupPlan,
              careerCode: editingGroupCareerCode.trim().toUpperCase(),
              cuatrimestre: Number(editingGroupCuatrimestre),
              groupNumber: Number(editingGroupNumber),
              name: `${editingGroupCareerCode.trim().toUpperCase()}${editingGroupCuatrimestre}-${editingGroupNumber}`,
            }
          : group
      ));

      setGroups(nextGroups);
      saveGroups(nextGroups);
      clearEditingGroupState();
      setIsLoading(false);
      toast.success("Grupo actualizado");
    }, 400);
  };

  const handleRemoveGroup = (id: number) => {
    const group = groups.find((item) => item.id === id);
    if (!group) return;

    setDeleteTarget({
      label: group.name,
      description: "Grupo",
      onConfirm: () => {
        removeGroup(id);
        setGroups(getGroups());
      },
    });
    setDeleteConfirmation("");
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Solo se permiten imágenes PNG, JPG o WEBP");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("La imagen no debe superar 2 MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : undefined;
      setProfileAvatar(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = () => {
    const firstNames = profileFirstNames.trim();
    const lastNames = profileLastNames.trim();
    const normalizedPhone = profilePhone.replace(/\D/g, "").slice(0, 10);

    if (!firstNames || !lastNames) {
      toast.error("Debes escribir nombres y apellidos");
      return;
    }

    if (normalizedPhone.length !== 10) {
      toast.error("El teléfono debe contener exactamente 10 números");
      return;
    }

    const fullName = `${firstNames} ${lastNames}`.trim();

    updateProfile({
      name: fullName,
      phone: normalizedPhone,
      avatar: profileAvatar,
    });
    toast.success("Configuración de cuenta actualizada");
  };

  const shellClass = theme === "dark"
    ? "bg-transparent text-slate-100"
    : "bg-transparent text-slate-900";

  const sidebarClass = theme === "dark"
    ? "border-emerald-900/40 bg-slate-950/55 text-white backdrop-blur"
    : "border-emerald-200/60 bg-white/55 text-slate-900 backdrop-blur";

  const sidebarCardClass = theme === "dark"
    ? "border-b border-white/5 bg-gradient-to-b from-emerald-500/10 to-transparent"
    : "border-b border-emerald-200/40 bg-gradient-to-b from-emerald-50/70 to-transparent";

  const sectionCardClass = theme === "dark"
    ? "overflow-hidden border-emerald-900/35 bg-slate-950/55 shadow-sm backdrop-blur"
    : "overflow-hidden border-emerald-200/60 bg-white/55 shadow-sm backdrop-blur";

  const sectionHeaderClass = theme === "dark"
    ? "bg-gradient-to-r from-emerald-950/20 to-slate-950/20"
    : "bg-gradient-to-r from-emerald-50/70 via-white/40 to-slate-50/50";

  const softPanelClass = theme === "dark"
    ? "rounded-2xl border border-emerald-900/25 bg-slate-950/35 p-4"
    : "rounded-2xl border border-emerald-200/45 bg-white/45 p-4";

  const softSubpanelClass = theme === "dark"
    ? "rounded-2xl border border-white/5 bg-slate-950/20 dark:border-emerald-900/20 dark:bg-slate-950/25"
    : "rounded-2xl border border-emerald-200/35 bg-white/35";

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
    <div className={`space-y-8 pb-6 ${shellClass}`}>
      <div className="rounded-3xl border border-emerald-200/60 bg-white/45 p-6 shadow-sm backdrop-blur dark:border-emerald-900/35 dark:bg-slate-950/55">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Configuración del Sistema</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">Ajustes globales y parámetros del sistema</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Grid2x2 className="h-4 w-4 text-emerald-500" />
            Panel de administración
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card className={`${sidebarClass} shadow-xl`}>
          <CardHeader className={sidebarCardClass}>
            <CardTitle className={theme === "dark" ? "text-white" : "text-slate-900"}>Secciones</CardTitle>
            <CardDescription className={theme === "dark" ? "text-slate-400" : "text-slate-500"}>Navega por la configuración</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 p-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  disabled={Boolean(editingGroupId && item.value !== activeTab)}
                  onClick={() => setActiveTab(item.value)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all ${
                    isActive
                      ? (theme === "dark"
                          ? "bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30"
                          : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70")
                      : (theme === "dark"
                          ? "text-slate-300 hover:bg-white/5 hover:text-white"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")
                  }`}
                >
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${isActive ? (theme === "dark" ? "bg-emerald-400/15" : "bg-emerald-100") : (theme === "dark" ? "bg-white/5" : "bg-slate-100")}`}>
                    <Icon className={`h-5 w-5 ${isActive ? (theme === "dark" ? "text-emerald-300" : "text-emerald-700") : (theme === "dark" ? "text-slate-300" : "text-slate-500")}`} />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className={`block text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>{item.description}</span>
                  </span>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-8">
          {activeTab === "cuenta" && (
            <Card className={sectionCardClass}>
              <CardHeader className={sectionHeaderClass}>
                <CardTitle>Configuración de tu Cuenta</CardTitle>
                <CardDescription>Gestiona tu foto, datos básicos y preferencias visuales.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/70 bg-slate-50 p-4 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900/60">
                  <Avatar className="h-20 w-20 ring-2 ring-emerald-200/70 dark:ring-emerald-900/40">
                    {profileAvatar ? (
                      <AvatarImage
                        src={profileAvatar}
                        alt={profileFirstNames || "Usuario"}
                        className="cursor-pointer"
                        onClick={() => setIsAvatarOpen(true)}
                      />
                    ) : (
                      <AvatarFallback
                        className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-xl cursor-pointer"
                        onClick={() => setIsAvatarOpen(true)}
                      >
                        {(profileFirstNames || profileLastNames || user?.name || "U").split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="space-y-2">
                    <Label htmlFor="avatar">Foto de perfil</Label>
                    <Input id="avatar" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarChange} />
                    <p className="text-xs text-muted-foreground">Formatos: PNG/JPG/WEBP. Tamaño máximo: 2MB.</p>
                  </div>
                </div>

                <Dialog open={isAvatarOpen} onOpenChange={setIsAvatarOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Foto de perfil</DialogTitle>
                      <DialogDescription>Vista previa de tu imagen de perfil</DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 flex justify-center">
                      {profileAvatar ? (
                        <img src={profileAvatar} alt={profileFirstNames || "Usuario"} className="max-h-[70vh] max-w-full rounded-lg object-contain" />
                      ) : (
                        <div className="h-40 w-40 rounded-lg bg-emerald-100 flex items-center justify-center text-2xl">
                          {(profileFirstNames || profileLastNames || user?.name || "U").split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nombres</Label>
                    <Input value={profileFirstNames} onChange={(e) => setProfileFirstNames(e.target.value)} placeholder="Ej. María Fernanda" />
                  </div>
                  <div className="space-y-2">
                    <Label>Apellidos</Label>
                    <Input value={profileLastNames} onChange={(e) => setProfileLastNames(e.target.value)} placeholder="Ej. González López" />
                  </div>
                  <div className="space-y-2">
                    <Label>Correo electrónico</Label>
                    <Input value={user?.email ?? ""} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="Ej. 6531234567"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="space-y-3">
                    <Label className="block">Tema de la aplicación</Label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={toggleTheme}
                      className="w-fit gap-2 border-slate-200 bg-white text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    >
                      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                      {theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button variant="success" onClick={handleSaveProfile}>Guardar configuración</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "formularios" && (
            <Card className={sectionCardClass}>
              <CardHeader className={sectionHeaderClass}>
                <CardTitle>Formularios</CardTitle>
                <CardDescription>Administra el acceso, vencimiento y visibilidad de cada formulario</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className={softPanelClass}>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Control por formulario</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Define vencimiento y roles permitidos para cada apartado del sistema.</p>
                  </div>

                  <div className="space-y-3">
                    {formSections.map((section) => {
                      const isOpen = openFormSection === section.section;
                      return (
                        <div key={section.section} className={softSubpanelClass}>
                          <button
                            type="button"
                            onClick={() => setOpenFormSection(isOpen ? null : section.section)}
                            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                            aria-expanded={isOpen}
                          >
                            <div className="min-w-0">
                              <h4 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{section.title}</h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{section.description}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                {section.forms.length}
                              </span>
                              {isOpen ? (
                                <ChevronUp className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                              ) : (
                                <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                              )}
                            </div>
                          </button>

                          {isOpen && (
                            <div className="border-t border-emerald-200/35 p-3 dark:border-emerald-900/20">
                              <div className="space-y-2">
                                {section.forms.map((form) => {
                                  const config = formConfig.formAccess[form.id];
                                  const allowedRoles = config.roles.map((role) => FORM_ROLE_LABELS[role]).join(" y ");
                                  const isTutoriasForm = form.section === "tutorias";
                                  const dueAtLabel = config.dueAt
                                    ? new Date(config.dueAt).toLocaleString("es-MX", {
                                        dateStyle: "medium",
                                        timeStyle: "short",
                                      })
                                    : "Sin vencimiento";

                                  const isOpenItem = Boolean(openFormItems[form.id]);

                                  return (
                                    <div key={form.id} className="rounded-2xl border border-emerald-200/35 bg-white/45 dark:border-emerald-900/20 dark:bg-slate-950/30">
                                      <button
                                        type="button"
                                        onClick={() => toggleFormItem(form.id)}
                                        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                                        aria-expanded={isOpenItem}
                                      >
                                        <div className="min-w-0">
                                          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{form.title}</p>
                                          <p className="text-xs text-slate-500 dark:text-slate-400">{form.description}</p>
                                        </div>

                                        <div className="flex shrink-0 items-center gap-3">
                                          <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-300">{allowedRoles}</span>
                                          <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-300">{dueAtLabel}</span>
                                          {isOpenItem ? (
                                            <ChevronUp className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                                          ) : (
                                            <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                                          )}
                                        </div>
                                      </button>

                                      {isOpenItem && (
                                        <div className="border-t border-emerald-200/35 p-3 dark:border-emerald-900/20">
                                          <div className="grid gap-3 sm:grid-cols-2">
                                            <div className="space-y-2 sm:col-span-2">
                                              <div className="flex items-center justify-between">
                                                <Label htmlFor={`deadline-${form.id}`}>Fecha y hora de vencimiento</Label>
                                                <label className="flex items-center gap-2 text-sm">
                                                  <Checkbox
                                                    checked={config.dueAt === null}
                                                    onCheckedChange={(val) => {
                                                      // If checked -> 'sin límite' => store null
                                                      // If unchecked -> allow editing by setting empty string for this form only
                                                      updateFormAccess(form.id, (current) => ({ ...current, dueAt: val ? null : "" }));
                                                    }}
                                                  />
                                                  <span>Sin límite</span>
                                                </label>
                                              </div>
                                              <Input
                                                id={`deadline-${form.id}`}
                                                type="datetime-local"
                                                value={config.dueAt ?? ""}
                                                onChange={(event) => handleDeadlineChange(form.id, event.target.value)}
                                                disabled={config.dueAt === null}
                                              />
                                            </div>

                                            <div className="space-y-2 sm:col-span-2">
                                              <Label>Roles permitidos</Label>
                                              {isTutoriasForm ? (
                                                <div className="flex items-center gap-2">
                                                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Tutor</span>
                                                  <span className="text-xs text-muted-foreground">Este formulario queda asignado sólo a tutores.</span>
                                                </div>
                                              ) : (
                                                <div className="flex items-center gap-4">
                                                  <label className="flex items-center gap-2">
                                                    <Checkbox
                                                      checked={config.roles.includes("docente")}
                                                      onCheckedChange={() => toggleFormRole(form.id, "docente")}
                                                    />
                                                    <span className="text-sm">Docente</span>
                                                  </label>
                                                  <label className="flex items-center gap-2">
                                                    <Checkbox
                                                      checked={config.roles.includes("tutor")}
                                                      onCheckedChange={() => toggleFormRole(form.id, "tutor")}
                                                    />
                                                    <span className="text-sm">Tutor</span>
                                                  </label>
                                                </div>
                                              )}
                                              {!isTutoriasForm && <p className="text-xs text-muted-foreground">Selecciona si el formulario aplica para Docente, Tutor o ambos.</p>}
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
            <Card className={sectionCardClass}>
              <CardHeader className={sectionHeaderClass}>
                <CardTitle>Grupos</CardTitle>
                <CardDescription>Crear y administrar grupos que aparecerán en los formularios</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className={softPanelClass.replace("p-4", "p-4 md:grid md:grid-cols-3 gap-3") }>
                  <Select value={plan} onValueChange={(v: any) => setPlan(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nuevo-modelo">Plan Nuevo Modelo</SelectItem>
                      <SelectItem value="plan-normal">Plan Normal</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={careerCode} onValueChange={(value) => setCareerCode(value)} disabled={!plan}>
                    <SelectTrigger className="min-w-0">
                      <SelectValue placeholder="Carrera" className="min-w-0 flex-1 truncate" />
                    </SelectTrigger>
                    <SelectContent>
                      {careerOptions.map((career) => (
                        <SelectItem key={career.codigo} value={career.codigo} className="whitespace-normal py-2 pr-3">
                          <span className="block max-w-[18rem] break-words leading-snug">{career.nombre}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={cuatrimestre} onValueChange={setCuatrimestre} disabled={!selectedCareer}>
                    <SelectTrigger>
                      <SelectValue placeholder="Cuatrimestre" />
                    </SelectTrigger>
                    <SelectContent>
                      {cuatrimestresDisponibles.map((number) => (
                        <SelectItem key={number} value={String(number)}>
                          {number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={String(groupNumber)} onValueChange={(value) => setGroupNumber(Number(value))}>
                    <SelectTrigger>
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
                  <div className="flex min-w-0 items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-sm md:col-span-2 dark:border-slate-700 dark:bg-slate-950">
                    <CalendarDays className="h-4 w-4 text-emerald-500" />
                    <div className="min-w-0 truncate">Nombre generado: <strong className="ml-2 text-slate-900 dark:text-slate-100">{currentGroupName}</strong></div>
                  </div>
                  <Button onClick={handleAddGroup} variant="success" disabled={!careerCode || !cuatrimestre}>Crear grupo</Button>
                </div>

                <div className={softPanelClass}>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="font-medium text-slate-900 dark:text-slate-100">Grupos creados</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Selecciona un plan y verás sus carreras con los grupos creados.</p>
                    </div>
                    <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
                      <div className="relative w-full md:w-64">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          value={groupSearch}
                          onChange={(event) => setGroupSearch(event.target.value)}
                          placeholder="Buscar grupo"
                          className="pl-9"
                        />
                      </div>
                      <Select value={groupViewPlan} onValueChange={(value) => setGroupViewPlan(value as "nuevo-modelo" | "plan-normal")}>
                        <SelectTrigger className="w-full md:w-64">
                          <SelectValue placeholder="Ver plan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nuevo-modelo">Plan Nuevo Modelo</SelectItem>
                          <SelectItem value="plan-normal">Plan Normal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="mt-4 space-y-4">
                    {filteredGroups.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-emerald-200/45 bg-white/40 px-4 py-6 text-sm text-slate-500 dark:border-emerald-900/25 dark:bg-slate-950/35">No hay grupos que coincidan con la búsqueda.</div>
                    ) : (
                      <>
                        <div className="rounded-2xl border border-emerald-200/40 bg-white/45 p-4 dark:border-emerald-900/25 dark:bg-slate-950/35">
                          <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 pb-3 dark:border-slate-800">
                            <div>
                              <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
                                {groupViewPlan === "nuevo-modelo" ? "Plan Nuevo Modelo" : "Plan Normal"}
                              </h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{selectedPlanGroups.length} grupos en este plan</p>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{selectedPlanCareerGroups.length} carreras con grupos</p>
                          </div>

                          <div className="mt-4 space-y-3">
                            {selectedPlanCareerGroups.length === 0 ? (
                              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40">
                                No hay grupos creados para este plan.
                              </div>
                            ) : (
                              selectedPlanCareerGroups.map(({ career, groups: careerGroups }) => (
                                <div key={career.codigo} className="rounded-2xl border border-emerald-200/35 bg-white/35 dark:border-emerald-900/20 dark:bg-slate-950/25">
                                  <button
                                    type="button"
                                    onClick={() => setOpenCareer(openCareer === career.codigo ? null : career.codigo)}
                                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                                    aria-expanded={openCareer === career.codigo}
                                  >
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{career.nombre}</p>
                                      <p className="text-xs text-slate-500 dark:text-slate-400">{career.codigo} · {careerGroups.length} grupos creados</p>
                                    </div>
                                    <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                      {careerGroups.length}
                                    </span>
                                  </button>

                                  {openCareer === career.codigo && (
                                    <div className="space-y-2 border-t border-emerald-200/35 p-3 dark:border-emerald-900/20">
                                      {careerGroups.map((g) => (
                                        <div key={g.id} className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200/35 bg-white/40 px-4 py-3 dark:border-emerald-900/20 dark:bg-slate-950/30">
                                          <div className="min-w-0 flex-1 text-sm text-slate-700 dark:text-slate-200">
                                            <p className="truncate font-medium">{g.name}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Cuatrimestre {g.cuatrimestre} · Grupo {g.groupNumber}</p>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <Button
                                              variant="outline"
                                              size="icon"
                                              onClick={() => handleStartEditGroup(g)}
                                              disabled={Boolean(editingGroupId)}
                                              className="h-9 w-9 rounded-full border-emerald-200/60 bg-white/60 text-slate-700 hover:bg-emerald-50 hover:text-slate-900 dark:border-emerald-900/30 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-900"
                                              aria-label={`Editar grupo ${g.name}`}
                                              title="Editar grupo"
                                            >
                                              <PencilLine className="h-4 w-4" aria-hidden="true" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => handleRemoveGroup(g.id)}
                                              disabled={Boolean(editingGroupId)}
                                              className="h-9 w-9 rounded-full text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 dark:text-rose-400 dark:hover:bg-rose-500/10"
                                              aria-label={`Eliminar grupo ${g.name}`}
                                              title="Eliminar grupo"
                                            >
                                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteConfirmation("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              Escribe exactamente <strong>{deleteTarget?.label}</strong> para confirmar el borrado de {deleteTarget?.description?.toLowerCase()}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Texto de confirmación</Label>
            <Input
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              placeholder={deleteTarget?.label ?? "Escribe aquí"}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteConfirmation("");
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!deleteTarget) return;
                if (deleteConfirmation.trim() !== deleteTarget.label.trim()) {
                  toast.error(`Debes escribir "${deleteTarget.label}" para confirmar`);
                  return;
                }
                setIsLoading(true);
                setTimeout(() => {
                  deleteTarget.onConfirm();
                  setDeleteTarget(null);
                  setDeleteConfirmation("");
                  setIsLoading(false);
                  toast.success("Elemento eliminado");
                }, 400);
              }}
              disabled={isLoading}
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar grupo</DialogTitle>
            <DialogDescription>
              Modifica los datos del grupo seleccionado. Si haces cambios, debes guardarlos antes de salir.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
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
                <SelectTrigger className="min-w-0">
                  <SelectValue placeholder="Plan" className="min-w-0 flex-1 truncate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nuevo-modelo">Plan Nuevo Modelo</SelectItem>
                  <SelectItem value="plan-normal">Plan Normal</SelectItem>
                </SelectContent>
              </Select>
              <Select value={editingGroupCareerCode} onValueChange={setEditingGroupCareerCode} disabled={!editingGroupPlan}>
                <SelectTrigger className="min-w-0">
                  <SelectValue placeholder="Carrera" className="min-w-0 flex-1 truncate" />
                </SelectTrigger>
                <SelectContent>
                  {editingCareerOptions.map((career) => (
                    <SelectItem key={career.codigo} value={career.codigo} className="whitespace-normal py-2 pr-3">
                      <span className="block max-w-[18rem] break-words leading-snug">{career.nombre}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={editingGroupCuatrimestre} onValueChange={setEditingGroupCuatrimestre} disabled={!editingSelectedCareer}>
                <SelectTrigger className="min-w-0">
                  <SelectValue placeholder="Cuatrimestre" className="min-w-0 flex-1 truncate" />
                </SelectTrigger>
                <SelectContent>
                  {editingCuatrimestresDisponibles.map((number) => (
                    <SelectItem key={number} value={String(number)}>
                      {number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(editingGroupNumber)} onValueChange={(value) => setEditingGroupNumber(Number(value))}>
                <SelectTrigger className="min-w-0">
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

          <DialogFooter>
            <Button
              variant="outline"
              onClick={clearEditingGroupState}
              disabled={isEditingGroupDirty}
            >
              Cerrar
            </Button>
            <Button
              variant="success"
              onClick={handleSaveGroupEdit}
              disabled={!editingGroupId || !editingGroupCareerCode.trim() || !editingGroupCuatrimestre}
            >
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative z-10 flex flex-col items-center gap-3 rounded-lg bg-white/90 p-6 shadow-lg dark:bg-slate-900/90">
            <svg className="h-12 w-12 animate-spin text-emerald-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
