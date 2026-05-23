import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Checkbox } from "../../components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { UserPlus, Search, Edit, Key, UserCheck, UserX, Eye, EyeOff, ShieldAlert, Mail } from "lucide-react";
import { toast } from "sonner";

type Docente = {
  id: number;
  nombre: string;
  apellidos?: string;
  telefono?: string;
  fechaNacimiento?: string;
  email: string;
  roles?: string[];
  documentos: number;
  status: "activo" | "inactivo";
  avatar: string;
};

type NuevoDocenteForm = {
  nombres: string;
  apellidos: string;
  telefono: string;
  email: string;
  fechaNacimiento: string;
  roles?: { docente: boolean; tutor: boolean };
};

const DEFAULT_PASSWORD = "12345678";

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
              <Avatar className="h-10 w-10">
                <AvatarFallback className={isDeactivating ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}>
                  {selectedDocente.avatar}
                </AvatarFallback>
              </Avatar>
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
                : "Esta acción reactivará el acceso del docente en la simulación administrativa."}
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
  {
    id: 1,
    nombre: "Mtro. Juan Pérez",
    apellidos: "Gómez",
    telefono: "444 123 4567",
    fechaNacimiento: "1985-04-18",
    email: "juan.perez@universidad.edu",
    roles: ["docente"],
    documentos: 23,
    status: "activo",
    avatar: "JP",
  },
  {
    id: 2,
    nombre: "Dra. Ana Martínez",
    apellidos: "López",
    telefono: "444 987 6543",
    fechaNacimiento: "1988-09-25",
    email: "ana.martinez@universidad.edu",
    roles: ["docente"],
    documentos: 18,
    status: "activo",
    avatar: "AM",
  },
  {
    id: 3,
    nombre: "Mtro. Carlos López",
    apellidos: "Ramírez",
    telefono: "",
    fechaNacimiento: "",
    email: "carlos.lopez@universidad.edu",
    roles: ["docente"],
    documentos: 12,
    status: "inactivo",
    avatar: "CL",
  },
];

const initialForm: NuevoDocenteForm = {
  nombres: "",
  apellidos: "",
  telefono: "",
  email: "",
  fechaNacimiento: "",
  roles: { docente: true, tutor: false },
};

export function DocenteManagement() {
  const [searchTerm, setSearchTerm] = useState("");
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
  const [newDocente, setNewDocente] = useState<NuevoDocenteForm>(initialForm);
  const [selectedDocente, setSelectedDocente] = useState<Docente | null>(null);
  const [editDocente, setEditDocente] = useState({ nombres: "", apellidos: "", telefono: "", fechaNacimiento: "", email: "", roles: { docente: true, tutor: false } });

  const resetForm = () => {
    setNewDocente(initialForm);
  };

  const sanitizePhone = (value: string) => value.replace(/\D/g, "").slice(0, 10);

  const resetEditForm = () => {
    setSelectedDocente(null);
    setEditDocente({ nombres: "", apellidos: "", telefono: "", fechaNacimiento: "", email: "" });
  };

  const splitNombre = (nombreCompleto: string) => {
    const parts = nombreCompleto.trim().split(/\s+/);
    if (parts.length <= 1) {
      return { nombres: nombreCompleto.trim(), apellidos: "" };
    }

    return {
      nombres: parts.slice(0, -1).join(" "),
      apellidos: parts.slice(-1).join(" "),
    };
  };

  const getAvatar = (nombres: string, apellidos: string) => {
    const initials = `${nombres.trim().charAt(0)}${apellidos.trim().charAt(0)}`.toUpperCase();
    return initials || "ND";
  };

  const filteredDocentes = docentes.filter((doc) =>
    doc.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openEditDialog = (docente: Docente) => {
    const nombreSeparado = splitNombre(docente.nombre);
    setSelectedDocente(docente);
    setEditDocente({
      nombres: nombreSeparado.nombres,
      apellidos: docente.apellidos ?? nombreSeparado.apellidos,
      telefono: docente.telefono ?? "",
      fechaNacimiento: docente.fechaNacimiento ?? "",
      email: docente.email,
      roles: { docente: (docente.roles || []).includes("docente"), tutor: (docente.roles || []).includes("tutor") },
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

  const handleToggleStatus = (docenteId: number) => {
    setDocentes((current) =>
      current.map((docente) =>
        docente.id === docenteId
          ? { ...docente, status: docente.status === "activo" ? "inactivo" : "activo" }
          : docente
      )
    );

    const updatedDocente = docentes.find((docente) => docente.id === docenteId);
    if (updatedDocente) {
      toast.success(
        updatedDocente.status === "activo"
          ? "Docente dado de baja correctamente"
          : "Docente dado de alta correctamente",
        {
          description: updatedDocente.nombre,
        }
      );
    }
  };

  const confirmToggleStatus = async () => {
    if (!selectedDocente) return;

    if (selectedDocente.status === "activo" && statusConfirmationEmail.trim().toLowerCase() !== selectedDocente.email.trim().toLowerCase()) {
      toast.error("Debes escribir el correo exacto del docente para confirmar la baja");
      return;
    }

    setIsChangingStatus(true);
    toast.loading(selectedDocente.status === "activo" ? "Dando de baja..." : "Dando de alta...");
    await new Promise((resolve) => setTimeout(resolve, 900));
    toast.dismiss();
    handleToggleStatus(selectedDocente.id);
    setIsChangingStatus(false);
    setShowStatusDialog(false);
    setSelectedDocente(null);
    setStatusConfirmationEmail("");
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

    setIsSavingEdit(true);
    toast.loading("Guardando cambios...");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setDocentes((current) =>
      current.map((docente) =>
        docente.id === selectedDocente.id
          ? {
              ...docente,
              nombre: editDocente.nombres.trim(),
              apellidos: editDocente.apellidos.trim(),
              telefono: editDocente.telefono.trim(),
              fechaNacimiento: editDocente.fechaNacimiento,
              email: editDocente.email.trim(),
              avatar: getAvatar(editDocente.nombres, editDocente.apellidos),
              roles: [
                ...(editDocente.roles?.docente ? ["docente"] : []),
                ...(editDocente.roles?.tutor ? ["tutor"] : []),
              ],
            }
          : docente
      )
    );

    toast.dismiss();
    toast.success("Docente actualizado correctamente");
    setIsSavingEdit(false);
    setShowEditDialog(false);
    resetEditForm();
  };

  const handleResetPassword = async () => {
    if (!selectedDocente) return;

    setIsResettingPassword(true);
    toast.loading("Generando contraseña temporal...");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const temporaryPassword = `TMP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    toast.dismiss();
    toast.success("Contraseña restablecida", {
      description: `${selectedDocente.nombre}. Contraseña temporal: ${temporaryPassword}`,
    });
    setIsResettingPassword(false);
    setShowResetDialog(false);
    resetEditForm();
  };

  const hasRole = Boolean(newDocente.roles && (newDocente.roles.docente || newDocente.roles.tutor));
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

    setIsCreating(true);
    toast.loading("Creando docente...");
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const fullName = `${newDocente.nombres.trim()} ${newDocente.apellidos.trim()}`;
    const createdDocente: Docente = {
      id: Date.now(),
      nombre: fullName,
      email: newDocente.email.trim(),
      roles: [
        ...(newDocente.roles?.docente ? ["docente"] : []),
        ...(newDocente.roles?.tutor ? ["tutor"] : []),
      ],
      documentos: 0,
      status: "activo",
      avatar: getAvatar(newDocente.nombres, newDocente.apellidos),
      // La contraseña simulada queda fija para los usuarios nuevos.
    };

    setDocentes((current) => [createdDocente, ...current]);
    toast.dismiss();
    toast.success("Docente creado correctamente", {
      description: `${fullName} ya quedó registrado. Contraseña temporal: ${DEFAULT_PASSWORD}`,
    });
    setIsCreating(false);
    setShowNewDialog(false);
    resetForm();
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
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Usuarios Registrados</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background/90 dark:bg-slate-900/85"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredDocentes.map((docente) => (
              <div
                key={docente.id}
                className="flex items-center justify-between p-4 rounded-xl border border-border/70 bg-background/80 hover:bg-accent/60 transition-colors dark:bg-slate-950/60 dark:hover:bg-slate-900/70 overflow-hidden"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <Avatar className="h-12 w-12 flex-shrink-0">
                    <AvatarFallback className="bg-success/10 text-success">
                      {docente.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{docente.nombre}</p>
                    <p className="text-sm text-muted-foreground truncate">{docente.email}</p>
                    <div className="flex gap-4 mt-1 text-xs text-muted-foreground truncate">
                      <span className="truncate">{docente.documentos} documentos enviados</span>
                      <span className="truncate">{(docente.roles || []).join(", ")}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant={docente.status === "activo" ? "success" : "outline"}>
                    {docente.status === "activo" ? "Activo" : "Inactivo"}
                  </Badge>
                  <Button variant="ghost" title="Editar" onClick={() => openEditDialog(docente)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" title="Restablecer contraseña" onClick={() => openResetDialog(docente)}>
                    <Key className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" title="Cambiar estado" onClick={() => openStatusDialog(docente)}>
                    {docente.status === "activo" ? (
                      <UserX className="h-4 w-4" />
                    ) : (
                      <UserCheck className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
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
              Ajusta los datos del docente en esta simulación administrativa.
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

            <div className="space-y-2">
              <Label>Correo electrónico (obligatorio)</Label>
              <Input
                type="email"
                value={editDocente.email}
                onChange={(e) => setEditDocente((current) => ({ ...current, email: e.target.value }))}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
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
              <div className="space-y-2">
                <Label>Fecha de nacimiento (opcional)</Label>
                <Input
                  type="date"
                  value={editDocente.fechaNacimiento}
                  onChange={(e) => setEditDocente((current) => ({ ...current, fechaNacimiento: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Roles</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={!!editDocente.roles?.docente}
                    onCheckedChange={(val) => setEditDocente((current) => ({ ...current, roles: { ...(current.roles ?? { docente: false, tutor: false }), docente: Boolean(val) } }))}
                  />
                  <span className="text-sm">Docente</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={!!editDocente.roles?.tutor}
                    onCheckedChange={(val) => setEditDocente((current) => ({ ...current, roles: { ...(current.roles ?? { docente: false, tutor: false }), tutor: Boolean(val) } }))}
                  />
                  <span className="text-sm">Tutor</span>
                </label>
              </div>
              <p className="text-xs text-muted-foreground">Selecciona si el usuario será docente, tutor o ambos.</p>
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
              Se generará una contraseña temporal simulada para el docente seleccionado.
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Fecha de nacimiento (opcional)</Label>
                <Input
                  type="date"
                  value={newDocente.fechaNacimiento}
                  onChange={(e) => setNewDocente((current) => ({ ...current, fechaNacimiento: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Roles</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={!!newDocente.roles?.docente}
                    onCheckedChange={(val) => setNewDocente((current) => ({ ...current, roles: { ...(current.roles ?? { docente: false, tutor: false }), docente: Boolean(val) } }))}
                  />
                  <span className="text-sm">Docente</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={!!newDocente.roles?.tutor}
                    onCheckedChange={(val) => setNewDocente((current) => ({ ...current, roles: { ...(current.roles ?? { docente: false, tutor: false }), tutor: Boolean(val) } }))}
                  />
                  <span className="text-sm">Tutor</span>
                </label>
              </div>
              <p className="text-xs text-muted-foreground">Selecciona si el usuario será docente, tutor o ambos.</p>
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
