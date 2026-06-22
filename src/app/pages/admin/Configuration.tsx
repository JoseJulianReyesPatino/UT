import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Checkbox } from "../../components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { getBackendFormCode, getFormConfig, saveFormConfig, getFormIdsForBackendCode, type FormId, type FormRole, type Group } from "../../../lib/formConfig";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";
import { API_BASE_URL } from "../../lib/env";
import { useTheme } from "../../context/ThemeContext";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronUp, FileText, Grid2x2, Moon, PencilLine, Plus, Search, Sun, Trash2, Users, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { carrieras } from "../../data/curricula";
import { clearAvatarCache, getAvatarUrlWithTimestamp, getInitials } from "../../lib/avatar";

// Función para resolver URLs de avatar
const getAbsoluteUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  if (url.startsWith('/')) {
    const baseUrl = API_BASE_URL.replace(/\/api$/, '');
    return `${baseUrl}${url}`;
  }
  return url;
};

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
  { id: "instrumento-30-normal", title: "Instrumento 30%", description: "Evaluación intermedia - Plan Normal", section: "docentes" },
  { id: "instrumento-40-nuevo", title: "Instrumento 40%", description: "Evaluación intermedia - Nuevo Modelo", section: "docentes" },
  { id: "instrumento-60-nuevo", title: "Instrumento 60%", description: "Evaluación final parcial - Nuevo Modelo", section: "docentes" },
  { id: "instrumento-70-normal", title: "Instrumento 70%", description: "Evaluación final parcial - Plan Normal", section: "docentes" },
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
  const { user, updateProfile, refreshUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<ConfigTab>(initialTab);
  const [mobileSectionOpen, setMobileSectionOpen] = useState(false);
  const [formConfig, setFormConfig] = useState(getFormConfig());
  const [formCodeToId, setFormCodeToId] = useState<Record<FormId, number>>({} as Record<FormId, number>);
  const [formBackendCode, setFormBackendCode] = useState<Record<FormId, string>>({} as Record<FormId, string>);
  const [isFormConfigLoading, setIsFormConfigLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [formDrafts, setFormDrafts] = useState<Record<FormId, { roles: FormRole[]; dueAt: string | null }>>(() => getFormConfig().formAccess);
  const [savingFormIds, setSavingFormIds] = useState<Record<FormId, boolean>>({} as Record<FormId, boolean>);

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
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
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

    const loadFormConfig = async () => {
      setIsFormConfigLoading(true);

      try {
        const res = await apiFetch('/forms');
        const savedConfig = getFormConfig();
        const formAccess = { ...savedConfig.formAccess };
        const idMap = {} as Record<FormId, number>;
        const assignedFormIds = new Set<FormId>();
        const combinedBackendCodes = new Set(["instrumento-3040", "instrumento-6070"]);

        const forms = res?.data ?? [];
        const formByCode = forms.reduce((acc: Record<string, any>, item: any) => {
          const backendCode = String(item.form_code).replace(/_/g, '-');
          acc[backendCode] = item;
          return acc;
        }, {} as Record<string, any>);

        const backendCodeForFormId = {} as Record<FormId, string>;

        for (const formId of Object.keys(formAccess) as FormId[]) {
          const directCode = formId;
          const combinedCode = getBackendFormCode(formId);
          const combinedItem = combinedCode !== directCode ? formByCode[combinedCode] : undefined;
          const directItem = formByCode[directCode];
          const item = combinedItem ?? directItem;

          if (!item) {
            continue;
          }

          backendCodeForFormId[formId] = combinedItem ? combinedCode : directCode;
          formAccess[formId] = {
            roles: item.access_roles ?? formAccess[formId].roles,
            dueAt: item.due_at ?? formAccess[formId].dueAt,
          };

          idMap[formId] = item.id;
        }

        const nextConfig = { ...savedConfig, formAccess };
        saveFormConfig(nextConfig);
        setFormConfig(nextConfig);
        setFormDrafts(nextConfig.formAccess);
        setFormCodeToId(idMap);
        setFormBackendCode(backendCodeForFormId);
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
      loadedProfileUserId.current = String(user.id);
    }

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

  const setFormDraftValue = (
    formId: FormId,
    updater: (current: { roles: FormRole[]; dueAt: string | null }) => { roles: FormRole[]; dueAt: string | null },
  ) => {
    const actualBackendCode = formBackendCode[formId] ?? getBackendFormCode(formId);
    const isCombined = actualBackendCode === "instrumento-3040" || actualBackendCode === "instrumento-6070";
    const relatedFormIds = isCombined ? getFormIdsForBackendCode(actualBackendCode) : [formId];

    setFormDrafts((current) => {
      const next = { ...current };
      const base = current[formId] ?? formConfig.formAccess[formId];
      const updated = updater(base);

      for (const id of relatedFormIds) {
        next[id] = updated;
      }

      return next;
    });
  };

  const saveFormAccessRule = async (formId: FormId, nextRule: { roles: FormRole[]; dueAt: string | null }) => {
    const formIdNumber = formCodeToId[formId];
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

    const isDifferent = JSON.stringify(currentDraft) !== JSON.stringify(formConfig.formAccess[formId]);
    if (!isDifferent) {
      toast('No hay cambios pendientes.');
      return;
    }

    setSavingFormIds((current) => ({ ...current, [formId]: true }));
    const success = await saveFormAccessRule(formId, currentDraft);
    if (success) {
      const actualBackendCode = formBackendCode[formId] ?? getBackendFormCode(formId);
      const isCombined = actualBackendCode === "instrumento-3040" || actualBackendCode === "instrumento-6070";
      const relatedFormIds = isCombined ? getFormIdsForBackendCode(actualBackendCode) : [formId];

      setFormConfig((current) => {
        const nextFormAccess = { ...current.formAccess };

        for (const id of relatedFormIds) {
          nextFormAccess[id] = currentDraft;
        }

        const next = {
          ...current,
          formAccess: nextFormAccess,
        };
        saveFormConfig(next);
        return next;
      });
      setFormDrafts((current) => {
        const next = { ...current };

        for (const id of relatedFormIds) {
          next[id] = currentDraft;
        }

        return next;
      });
      toast.success('Configuración guardada');
    }
    setSavingFormIds((current) => ({ ...current, [formId]: false }));
  };

  const handleResetForm = (formId: FormId) => {
    setFormDrafts((current) => ({
      ...current,
      [formId]: formConfig.formAccess[formId],
    }));
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
      dueAt: value || null,
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
      setGroups((prev) => [res.data, ...prev]);
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

      setGroups((prev) => prev.map((g) => (g.id === editingGroupId ? res.data : g)));
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

    if (normalizedPhone.length !== 10) {
      toast.error("El teléfono debe contener exactamente 10 números");
      return;
    }

    const fullName = `${firstNames} ${lastNames}`.trim();

    setIsSavingProfile(true);

    try {
      if (selectedAvatarFile) {
        const formData = new FormData();
        formData.append("full_name", fullName);
        formData.append("first_names", firstNames);
        formData.append("last_names", lastNames);
        formData.append("phone", normalizedPhone);
        formData.append("avatar", selectedAvatarFile);
        
        await apiFetch("/auth/profile", {
          method: "POST",
          body: formData,
        });
      } else {
        await apiFetch("/auth/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: fullName,
            first_names: firstNames,
            last_names: lastNames,
            phone: normalizedPhone,
          }),
        });
      }

      clearAvatarCache();
      
      const refreshedUser = await refreshUser();
      
      if (refreshedUser) {
        updateProfile({
          name: fullName,
          firstNames,
          lastNames,
          phone: normalizedPhone,
          avatar: refreshedUser.avatar,
        });
        
        setProfileAvatar(refreshedUser.avatar);
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

    if (newPassword.length < 8) {
      toast.error("La nueva contraseña debe tener al menos 8 caracteres");
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
      toast.success("Contraseña actualizada correctamente");
    } catch (error: any) {
      toast.error(error instanceof Error ? error.message : "No fue posible actualizar la contraseña");
    } finally {
      setIsSavingPassword(false);
    }
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
      {/* Header - Mejorado para móvil */}
      <div className="shrink-0 rounded-2xl sm:rounded-3xl border border-emerald-200/60 bg-white/45 p-4 sm:p-6 shadow-sm backdrop-blur dark:border-emerald-900/35 dark:bg-slate-950/55">
        <div className="flex flex-col gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">Configuración del Sistema</h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Ajustes globales y parámetros del sistema</p>
          </div>
        </div>
      </div>

      {/* Layout principal - Cambia a columna en móvil */}
      <div className="grid min-h-0 flex-1 gap-4 sm:gap-6 lg:grid-cols-[280px_minmax(0,1fr)] items-start overflow-hidden">
        {/* Sidebar - Mejorado para móvil */}
        <Card className={`${sidebarClass} shadow-xl self-start ${mobileSectionOpen ? "hidden lg:block" : "block"}`}>
          <CardHeader className={`${sidebarCardClass} p-3 sm:p-6`}>
            <CardTitle className={theme === "dark" ? "text-white text-base sm:text-lg" : "text-slate-900 text-base sm:text-lg"}>Secciones</CardTitle>
            <CardDescription className={`${theme === "dark" ? "text-slate-400" : "text-slate-500"} text-xs sm:text-sm`}>Navega por la configuración</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 sm:space-y-2 p-2 sm:p-3">
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
                      ? (theme === "dark"
                          ? "bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30"
                          : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70")
                      : (theme === "dark"
                          ? "text-slate-300 hover:bg-white/5 hover:text-white"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")
                  }`}
                >
                  <span className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl ${isActive ? (theme === "dark" ? "bg-emerald-400/15" : "bg-emerald-100") : (theme === "dark" ? "bg-white/5" : "bg-slate-100")}`}>
                    <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${isActive ? (theme === "dark" ? "text-emerald-300" : "text-emerald-700") : (theme === "dark" ? "text-slate-300" : "text-slate-500")}`} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs sm:text-sm font-semibold truncate">{item.label}</span>
                    <span className={`hidden sm:block text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>{item.description}</span>
                  </span>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Contenido principal */}
        <div className={`h-full min-h-0 space-y-4 sm:space-y-8 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-emerald-500/20 scrollbar-track-transparent ${mobileSectionOpen ? "block" : "hidden lg:block"}`}>
          <button
            type="button"
            onClick={() => setMobileSectionOpen(false)}
            className="mb-2 flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300 lg:hidden"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Volver a secciones
          </button>
          {activeTab === "cuenta" && (
            <Card className={sectionCardClass}>
              <CardHeader className={`${sectionHeaderClass} p-4 sm:p-6`}>
                <CardTitle className="text-base sm:text-lg">Configuración de tu Cuenta</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Gestiona tu foto, datos básicos y preferencias visuales.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                {/* Avatar - Mejorado para móvil */}
                <div className="flex flex-col sm:flex-row gap-4 rounded-2xl border border-slate-200/70 bg-slate-50 p-4 sm:p-4 sm:items-center dark:border-slate-800 dark:bg-slate-900/60">
                  <Avatar className="h-16 w-16 sm:h-20 sm:w-20 ring-2 ring-emerald-200/70 dark:ring-emerald-900/40">
                    {profileAvatar ? (
                      <AvatarImage
                        src={profileAvatar}
                        alt={profileFirstNames || "Usuario"}
                        className="cursor-pointer"
                        onClick={() => setIsAvatarOpen(true)}
                      />
                    ) : (
                      <AvatarFallback
                        className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-base sm:text-xl cursor-pointer"
                        onClick={() => setIsAvatarOpen(true)}
                      >
                        {(profileFirstNames || profileLastNames || user?.name || "U").split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    )}
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

                {/* Campos de perfil - Mejorado para móvil */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm">Nombres</Label>
                    <Input value={profileFirstNames} onChange={(e) => setProfileFirstNames(e.target.value)} placeholder="Ej. María Fernanda" className="text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Apellidos</Label>
                    <Input value={profileLastNames} onChange={(e) => setProfileLastNames(e.target.value)} placeholder="Ej. González López" className="text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Correo electrónico</Label>
                    <Input value={user?.email ?? ""} disabled className="text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Teléfono</Label>
                    <Input
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="Ej. 6531234567"
                      className="text-sm"
                    />
                  </div>
                </div>

                {/* Cambiar contraseña - Mejorado para móvil */}
                <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Cambiar contraseña</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Actualiza tu contraseña sin salir de esta sección.</p>
                    </div>
                    <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label className="text-sm">Contraseña actual</Label>
                        <Input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Ingresa tu contraseña actual"
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Nueva contraseña</Label>
                        <Input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Ingresa la nueva contraseña"
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Confirmar contraseña</Label>
                        <Input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repite la contraseña"
                          className="text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button variant="outline" onClick={handleSavePassword} disabled={isSavingPassword} className="text-sm">
                        {isSavingPassword ? "Guardando..." : "Actualizar contraseña"}
                      </Button>
                    </div>
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
            <Card className={sectionCardClass}>
              <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                <div className={softPanelClass}>
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
                              <div className="space-y-2 max-h-[320px] sm:max-h-[420px] overflow-y-auto pr-1 sm:pr-2 scrollbar-thin scrollbar-thumb-emerald-500/20 scrollbar-track-transparent hover:scrollbar-thumb-emerald-500/40">
                                {section.forms.map((form) => {
                                  const savedConfig = formConfig.formAccess[form.id];
                                  const draftConfig = formDrafts[form.id] ?? savedConfig;
                                  const allowedRoles = draftConfig.roles.map((role) => FORM_ROLE_LABELS[role]).join(" y ");
                                  const isTutoriasForm = form.section === "tutorias";
                                  const dueAtLabel = draftConfig.dueAt
                                    ? new Date(draftConfig.dueAt).toLocaleString("es-MX", {
                                        dateStyle: "medium",
                                        timeStyle: "short",
                                      })
                                    : "Sin vencimiento";

                                  const isOpenItem = Boolean(openFormItems[form.id]);
                                  const isDraftChanged = JSON.stringify(draftConfig) !== JSON.stringify(savedConfig);

                                  return (
                                    <div key={form.id} className="rounded-2xl border border-emerald-200/35 bg-white/45 dark:border-emerald-900/20 dark:bg-slate-950/30">
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
                                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                                <Label htmlFor={`deadline-${form.id}`} className="text-sm">Fecha y hora de vencimiento</Label>
                                                <label className="flex items-center gap-2 text-sm">
                                                  <Checkbox
                                                    checked={draftConfig.dueAt === null}
                                                    onCheckedChange={(val) => {
                                                      setFormDraftValue(form.id, (current) => ({ ...current, dueAt: val ? null : "" }));
                                                    }}
                                                  />
                                                  <span>Sin límite</span>
                                                </label>
                                              </div>
                                              <Input
                                                id={`deadline-${form.id}`}
                                                type="datetime-local"
                                                value={draftConfig.dueAt ?? ""}
                                                onChange={(event) => handleDeadlineChange(form.id, event.target.value)}
                                                disabled={draftConfig.dueAt === null}
                                                className="text-sm"
                                              />
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
                                              disabled={!isDraftChanged || Boolean(savingFormIds[form.id])}
                                              className="w-full sm:w-auto text-sm"
                                            >
                                              {savingFormIds[form.id] ? 'Guardando...' : 'Guardar cambios'}
                                            </Button>
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
    <CardHeader className={`${sectionHeaderClass} p-4 sm:p-6`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <CardTitle className="text-base sm:text-lg">Grupos</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Crear y administrar grupos que aparecerán en los formularios</CardDescription>
        </div>
        <Button onClick={() => setIsCreateGroupOpen(true)} variant="success" className="gap-2 text-sm shrink-0">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Crear grupo
        </Button>
      </div>
    </CardHeader>
    <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0 sm:pt-0">
      {/* Lista de grupos - Mejorado para móvil */}
      <div className={softPanelClass}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-medium text-slate-900 dark:text-slate-100 text-sm sm:text-base">Grupos creados</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {selectedPlanGroups.length} {selectedPlanGroups.length === 1 ? "grupo" : "grupos"} en {selectedPlanCareerGroups.length} {selectedPlanCareerGroups.length === 1 ? "carrera" : "carreras"} · {groupViewPlan === "nuevo-modelo" ? "Plan Nuevo Modelo" : "Plan Normal"}
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto md:items-center">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={groupSearch}
                onChange={(event) => setGroupSearch(event.target.value)}
                placeholder="Buscar grupo"
                className="pl-9 text-sm"
              />
            </div>
            <Select value={groupViewPlan} onValueChange={(value) => setGroupViewPlan(value as "nuevo-modelo" | "plan-normal")}>
              <SelectTrigger className="w-full sm:w-64 text-sm">
                <SelectValue placeholder="Ver plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nuevo-modelo">Plan Nuevo Modelo</SelectItem>
                <SelectItem value="plan-normal">Plan Normal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* CONTENEDOR CON SCROLL PARA GRUPOS - Ajustado para móvil */}
        <div className="mt-4 space-y-4 max-h-[400px] sm:max-h-[500px] overflow-y-auto pr-1 sm:pr-2 scrollbar-thin scrollbar-thumb-emerald-500/20 scrollbar-track-transparent hover:scrollbar-thumb-emerald-500/40">
          {filteredGroups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-emerald-200/45 bg-white/40 px-4 py-6 text-sm text-slate-500 dark:border-emerald-900/25 dark:bg-slate-950/35">
              No hay grupos que coincidan con la búsqueda.
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-emerald-200/40 bg-white/45 p-3 sm:p-4 dark:border-emerald-900/25 dark:bg-slate-950/35">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-3 dark:border-slate-800">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
                      {groupViewPlan === "nuevo-modelo" ? "Plan Nuevo Modelo" : "Plan Normal"}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{selectedPlanGroups.length} grupos en este plan</p>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{selectedPlanCareerGroups.length} carreras con grupos</p>
                </div>

                {/* CONTENEDOR INTERNO CON SCROLL PARA LAS CARRERAS - Ajustado para móvil */}
                <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3 max-h-[300px] sm:max-h-[400px] overflow-y-auto pr-1 sm:pr-2 scrollbar-thin scrollbar-thumb-emerald-500/20 scrollbar-track-transparent hover:scrollbar-thumb-emerald-500/40">
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
                          className="w-full flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 text-left"
                          aria-expanded={openCareer === career.codigo}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100">{career.nombre}</p>
                            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">{career.codigo} · {careerGroups.length} grupos creados</p>
                          </div>
                          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            {careerGroups.length}
                          </span>
                        </button>

                        {openCareer === career.codigo && (
                          <div className="space-y-2 border-t border-emerald-200/35 p-2 sm:p-3 dark:border-emerald-900/20 max-h-[280px] overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-500/20 scrollbar-track-transparent">
                            {careerGroups.map((g) => (
                              <div key={g.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 rounded-2xl border border-emerald-200/35 bg-white/40 px-3 sm:px-4 py-2 sm:py-3 dark:border-emerald-900/20 dark:bg-slate-950/30">
                                <div className="min-w-0 flex-1 text-sm text-slate-700 dark:text-slate-200">
                                  <p className="truncate font-medium text-xs sm:text-sm">{g.name}</p>
                                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Cuatrimestre {g.cuatrimestre} · Grupo {g.groupNumber}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleStartEditGroup(g)}
                                    disabled={Boolean(editingGroupId)}
                                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-full border-emerald-200/60 bg-white/60 text-slate-700 hover:bg-emerald-50 hover:text-slate-900 dark:border-emerald-900/30 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-900"
                                    aria-label={`Editar grupo ${g.name}`}
                                    title="Editar grupo"
                                  >
                                    <PencilLine className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveGroup(g.id)}
                                    disabled={Boolean(editingGroupId)}
                                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-full text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 dark:text-rose-400 dark:hover:bg-rose-500/10"
                                    aria-label={`Eliminar grupo ${g.name}`}
                                    title="Eliminar grupo"
                                  >
                                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />
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
                      {number}
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
              disabled={isEditingGroupDirty}
              className="w-full sm:w-auto text-sm"
            >
              Cerrar
            </Button>
            <Button
              variant="success"
              onClick={handleSaveGroupEdit}
              disabled={!editingGroupId || !editingGroupCareerCode.trim() || !editingGroupCuatrimestre}
              className="w-full sm:w-auto text-sm"
            >
              Guardar cambios
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
                      {number}
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
              onClick={() => setIsCreateGroupOpen(false)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative z-10 flex flex-col items-center gap-3 rounded-lg bg-white/90 p-6 shadow-lg dark:bg-slate-900/90 max-w-[90vw]">
            <svg className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-emerald-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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