import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Checkbox } from "../../components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { ResponsiveActionButton } from "../../components/ResponsiveActionButton";
import { UserPlus, Search, Edit, Key, UserCheck, UserX, ShieldAlert, Mail, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useResolvedAvatarUrl } from "../../lib/avatar";

const defaultAvatar = new URL("../../../assets/perfil2.png", import.meta.url).href;

type UserRole = "docente" | "tutor" | "administrador";
type StatusFilter = "all" | "activo" | "inactivo";

type Docente = {
  id: number;
  nombre: string;
  area?: string;
  apellidos?: string;
  telefono?: string;
  email: string;
  roles?: UserRole[];
  documentos: number;
  status: "activo" | "inactivo";
  avatar: string;
};

type NuevoUsuarioForm = {
  nombres: string;
  apellidos: string;
  telefono: string;
  email: string;
  roles: { docente: boolean; tutor: boolean; administrador: boolean };
};

const DEFAULT_PASSWORD = "12345678";

type ApiUserRole = string | { code?: string | null; name?: string | null };

type ApiUser = {
  id: number | string;
  full_name: string;
  email: string;
  phone?: string | null;
  area?: string | null;
  avatar_url?: string | null;
  is_active?: number | boolean;
  documents_count?: number | string | null;
  roles?: ApiUserRole[];
};

type UsersResponse = {
  data: ApiUser[];
};

const normalizeRole = (role: ApiUserRole): UserRole | null => {
  const token = typeof role === "string" ? role : role.code ?? role.name ?? "";
  const normalized = token.toLowerCase().trim();

  if (normalized.includes("admin")) return "administrador";
  if (normalized.includes("tutor")) return "tutor";
  if (normalized.includes("docente") || normalized.includes("teacher")) return "docente";
  return null;
};

const getInitials = (fullName: string) => {
  const initials = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "ND";
};

const splitFullName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { nombres: fullName.trim(), apellidos: "" };
  }

  return {
    nombres: parts.slice(0, -1).join(" "),
    apellidos: parts.slice(-1).join(" "),
  };
};

function DocenteAvatar({ name, avatar, className }: Readonly<{ name: string; avatar: string; className?: string }>) {
  const resolvedAvatar = useResolvedAvatarUrl(avatar);

  return (
    <Avatar className={className}>
      {resolvedAvatar ? <AvatarImage src={resolvedAvatar} alt={name} className="h-full w-full object-cover" /> : null}
      <AvatarFallback className="bg-success/10 text-success">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

const mapApiUser = (user: ApiUser): Docente => {
  const roles = (user.roles ?? [])
    .map(normalizeRole)
    .filter((role): role is UserRole => role !== null);
  const avatarUrl = user.avatar_url && user.avatar_url !== "/api/default-avatar"
    ? user.avatar_url
    : defaultAvatar;

  return {
    id: Number(user.id),
    nombre: user.full_name,
    area: user.area ?? undefined,
    telefono: user.phone ?? undefined,
    email: user.email,
    roles,
    documentos: Number(user.documents_count ?? 0),
    status: user.is_active ? "activo" : "inactivo",
    avatar: avatarUrl,
  };
};

type StatusConfirmationDialogProps = {
  open: boolean;
  selectedDocente: Docente | null;
  statusConfirmationEmail: string;
  onOpenChange: (open: boolean) => void;
  onEmailChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  isChangingStatus: boolean;
};

function StatusConfirmationDialog({
  open,
  selectedDocente,
  statusConfirmationEmail,
  onOpenChange,
  onEmailChange,
  onCancel,
  onConfirm,
  isChangingStatus,
}: Readonly<StatusConfirmationDialogProps>) {
  const isDeactivating = selectedDocente?.status === "activo";
  let buttonLabel = "Confirmar alta";
  if (isChangingStatus) {
    buttonLabel = "Procesando...";
  } else if (isDeactivating) {
    buttonLabel = "Confirmar baja";
  }
  const buttonVariant = isDeactivating ? "destructive" : "success";
  const canConfirm = !isChangingStatus && (!isDeactivating || statusConfirmationEmail.trim().toLowerCase() === selectedDocente?.email.trim().toLowerCase());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isDeactivating ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <DialogTitle>
                {isDeactivating ? "Confirmar baja del docente" : "Confirmar alta del docente"}
              </DialogTitle>
              <DialogDescription>
                Esta acción requiere confirmación adicional por seguridad.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        {selectedDocente && (
          <div className={`rounded-2xl border p-4 text-sm shadow-sm ${isDeactivating ? "border-destructive/15 bg-destructive/5" : "border-success/15 bg-success/5"}`}>
            <div className="flex items-center gap-3">
              <DocenteAvatar name={selectedDocente.nombre} avatar={selectedDocente.avatar} className="h-10 w-10" />
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">{selectedDocente.nombre}</p>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="truncate">{selectedDocente.email}</span>
                </div>
              </div>
            </div>
            <p className="mt-3 text-sm text-foreground/80">
              {isDeactivating
                ? "Para continuar con la baja, escribe el correo exacto del docente en el campo inferior."
                : "Esta acción reactivará el acceso del usuario en la API."}
            </p>
            {isDeactivating && (
              <div className="space-y-2 pt-4">
                <Label className="text-sm font-medium">Escribe el correo electrónico exacto para confirmar la baja</Label>
                <Input
                  type="email"
                  value={statusConfirmationEmail}
                  onChange={(e) => onEmailChange(e.target.value)}
                  placeholder={selectedDocente.email}
                  autoComplete="off"
                  spellCheck={false}
                  className="bg-background/80"
                />
                <p className="text-xs text-muted-foreground">Debe coincidir carácter por carácter con el correo mostrado arriba.</p>
              </div>
            )}
          </div>
        )}
        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={onCancel} disabled={isChangingStatus} className="sm:min-w-28">
            Cancelar
          </Button>
          <Button
            variant={buttonVariant}
            onClick={onConfirm}
            className="sm:min-w-40"
            disabled={!canConfirm}
          >
            {buttonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const initialDocentes: Docente[] = [
];

const initialForm: NuevoUsuarioForm = {
  nombres: "",
  apellidos: "",
  telefono: "",
  email: "",
  roles: { docente: true, tutor: false, administrador: false },
};

export function DocenteManagement() {
  const { user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [statusConfirmationEmail, setStatusConfirmationEmail] = useState("");
  const [docentes, setDocentes] = useState(initialDocentes);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [newDocente, setNewDocente] = useState<NuevoUsuarioForm>(initialForm);
  const [selectedDocente, setSelectedDocente] = useState<Docente | null>(null);
  const [editDocente, setEditDocente] = useState({ nombres: "", apellidos: "", telefono: "", email: "", roles: { docente: true, tutor: false, administrador: false } });

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    setUsersError(null);

    try {
      const payload = (await apiFetch("/users", { method: "GET" })) as UsersResponse;
      // Exclude administrator users from the general management list
      const filtered = (payload.data ?? []).filter((u) => {
        const roles = u.roles ?? [];
        return !roles.map(normalizeRole).includes("administrador");
      });

      setDocentes(filtered.map(mapApiUser));
    } catch (error: any) {
      const message = error instanceof Error ? error.message : "No fue posible cargar los usuarios";
      setUsersError(message);
      toast.error(message);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const resetForm = () => {
    setNewDocente(initialForm);
  };

  const sanitizePhone = (value: string) => value.replace(/\D/g, "").slice(0, 10);

  const resetEditForm = () => {
    setSelectedDocente(null);
    setEditDocente({ nombres: "", apellidos: "", telefono: "", email: "", roles: { docente: true, tutor: false, administrador: false } });
  };

  const filteredDocentes = docentes.filter((doc) => {
    const matchesSearch =
      doc.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.roles ?? []).join(", ").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const statusFilterLabelMap: Record<StatusFilter, string> = {
    all: "Todos",
    activo: "Activos",
    inactivo: "Inactivos",
  };

  const handleStatusFilterChange = (value: string) => {
    if (value === "all" || value === "activo" || value === "inactivo") {
      setStatusFilter(value);
    }
  };

  let usersListContent: React.ReactNode;

  if (isLoadingUsers) {
    usersListContent = (
      <div className="rounded-xl border border-dashed border-border bg-background/80 p-8 text-center text-sm text-muted-foreground">
        Cargando...
      </div>
    );
  } else if (usersError) {
    usersListContent = (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">
        {usersError}
      </div>
    );
  } else if (filteredDocentes.length === 0) {
    let emptyMessage = "No hay usuarios que coincidan con los filtros seleccionados.";
    if (statusFilter === "activo") {
      emptyMessage = "No hay docentes activos que coincidan con la búsqueda actual.";
    }

    usersListContent = (
      <div className="rounded-xl border border-dashed border-border bg-background/80 p-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  } else {
    usersListContent = filteredDocentes.map((docente) => {
      const isActive = docente.status === "activo";
      const statusBadgeVariant = isActive ? "success" : "outline";
      const statusLabel = isActive ? "Activo" : "Inactivo";
      const statusActionLabel = isActive ? "Dar baja" : "Dar alta";
      const statusActionIcon = isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />;

      return (
        <div
          key={docente.id}
          className="flex flex-col gap-4 overflow-hidden rounded-xl border border-border/70 bg-background/80 p-4 transition-colors hover:bg-accent/60 dark:bg-slate-950/60 dark:hover:bg-slate-900/70 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <DocenteAvatar name={docente.nombre} avatar={docente.avatar} className="h-12 w-12 flex-shrink-0" />
            <div className="min-w-0">
              <p className="break-words font-medium sm:truncate">{docente.nombre}</p>
              <p className="break-words text-sm text-muted-foreground sm:truncate">{docente.email}</p>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="truncate">{docente.documentos} documentos enviados</span>
                <span className="truncate">{(docente.roles || []).join(", ")}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            <Badge variant={statusBadgeVariant} className="shrink-0">
              {statusLabel}
            </Badge>
            <ResponsiveActionButton
              variant="ghost"
              label="Editar"
              title="Editar"
              onClick={() => openEditDialog(docente)}
              disabled={String(docente.id) === currentUser?.id}
              icon={<Edit className="h-4 w-4" />}
            />
            <ResponsiveActionButton
              variant="ghost"
              label="Restablecer"
              title="Restablecer contraseña"
              onClick={() => openResetDialog(docente)}
              disabled={String(docente.id) === currentUser?.id}
              icon={<Key className="h-4 w-4" />}
            />
            <ResponsiveActionButton
              variant="ghost"
              label={statusActionLabel}
              title="Cambiar estado"
              onClick={() => openStatusDialog(docente)}
              disabled={String(docente.id) === currentUser?.id}
              icon={statusActionIcon}
            />
          </div>
        </div>
      );
    });
  }

  const openEditDialog = (docente: Docente) => {
    setSelectedDocente(docente);
    setEditDocente({
      nombres: splitFullName(docente.nombre).nombres,
      apellidos: docente.apellidos ?? splitFullName(docente.nombre).apellidos,
      telefono: docente.telefono ?? "",
      email: docente.email,
      roles: {
        docente: (docente.roles || []).includes("docente"),
        tutor: (docente.roles || []).includes("tutor"),
        administrador: (docente.roles || []).includes("administrador"),
      },
    });
    setShowEditDialog(true);
  };

  const openResetDialog = (docente: Docente) => {
    setSelectedDocente(docente);
    setShowResetDialog(true);
  };

  const openStatusDialog = (docente: Docente) => {
    setSelectedDocente(docente);
    setStatusConfirmationEmail("");
    setShowStatusDialog(true);
  };

  const confirmToggleStatus = async () => {
    if (!selectedDocente) return;

    if (selectedDocente.status === "activo" && statusConfirmationEmail.trim().toLowerCase() !== selectedDocente.email.trim().toLowerCase()) {
      toast.error("Debes escribir el correo exacto del docente para confirmar la baja");
      return;
    }

    setIsChangingStatus(true);
    const toastId = toast.loading(selectedDocente.status === "activo" ? "Dando de baja..." : "Dando de alta...");

    try {
      if (selectedDocente.status === "activo") {
        await apiFetch(`/users/${selectedDocente.id}`, { method: "DELETE" });
        toast.success("Usuario dado de baja correctamente", { id: toastId, description: selectedDocente.nombre });
      } else {
        await apiFetch(`/users/${selectedDocente.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: true }),
        });
        toast.success("Usuario dado de alta correctamente", { id: toastId, description: selectedDocente.nombre });
      }

      await loadUsers();
      setShowStatusDialog(false);
      setSelectedDocente(null);
      setStatusConfirmationEmail("");
    } catch (error: any) {
      toast.error(error instanceof Error ? error.message : "No fue posible cambiar el estado", { id: toastId });
    } finally {
      setIsChangingStatus(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedDocente) return;

    if (!editDocente.nombres.trim() || !editDocente.apellidos.trim() || !editDocente.email.trim()) {
      toast.error("Los nombres, apellidos y el correo son obligatorios");
      return;
    }

    if (!editDocente.roles || (!editDocente.roles.docente && !editDocente.roles.tutor)) {
      toast.error("El usuario debe tener al menos un rol asignado (Docente o Tutor)");
      return;
    }

    const roles: UserRole[] = [
      ...(editDocente.roles.docente ? (["docente"] as UserRole[]) : []),
      ...(editDocente.roles.tutor ? (["tutor"] as UserRole[]) : []),
      ...(editDocente.roles.administrador ? (["administrador"] as UserRole[]) : []),
    ];

    setIsSavingEdit(true);
    const toastId = toast.loading("Guardando cambios...");

    try {
      await apiFetch(`/users/${selectedDocente.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: `${editDocente.nombres.trim()} ${editDocente.apellidos.trim()}`.trim(),
          email: editDocente.email.trim(),
          phone: editDocente.telefono.trim() || null,
          roles,
        }),
      });

      toast.success("Usuario actualizado correctamente", { id: toastId });
      await loadUsers();
      setShowEditDialog(false);
      resetEditForm();
    } catch (error: any) {
      toast.error(error instanceof Error ? error.message : "No fue posible actualizar el usuario", { id: toastId });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedDocente) return;

    setIsResettingPassword(true);
    const toastId = toast.loading("Generando contraseña temporal...");

    try {
      await apiFetch(`/users/${selectedDocente.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: DEFAULT_PASSWORD }),
      });

      toast.success("Contraseña restablecida", {
        id: toastId,
        description: `${selectedDocente.nombre}. Contraseña temporal: ${DEFAULT_PASSWORD}`,
      });
      setShowResetDialog(false);
      resetEditForm();
    } catch (error: any) {
      toast.error(error instanceof Error ? error.message : "No fue posible restablecer la contraseña", { id: toastId });
    } finally {
      setIsResettingPassword(false);
    }
  };

  const hasRole = Boolean(newDocente.roles && (newDocente.roles.docente || newDocente.roles.tutor || newDocente.roles.administrador));
  const canCreate = Boolean(newDocente.nombres.trim() && newDocente.apellidos.trim() && newDocente.email.trim() && hasRole);

  const handleCreateDocente = async () => {
    if (!newDocente.nombres.trim() || !newDocente.apellidos.trim()) {
      toast.error("Los nombres y apellidos son obligatorios");
      return;
    }

    if (!newDocente.email.trim()) {
      toast.error("El correo electrónico es obligatorio");
      return;
    }

    if (!hasRole) {
      toast.error("Debes seleccionar al menos un rol");
      return;
    }

    setIsCreating(true);
    const toastId = toast.loading("Creando usuario...");

    const roles: UserRole[] = [
      ...(newDocente.roles.docente ? (["docente"] as UserRole[]) : []),
      ...(newDocente.roles.tutor ? (["tutor"] as UserRole[]) : []),
      ...(newDocente.roles.administrador ? (["administrador"] as UserRole[]) : []),
    ];

    try {
      await apiFetch("/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: `${newDocente.nombres.trim()} ${newDocente.apellidos.trim()}`.trim(),
          email: newDocente.email.trim(),
          phone: newDocente.telefono.trim() || null,
          roles,
          password: DEFAULT_PASSWORD,
          is_active: true,
        }),
      });

      toast.success("Usuario creado correctamente", {
        id: toastId,
        description: `Contraseña temporal: ${DEFAULT_PASSWORD}`,
      });
      await loadUsers();
      setShowNewDialog(false);
      resetForm();
    } catch (error: any) {
      toast.error(error instanceof Error ? error.message : "No fue posible crear el usuario", { id: toastId });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="relative space-y-6 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-20 right-10 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl dark:bg-emerald-500/10" />
        <div className="absolute top-28 left-6 h-px w-36 rotate-12 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
        <div className="absolute bottom-16 right-24 h-2 w-2 rounded-full bg-emerald-500/40" />
        <div className="absolute top-36 left-1/2 grid grid-cols-4 gap-2 opacity-30">
          {Array.from({ length: 12 }, (_, index) => (
            <span key={index} className="h-1.5 w-1.5 rounded-full bg-emerald-400/50" />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="bg-gradient-to-r from-emerald-700 via-slate-900 to-emerald-600 bg-clip-text text-transparent dark:from-emerald-300 dark:via-white dark:to-emerald-300">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">
            Administra usuarios y permisos del sistema
          </p>
        </div>
        <Button variant="success" onClick={() => setShowNewDialog(true)} className="shadow-md shadow-emerald-500/20">
          <UserPlus className="h-4 w-4 mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      <Card className="overflow-hidden border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/50 to-emerald-50/60 shadow-sm dark:border-emerald-900/50 dark:from-slate-950 dark:via-emerald-950/15 dark:to-emerald-950/20">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Usuarios Registrados</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/75 px-3 py-2 dark:bg-slate-900/65">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Estado:</span>
                <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                  <SelectTrigger className="h-8 w-[140px] border-0 bg-transparent px-2 text-sm shadow-none focus:ring-0">
                    <SelectValue placeholder="Filtrar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="activo">Activos</SelectItem>
                    <SelectItem value="inactivo">Inactivos</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant="outline" className="hidden sm:inline-flex">
                  {statusFilterLabelMap[statusFilter]}
                </Badge>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuario..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-background/90 dark:bg-slate-900/85"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {usersListContent}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showEditDialog} onOpenChange={(open) => {
        setShowEditDialog(open);
        if (!open) {
          resetEditForm();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Docente</DialogTitle>
            <DialogDescription>
              Ajusta los datos del usuario directamente sobre la API.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nombres (obligatorio)</Label>
                <Input
                  value={editDocente.nombres}
                  onChange={(e) => setEditDocente((current) => ({ ...current, nombres: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Apellidos (obligatorio)</Label>
                <Input
                  value={editDocente.apellidos}
                  onChange={(e) => setEditDocente((current) => ({ ...current, apellidos: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Correo electrónico (obligatorio)</Label>
                <Input
                  type="email"
                  value={editDocente.email}
                  onChange={(e) => setEditDocente((current) => ({ ...current, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Número de teléfono (opcional)</Label>
                <Input
                  value={editDocente.telefono}
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  onChange={(e) => setEditDocente((current) => ({ ...current, telefono: sanitizePhone(e.target.value) }))}
                  placeholder="653 123 3445"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Roles</Label>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={!!editDocente.roles?.docente}
                    onCheckedChange={(val) => setEditDocente((current) => ({ ...current, roles: { ...(current.roles ?? { docente: false, tutor: false, administrador: false }), docente: Boolean(val) } }))}
                  />
                  <span className="text-sm">Docente</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={!!editDocente.roles?.tutor}
                    onCheckedChange={(val) => setEditDocente((current) => ({ ...current, roles: { ...(current.roles ?? { docente: false, tutor: false, administrador: false }), tutor: Boolean(val) } }))}
                  />
                  <span className="text-sm">Tutor</span>
                </label>
                {/* Administrador role is managed separately; not editable here */}
              </div>
              <p className="text-xs text-muted-foreground">Selecciona si el usuario será docente o tutor.</p>
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={isSavingEdit}>
              Cancelar
            </Button>
            <Button variant="success" onClick={handleSaveEdit} disabled={isSavingEdit}>
              {isSavingEdit ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showResetDialog} onOpenChange={(open) => {
        setShowResetDialog(open);
        if (!open) {
          resetEditForm();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restablecer Contraseña</DialogTitle>
            <DialogDescription>
              Se restablecerá la contraseña del usuario en la API.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            {selectedDocente ? (
              <>
                El docente <span className="font-medium text-foreground">{selectedDocente.nombre}</span> recibirá una contraseña temporal.
              </>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)} disabled={isResettingPassword}>
              Cancelar
            </Button>
            <Button variant="success" onClick={handleResetPassword} disabled={isResettingPassword}>
              {isResettingPassword ? "Restableciendo..." : "Generar temporal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StatusConfirmationDialog
        open={showStatusDialog}
        selectedDocente={selectedDocente}
        statusConfirmationEmail={statusConfirmationEmail}
        onOpenChange={(open) => {
          setShowStatusDialog(open);
          if (!open) {
            setSelectedDocente(null);
            setStatusConfirmationEmail("");
          }
        }}
        onEmailChange={setStatusConfirmationEmail}
        onCancel={() => setShowStatusDialog(false)}
        onConfirm={confirmToggleStatus}
        isChangingStatus={isChangingStatus}
      />

      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Crea un nuevo usuario en el sistema y asigna sus roles.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nombres (obligatorio) *</Label>
                <Input
                  value={newDocente.nombres}
                  onChange={(e) => setNewDocente((current) => ({ ...current, nombres: e.target.value }))}
                  placeholder="Juan Carlos"
                />
              </div>
              <div className="space-y-2">
                <Label>Apellidos (obligatorio) *</Label>
                <Input
                  value={newDocente.apellidos}
                  onChange={(e) => setNewDocente((current) => ({ ...current, apellidos: e.target.value }))}
                  placeholder="Pérez López"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Teléfono (opcional)</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  value={newDocente.telefono}
                  onChange={(e) => setNewDocente((current) => ({ ...current, telefono: sanitizePhone(e.target.value) }))}
                  placeholder="653 123 3445"
                />
              </div>
              <div className="space-y-2">
                <Label>Correo electrónico (obligatorio) *</Label>
                <Input
                  type="email"
                  value={newDocente.email}
                  onChange={(e) => setNewDocente((current) => ({ ...current, email: e.target.value }))}
                  placeholder="juan.perez@universidad.edu"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Roles</Label>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={!!newDocente.roles?.docente}
                    onCheckedChange={(val) => setNewDocente((current) => ({ ...current, roles: { ...(current.roles ?? { docente: false, tutor: false, administrador: false }), docente: Boolean(val) } }))}
                  />
                  <span className="text-sm">Docente</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={!!newDocente.roles?.tutor}
                    onCheckedChange={(val) => setNewDocente((current) => ({ ...current, roles: { ...(current.roles ?? { docente: false, tutor: false, administrador: false }), tutor: Boolean(val) } }))}
                  />
                  <span className="text-sm">Tutor</span>
                </label>
                {/* Administrador role not available when creating users from this form */}
              </div>
              <p className="text-xs text-muted-foreground">Selecciona si el usuario será docente o tutor.</p>
            </div>
            
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowNewDialog(false);
                resetForm();
              }}
              disabled={isCreating}
            >
              Cancelar
            </Button>
            <Button
              variant="success"
              onClick={handleCreateDocente}
              disabled={!canCreate || isCreating}
            >
              {isCreating ? "Creando..." : "Crear Usuario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DocenteManagement;
