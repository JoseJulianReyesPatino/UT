import React, { useEffect, useMemo, useState } from "react";
import { UserCardSkeleton } from "./skeletons";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Checkbox } from "../../components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { UserPlus, Search, Edit, Key, UserCheck, UserX, Mail, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useResolvedAvatarUrl } from "../../lib/avatar";

const defaultAvatar = new URL("../../../assets/elementos/perfil2.webp", import.meta.url).href;

type UserRole = "docente" | "tutor" | "administrador" | "supervisor";
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
  roles: { docente: boolean; tutor: boolean; administrador: boolean; supervisor: boolean };
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
  if (normalized.includes("supervisor")) return "supervisor";
  if (normalized.includes("tutor")) return "tutor";
  if (normalized.includes("docente") || normalized.includes("teacher")) return "docente";
  return null;
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
      {resolvedAvatar && (
        <AvatarImage src={resolvedAvatar} alt={name} className="h-full w-full object-cover" />
      )}
      <AvatarFallback className="bg-transparent p-0 overflow-hidden">
        <img src={defaultAvatar} alt={name} className="h-full w-full object-cover" />
      </AvatarFallback>
    </Avatar>
  );
}

const toAvatarPath = (url: string): string => {
  if (!url || !url.startsWith("http")) return url;
  try { return new URL(url).pathname; } catch { return url; }
};

const mapApiUser = (user: ApiUser): Docente => {
  const roles = (user.roles ?? [])
    .map(normalizeRole)
    .filter((role): role is UserRole => role !== null);
  const rawAvatar = user.avatar_url && user.avatar_url !== "/api/default-avatar"
    ? user.avatar_url
    : null;
  const avatarUrl = rawAvatar ? toAvatarPath(rawAvatar) : defaultAvatar;

  return {
    id: Number(user.id),
    nombre: user.full_name,
    area: user.area ?? undefined,
    apellidos: user.full_name.split(/\s+/).filter(Boolean).slice(-1).join(" ") || undefined,
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
      <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0">
        <div className={`px-6 pt-6 pb-5 ${isDeactivating ? "bg-destructive/10" : "bg-success/10"}`}>
          <div className="flex items-center gap-3 mb-1.5">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isDeactivating ? "bg-destructive/20 text-destructive" : "bg-success/20 text-success"}`}>
              {isDeactivating ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
            </div>
            <DialogTitle className="text-base font-semibold leading-tight">
              {isDeactivating ? "Dar de baja al docente" : "Dar de alta al docente"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground pl-12 leading-relaxed">
            {isDeactivating
              ? "El docente dejará de tener acceso al sistema hasta que sea dado de alta nuevamente."
              : `Al confirmar, ${selectedDocente?.nombre ?? "el docente"} podrá volver a acceder al sistema con normalidad.`}
          </DialogDescription>
        </div>

        {selectedDocente && (
          <div className="px-6 py-5 border-y border-border/60">
            <div className="flex items-center gap-3.5">
              <DocenteAvatar name={selectedDocente.nombre} avatar={selectedDocente.avatar} className="h-11 w-11 shrink-0 ring-2 ring-border/40" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-foreground truncate">{selectedDocente.nombre}</p>
                <div className="flex items-center gap-1.5 mt-0.5 text-muted-foreground">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="text-xs truncate">{selectedDocente.email}</span>
                </div>
              </div>
              <span className={`shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full border ${isDeactivating ? "border-success/40 text-success bg-success/10" : "border-destructive/40 text-destructive bg-destructive/10"}`}>
                {isDeactivating ? "Activo" : "Inactivo"}
              </span>
            </div>

            {isDeactivating && (
              <div className="mt-4 space-y-2">
                <Label className="text-xs font-medium text-foreground/80">
                  Escribe el correo exacto para confirmar la baja
                </Label>
                <Input
                  type="email"
                  value={statusConfirmationEmail}
                  onChange={(e) => onEmailChange(e.target.value)}
                  placeholder={selectedDocente.email}
                  autoComplete="off"
                  spellCheck={false}
                  className="h-9 bg-background text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Debe coincidir carácter por carácter con el correo mostrado arriba.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="px-6 py-4 flex items-center justify-end gap-2.5">
          <Button variant="ghost" onClick={onCancel} disabled={isChangingStatus} className="h-9 px-4 text-sm">
            Cancelar
          </Button>
          <Button
            variant={buttonVariant}
            onClick={onConfirm}
            className="h-9 px-5 text-sm min-w-36"
            disabled={!canConfirm}
          >
            {buttonLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const initialDocentes: Docente[] = [];

const initialForm: NuevoUsuarioForm = {
  nombres: "",
  apellidos: "",
  telefono: "",
  email: "",
  roles: { docente: true, tutor: false, administrador: false, supervisor: false },
};

export function DocenteManagement({ layoutStyle }: { layoutStyle?: string } = {}) {
  const isFormal = layoutStyle === "formal";
  const { user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [statusConfirmationEmail, setStatusConfirmationEmail] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [docentes, setDocentes] = useState(initialDocentes);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [newDocente, setNewDocente] = useState<NuevoUsuarioForm>(initialForm);
  const [selectedDocente, setSelectedDocente] = useState<Docente | null>(null);
  const [editDocente, setEditDocente] = useState({ nombres: "", apellidos: "", telefono: "", email: "", roles: { docente: true, tutor: false, administrador: false, supervisor: false } });

  // Placeholder animado
  const searchPlaceholders = [
    "Buscar por nombre...",
    "Buscar por correo...",
    "Buscar por rol: docente, tutor, supervisor...",
    "Buscar por estado: activo, inactivo...",
  ];
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    if (searchTerm) return;
    const interval = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % searchPlaceholders.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [searchTerm]);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    setUsersError(null);

    try {
      const payload = (await apiFetch("/users", { method: "GET" })) as UsersResponse;
      const filtered = (payload.data ?? []).filter((u) => {
        const roles = u.roles ?? [];
        const isAdmin = roles.map(normalizeRole).includes("administrador");
        const isDeleted = (u.full_name ?? "").startsWith("Usuario eliminado");
        return !isAdmin && !isDeleted;
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const resetForm = () => {
    setNewDocente(initialForm);
  };

  const sanitizePhone = (value: string) => value.replace(/\D/g, "").slice(0, 10);

  const resetEditForm = () => {
    setSelectedDocente(null);
    setEditDocente({ nombres: "", apellidos: "", telefono: "", email: "", roles: { docente: true, tutor: false, administrador: false, supervisor: false } });
  };

  const filteredDocentes = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return docentes;

    return docentes.filter((doc) => {
      const statusLabel = doc.status === "activo" ? "activo" : "inactivo";
      return (
        doc.nombre.toLowerCase().includes(term) ||
        doc.email.toLowerCase().includes(term) ||
        (doc.roles ?? []).join(" ").toLowerCase().includes(term) ||
        statusLabel.includes(term)
      );
    });
  }, [docentes, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredDocentes.length / ITEMS_PER_PAGE));

  const paginatedDocentes = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredDocentes.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredDocentes, currentPage]);

  const getPageNumbers = (): (number | "ellipsis")[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | "ellipsis")[] = [1];
    if (currentPage > 3) pages.push("ellipsis");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("ellipsis");
    pages.push(totalPages);
    return pages;
  };

  let usersListContent: React.ReactNode;

  if (isLoadingUsers) {
    usersListContent = <UserCardSkeleton />;
  } else if (usersError) {
    usersListContent = (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">
        {usersError}
      </div>
    );
  } else if (filteredDocentes.length === 0) {
    usersListContent = (
      <div className="rounded-xl border border-dashed border-border bg-background/80 p-8 text-center text-sm text-muted-foreground">
        No hay usuarios que coincidan con "{searchTerm}".
      </div>
    );
  } else {
    usersListContent = paginatedDocentes.map((docente) => {
      const isActive = docente.status === "activo";
      const statusBadgeVariant = isActive ? "success" : "outline";
      const statusLabel = isActive ? "Activo" : "Inactivo";
      const statusActionLabel = isActive ? "Dar baja" : "Dar alta";
      const statusActionIcon = isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />;
      const roleLabel = (docente.roles || []).join(", ") || "Sin rol";
      const isSelf = String(docente.id) === currentUser?.id;

      const actionButtons = (
        <div className="flex flex-shrink-0 items-center gap-1 sm:justify-end">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => openEditDialog(docente)}
                disabled={isSelf}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Editar</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => openResetDialog(docente)}
                disabled={isSelf}
              >
                <Key className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Restablecer contraseña</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 text-muted-foreground ${isActive ? "hover:text-destructive" : "hover:text-success"}`}
                onClick={() => openStatusDialog(docente)}
                disabled={isSelf}
              >
                {statusActionIcon}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{statusActionLabel}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => openDeleteDialog(docente)}
                disabled={isSelf}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Eliminar usuario</TooltipContent>
          </Tooltip>
        </div>
      );

      return (
        <div
          key={docente.id}
          data-tour={docente.id === paginatedDocentes[0]?.id ? "admin-docentes-user-card" : undefined}
          data-component="user-row"
          className="grid grid-cols-1 items-center gap-2 bg-white px-4 py-2.5 transition-colors hover:bg-slate-50 dark:bg-slate-950/40 dark:hover:bg-slate-900/60 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_100px_120px_90px_148px] sm:gap-4"
        >
          <div className="flex min-w-0 items-center gap-3">
            <DocenteAvatar name={docente.nombre} avatar={docente.avatar} className="h-9 w-9 flex-shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{docente.nombre}</p>
              <p className="truncate text-xs text-muted-foreground sm:hidden">{docente.email}</p>
            </div>
          </div>

          <div className="hidden truncate text-sm text-muted-foreground sm:block">
            {docente.email}
          </div>

          <div className="hidden text-sm text-muted-foreground sm:block">
            {docente.documentos} {docente.documentos === 1 ? "documento" : "documentos"}
          </div>

          <div className="hidden sm:block">
            <span className="inline-flex max-w-full items-center truncate rounded-md bg-slate-100 px-2 py-1 text-xs font-medium capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {roleLabel}
            </span>
          </div>

          <div className="hidden sm:flex">
            <Badge variant={statusBadgeVariant} className="shrink-0">{statusLabel}</Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:hidden">
            <Badge variant={statusBadgeVariant} className="shrink-0">{statusLabel}</Badge>
            <span className="capitalize">{roleLabel}</span>
            <span>·</span>
            <span>{docente.documentos} {docente.documentos === 1 ? "documento" : "documentos"}</span>
          </div>

          {actionButtons}
        </div>
      );
    });
  }

  let formalListContent: React.ReactNode;
  if (isLoadingUsers) {
    formalListContent = Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 px-4 py-3">
        <div className="animate-pulse h-3 w-36 rounded bg-muted" />
        <div className="animate-pulse h-3 w-44 rounded bg-muted" />
        <div className="animate-pulse h-3 w-12 rounded bg-muted" />
        <div className="animate-pulse h-3 w-16 rounded bg-muted" />
        <div className="animate-pulse h-3 w-12 rounded bg-muted" />
      </div>
    ));
  } else if (usersError) {
    formalListContent = (
      <div className="p-6 text-sm text-destructive">{usersError}</div>
    );
  } else if (filteredDocentes.length === 0) {
    formalListContent = (
      <div className="p-8 text-center text-sm text-muted-foreground">
        No hay usuarios que coincidan con &ldquo;{searchTerm}&rdquo;.
      </div>
    );
  } else {
    formalListContent = paginatedDocentes.map((docente) => {
      const isActive = docente.status === "activo";
      const roleLabel = (docente.roles || []).join(", ") || "Sin rol";
      const isSelf = String(docente.id) === currentUser?.id;
      return (
        <div key={docente.id} className="transition-colors hover:bg-muted/30 dark:hover:bg-slate-900/40">
          {/* Vista móvil */}
          <div className="flex items-center gap-3 px-3 py-2.5 sm:hidden">
            <span className={`h-10 w-1 shrink-0 self-stretch rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />
            <DocenteAvatar name={docente.nombre} avatar={docente.avatar} className="h-8 w-8 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-foreground">{docente.nombre}</p>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm text-muted-foreground hover:text-foreground" onClick={() => openEditDialog(docente)} disabled={isSelf}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Editar</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm text-muted-foreground hover:text-foreground" onClick={() => openResetDialog(docente)} disabled={isSelf}>
                        <Key className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Restablecer contraseña</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className={`h-7 w-7 rounded-sm text-muted-foreground ${isActive ? "hover:text-destructive" : "hover:text-success"}`} onClick={() => openStatusDialog(docente)} disabled={isSelf}>
                        {isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isActive ? "Dar baja" : "Dar alta"}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm text-muted-foreground hover:text-destructive" onClick={() => openDeleteDialog(docente)} disabled={isSelf}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Eliminar usuario</TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <span className="max-w-[140px] truncate text-xs text-muted-foreground">{docente.email}</span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="inline-flex items-center rounded-sm bg-slate-100 px-1 py-0.5 text-[10px] font-semibold capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">{roleLabel}</span>
                <span className={`inline-flex items-center rounded-sm px-1 py-0.5 text-[10px] font-semibold ${isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
                  {isActive ? "Activo" : "Inactivo"}
                </span>
              </div>
            </div>
          </div>
          {/* Vista desktop */}
          <div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_90px_110px_80px_120px] sm:items-center sm:gap-4 sm:px-4 sm:py-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={`h-5 w-1 shrink-0 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />
              <DocenteAvatar name={docente.nombre} avatar={docente.avatar} className="h-7 w-7 shrink-0" />
              <p className="truncate text-sm font-medium text-foreground">{docente.nombre}</p>
            </div>
            <div className="truncate text-sm text-muted-foreground">{docente.email}</div>
            <div className="text-sm text-muted-foreground">{docente.documentos} {docente.documentos === 1 ? "doc." : "docs."}</div>
            <div>
              <span className="inline-flex items-center rounded-sm bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {roleLabel}
              </span>
            </div>
            <div>
              <span className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-semibold ${isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
                {isActive ? "Activo" : "Inactivo"}
              </span>
            </div>
            <div className="flex items-center justify-end gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm text-muted-foreground hover:text-foreground" onClick={() => openEditDialog(docente)} disabled={isSelf}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Editar</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm text-muted-foreground hover:text-foreground" onClick={() => openResetDialog(docente)} disabled={isSelf}>
                    <Key className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Restablecer contraseña</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className={`h-7 w-7 rounded-sm text-muted-foreground ${isActive ? "hover:text-destructive" : "hover:text-success"}`} onClick={() => openStatusDialog(docente)} disabled={isSelf}>
                    {isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isActive ? "Dar baja" : "Dar alta"}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm text-muted-foreground hover:text-destructive" onClick={() => openDeleteDialog(docente)} disabled={isSelf}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Eliminar usuario</TooltipContent>
              </Tooltip>
            </div>
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
        supervisor: (docente.roles || []).includes("supervisor"),
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

  const openDeleteDialog = (docente: Docente) => {
    setSelectedDocente(docente);
    setDeleteConfirmEmail("");
    setShowDeleteDialog(true);
  };

  const handleForceDelete = async () => {
    if (!selectedDocente) return;
    if (deleteConfirmEmail.trim().toLowerCase() !== selectedDocente.email.trim().toLowerCase()) {
      toast.error("Debes escribir el correo exacto para confirmar la eliminación");
      return;
    }
    setIsDeleting(true);
    const toastId = toast.loading("Eliminando usuario...");
    try {
      await apiFetch(`/users/${selectedDocente.id}/force-delete`, { method: "DELETE" });
      toast.success("Usuario eliminado", { id: toastId, description: `${selectedDocente.nombre} fue eliminado del sistema. Sus documentos permanecen.` });
      await loadUsers();
      setShowDeleteDialog(false);
      setSelectedDocente(null);
      setDeleteConfirmEmail("");
    } catch (error: any) {
      toast.error(error instanceof Error ? error.message : "No fue posible eliminar el usuario", { id: toastId });
    } finally {
      setIsDeleting(false);
    }
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

    if (!editDocente.roles || (!editDocente.roles.docente && !editDocente.roles.tutor && !editDocente.roles.supervisor)) {
      toast.error("El usuario debe tener al menos un rol asignado (Docente, Tutor o Supervisor)");
      return;
    }

    const roles: UserRole[] = [
      ...(editDocente.roles.docente ? (["docente"] as UserRole[]) : []),
      ...(editDocente.roles.tutor ? (["tutor"] as UserRole[]) : []),
      ...(editDocente.roles.supervisor ? (["supervisor"] as UserRole[]) : []),
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
        description: `Se asignó una contraseña temporal a ${selectedDocente.nombre}.`,
      });
      setShowResetDialog(false);
      resetEditForm();
    } catch (error: any) {
      toast.error(error instanceof Error ? error.message : "No fue posible restablecer la contraseña", { id: toastId });
    } finally {
      setIsResettingPassword(false);
    }
  };

  const hasRole = Boolean(newDocente.roles && (newDocente.roles.docente || newDocente.roles.tutor || newDocente.roles.administrador || newDocente.roles.supervisor));
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
      ...(newDocente.roles.supervisor ? (["supervisor"] as UserRole[]) : []),
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
    <>
      {isFormal ? (
        /* ── Modo empresarial ── */
        <div className="flex h-[calc(100vh-64px)] flex-col overflow-hidden bg-card text-foreground dark:bg-slate-950">
          {/* Encabezado plano */}
          <div className="shrink-0 border-b border-border bg-card px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Gestión de Usuarios</h1>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Administra usuarios y permisos del sistema.</p>
              </div>
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-800 dark:text-slate-300" strokeWidth={2.25} />
                  <Input
                    placeholder={searchPlaceholders[placeholderIndex]}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="rounded-sm pl-9 text-sm dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
                <Button
                  data-tour="admin-docentes-new-btn"
                  variant="success"
                  size="sm"
                  onClick={() => setShowNewDialog(true)}
                  className="shrink-0 gap-1.5 rounded-sm text-xs"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Nuevo Usuario
                </Button>
              </div>
            </div>
          </div>

          {/* Tabla */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5">
            <div className="border border-border/70 dark:border-slate-800">
              {!isLoadingUsers && !usersError && filteredDocentes.length > 0 && (
                <div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_90px_110px_80px_120px] sm:gap-4 border-b border-border/70 bg-muted/40 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                  <span>Usuario</span>
                  <span>Correo</span>
                  <span>Documentos</span>
                  <span>Rol</span>
                  <span>Estado</span>
                  <span className="text-right">Acciones</span>
                </div>
              )}
              <div className="divide-y divide-border/50 bg-card dark:divide-slate-800 dark:bg-slate-950">
                {formalListContent}
              </div>
            </div>

            {!isLoadingUsers && !usersError && filteredDocentes.length > 0 && totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredDocentes.length)} de {filteredDocentes.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {getPageNumbers().map((page, idx) =>
                    page === "ellipsis" ? (
                      <span key={`ellipsis-${idx}`} className="px-1.5 text-sm text-muted-foreground">…</span>
                    ) : (
                      <Button key={page} variant={page === currentPage ? "success" : "ghost"} size="icon" className="h-7 w-7 rounded-sm text-sm" onClick={() => setCurrentPage(page)}>
                        {page}
                      </Button>
                    )
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Modo clásico ── */
        <div className="relative space-y-4 overflow-hidden">
          {/* Header con título y búsqueda integrada */}
          <div data-component="page-banner" className="relative overflow-hidden rounded-[28px] border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-5 shadow-[0_24px_90px_-35px_rgba(16,185,129,0.35)] dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_42%)]" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  Gestión de Usuarios
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Administra usuarios y permisos del sistema.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-800 dark:text-slate-300" strokeWidth={2.25} />
                  <Input
                    placeholder={searchPlaceholders[placeholderIndex]}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-white/95 pl-9 shadow-sm transition-all duration-300 dark:bg-slate-900/90"
                  />
                </div>
                <Button
                  data-tour="admin-docentes-new-btn"
                  variant="success"
                  onClick={() => setShowNewDialog(true)}
                  className="shrink-0 shadow-sm shadow-emerald-500/20"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Nuevo Usuario
                </Button>
              </div>
            </div>
          </div>

          {/* Contenedor de tabla */}
          <div className="rounded-2xl border border-border/60 bg-card p-4 dark:border-slate-800 dark:bg-slate-950/60 sm:p-5">
            <div className="overflow-hidden rounded-lg border border-border/60 dark:border-slate-800">
              {!isLoadingUsers && !usersError && filteredDocentes.length > 0 && (
                <div className="hidden bg-slate-50/80 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground dark:bg-slate-900/60 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_100px_120px_90px_148px] sm:gap-4">
                  <span>Usuario</span>
                  <span>Correo</span>
                  <span>Documentos</span>
                  <span>Rol</span>
                  <span>Estado</span>
                  <span className="text-right">Acciones</span>
                </div>
              )}
              <div data-component="user-list" className="min-w-0 divide-y divide-border/60 bg-white dark:divide-slate-800 dark:bg-slate-950/40">
                {usersListContent}
              </div>
            </div>

            {/* Paginación centrada */}
            {!isLoadingUsers && !usersError && filteredDocentes.length > 0 && totalPages > 1 && (
              <div className="mt-3 flex flex-col items-center gap-2 sm:relative sm:flex-row sm:items-center">
                <p className="order-2 text-xs text-muted-foreground sm:order-1">
                  Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredDocentes.length)} de {filteredDocentes.length}
                </p>
                <div className="order-1 flex items-center gap-1 sm:absolute sm:left-1/2 sm:order-2 sm:-translate-x-1/2">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {getPageNumbers().map((page, idx) =>
                    page === "ellipsis" ? (
                      <span key={`ellipsis-${idx}`} className="px-1.5 text-sm text-muted-foreground">…</span>
                    ) : (
                      <Button key={page} variant={page === currentPage ? "success" : "ghost"} size="icon" className="h-7 w-7 text-sm" onClick={() => setCurrentPage(page)}>
                        {page}
                      </Button>
                    )
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Diálogos compartidos */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        setShowEditDialog(open);
        if (!open) {
          resetEditForm();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDocente?.roles?.includes("supervisor") ? "Editar Supervisor"
                : selectedDocente?.roles?.includes("tutor") ? "Editar Tutor"
                : selectedDocente?.roles?.includes("docente") ? "Editar Docente"
                : "Editar Usuario"}
            </DialogTitle>
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <label className={`flex items-center gap-2 ${editDocente.roles?.supervisor ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
                      <Checkbox
                        checked={!!editDocente.roles?.docente}
                        disabled={!!editDocente.roles?.supervisor}
                        onCheckedChange={(val) => setEditDocente((current) => ({
                          ...current,
                          roles: {
                            ...(current.roles ?? { docente: false, tutor: false, administrador: false, supervisor: false }),
                            docente: Boolean(val),
                            supervisor: Boolean(val) ? false : (current.roles?.supervisor ?? false),
                          },
                        }))}
                      />
                      <span className="text-sm">Docente</span>
                    </label>
                  </TooltipTrigger>
                  <TooltipContent>Sube y gestiona documentos académicos: planeaciones, instrumentos, listas, asesorías y portafolio.</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <label className={`flex items-center gap-2 ${editDocente.roles?.supervisor ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
                      <Checkbox
                        checked={!!editDocente.roles?.tutor}
                        disabled={!!editDocente.roles?.supervisor}
                        onCheckedChange={(val) => setEditDocente((current) => ({
                          ...current,
                          roles: {
                            ...(current.roles ?? { docente: false, tutor: false, administrador: false, supervisor: false }),
                            tutor: Boolean(val),
                            supervisor: Boolean(val) ? false : (current.roles?.supervisor ?? false),
                          },
                        }))}
                      />
                      <span className="text-sm">Tutor</span>
                    </label>
                  </TooltipTrigger>
                  <TooltipContent>Gestiona documentos de tutoría: carga académica, reportes de bajas, asesorías y fichas técnicas.</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <label className={`flex items-center gap-2 ${(editDocente.roles?.docente || editDocente.roles?.tutor) ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
                      <Checkbox
                        checked={!!editDocente.roles?.supervisor}
                        disabled={!!editDocente.roles?.docente || !!editDocente.roles?.tutor}
                        onCheckedChange={(val) => setEditDocente((current) => ({
                          ...current,
                          roles: {
                            ...(current.roles ?? { docente: false, tutor: false, administrador: false, supervisor: false }),
                            supervisor: Boolean(val),
                            docente: Boolean(val) ? false : (current.roles?.docente ?? false),
                            tutor: Boolean(val) ? false : (current.roles?.tutor ?? false),
                          },
                        }))}
                      />
                      <span className="text-sm">Supervisor</span>
                    </label>
                  </TooltipTrigger>
                  <TooltipContent>Puede visualizar documentos del sistema. Rol exclusivo: no se combina con Docente ni Tutor.</TooltipContent>
                </Tooltip>
              </div>
              <p className="text-xs text-muted-foreground">
                {editDocente.roles?.supervisor
                  ? "El Supervisor es un rol exclusivo — no se puede combinar con Docente ni Tutor."
                  : (editDocente.roles?.docente || editDocente.roles?.tutor)
                  ? "Docente y Tutor pueden combinarse, pero no con el rol de Supervisor."
                  : "Selecciona al menos un rol para el usuario."}
              </p>
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
              Se restablecerá la contraseña del usuario.
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
        onCancel={() => {
          setShowStatusDialog(false);
          setSelectedDocente(null);
          setStatusConfirmationEmail("");
        }}
        onConfirm={confirmToggleStatus}
        isChangingStatus={isChangingStatus}
      />

      <Dialog open={showDeleteDialog} onOpenChange={(open) => {
        setShowDeleteDialog(open);
        if (!open) { setSelectedDocente(null); setDeleteConfirmEmail(""); }
      }}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0">
          <div className="px-6 pt-6 pb-5 bg-destructive/10">
            <div className="flex items-center gap-3 mb-1.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/20 text-destructive">
                <Trash2 className="h-4 w-4" />
              </div>
              <DialogTitle className="text-base font-semibold leading-tight">Eliminar usuario permanentemente</DialogTitle>
            </div>
            <DialogDescription className="text-sm text-muted-foreground pl-12 leading-relaxed">
              Esta acción no se puede deshacer. El usuario perderá acceso al sistema, pero sus documentos permanecerán en el sistema y mostrarán "Usuario eliminado".
            </DialogDescription>
          </div>

          {selectedDocente && (
            <div className="px-6 py-5 border-y border-border/60">
              <div className="flex items-center gap-3.5">
                <DocenteAvatar name={selectedDocente.nombre} avatar={selectedDocente.avatar} className="h-11 w-11 shrink-0 ring-2 ring-border/40" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-foreground truncate">{selectedDocente.nombre}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 text-muted-foreground">
                    <Mail className="h-3 w-3 shrink-0" />
                    <span className="text-xs truncate">{selectedDocente.email}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {selectedDocente.documentos} {selectedDocente.documentos === 1 ? "documento" : "documentos"} subidos
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <Label className="text-xs font-medium text-foreground/80">
                  Escribe el correo exacto para confirmar la eliminación
                </Label>
                <Input
                  type="email"
                  value={deleteConfirmEmail}
                  onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                  placeholder={selectedDocente.email}
                  autoComplete="off"
                  spellCheck={false}
                  className="h-9 bg-background text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Debe coincidir carácter por carácter con el correo mostrado arriba.
                </p>
              </div>
            </div>
          )}

          <div className="px-6 py-4 flex items-center justify-end gap-2.5">
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting} className="h-9 px-4 text-sm">
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleForceDelete}
              className="h-9 px-5 text-sm min-w-40"
              disabled={isDeleting || deleteConfirmEmail.trim().toLowerCase() !== (selectedDocente?.email.trim().toLowerCase() ?? "")}
            >
              {isDeleting ? "Eliminando..." : "Eliminar permanentemente"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <label className={`flex items-center gap-2 ${newDocente.roles?.supervisor ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
                      <Checkbox
                        checked={!!newDocente.roles?.docente}
                        disabled={!!newDocente.roles?.supervisor}
                        onCheckedChange={(val) => setNewDocente((current) => ({
                          ...current,
                          roles: {
                            ...(current.roles ?? { docente: false, tutor: false, administrador: false, supervisor: false }),
                            docente: Boolean(val),
                            supervisor: Boolean(val) ? false : (current.roles?.supervisor ?? false),
                          },
                        }))}
                      />
                      <span className="text-sm">Docente</span>
                    </label>
                  </TooltipTrigger>
                  <TooltipContent>Sube y gestiona documentos académicos: planeaciones, instrumentos, listas, asesorías y portafolio.</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <label className={`flex items-center gap-2 ${newDocente.roles?.supervisor ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
                      <Checkbox
                        checked={!!newDocente.roles?.tutor}
                        disabled={!!newDocente.roles?.supervisor}
                        onCheckedChange={(val) => setNewDocente((current) => ({
                          ...current,
                          roles: {
                            ...(current.roles ?? { docente: false, tutor: false, administrador: false, supervisor: false }),
                            tutor: Boolean(val),
                            supervisor: Boolean(val) ? false : (current.roles?.supervisor ?? false),
                          },
                        }))}
                      />
                      <span className="text-sm">Tutor</span>
                    </label>
                  </TooltipTrigger>
                  <TooltipContent>Gestiona documentos de tutoría: carga académica, reportes de bajas, asesorías y fichas técnicas.</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <label className={`flex items-center gap-2 ${(newDocente.roles?.docente || newDocente.roles?.tutor) ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
                      <Checkbox
                        checked={!!newDocente.roles?.supervisor}
                        disabled={!!newDocente.roles?.docente || !!newDocente.roles?.tutor}
                        onCheckedChange={(val) => setNewDocente((current) => ({
                          ...current,
                          roles: {
                            ...(current.roles ?? { docente: false, tutor: false, administrador: false, supervisor: false }),
                            supervisor: Boolean(val),
                            docente: Boolean(val) ? false : (current.roles?.docente ?? false),
                            tutor: Boolean(val) ? false : (current.roles?.tutor ?? false),
                          },
                        }))}
                      />
                      <span className="text-sm">Supervisor</span>
                    </label>
                  </TooltipTrigger>
                  <TooltipContent>Puede visualizar documentos del sistema. Rol exclusivo: no se combina con Docente ni Tutor.</TooltipContent>
                </Tooltip>
              </div>
              <p className="text-xs text-muted-foreground">
                {newDocente.roles?.supervisor
                  ? "El Supervisor es un rol exclusivo — no se puede combinar con Docente ni Tutor."
                  : (newDocente.roles?.docente || newDocente.roles?.tutor)
                  ? "Docente y Tutor pueden combinarse, pero no con el rol de Supervisor."
                  : "Selecciona al menos un rol para el usuario."}
              </p>
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
    </>
  );
}

export default DocenteManagement;