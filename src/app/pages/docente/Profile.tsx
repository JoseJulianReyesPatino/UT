import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";
import { clearAvatarCache, useResolvedAvatarUrl } from "../../lib/avatar";
import { Calendar, Eye, EyeOff, Lock, Upload } from "lucide-react";
import { toast } from "sonner";

const defaultProfileAvatar = "/src/assets/perfil2.png";

export function Profile() {
  const { user, updateProfile, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(undefined);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileStats, setProfileStats] = useState({
    documentsSent: 0,
    documentsReviewed: 0,
    documentsPending: 0,
    documentsReturned: 0,
  });

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstNames ?? "");
    setLastName(user.lastNames ?? "");
    setAvatarPreview(user.avatar && user.avatar !== "/api/default-avatar" ? user.avatar : defaultProfileAvatar);
  }, [user]);

  useEffect(() => {
    let isActive = true;
    const loadProfileStats = async () => {
      try {
        const response = (await apiFetch("/auth/profile/stats", { method: "GET" })) as {
          stats: {
            documents_sent: number;
            documents_reviewed: number;
            documents_pending: number;
            documents_returned: number;
          };
        };
        if (!isActive) return;
        setProfileStats({
          documentsSent: response.stats.documents_sent,
          documentsReviewed: response.stats.documents_reviewed,
          documentsPending: response.stats.documents_pending,
          documentsReturned: response.stats.documents_returned,
        });
      } catch {
        if (!isActive) return;
        setProfileStats({ documentsSent: 0, documentsReviewed: 0, documentsPending: 0, documentsReturned: 0 });
      }
    };
    loadProfileStats();
    return () => { isActive = false; };
  }, [user]);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Solo se permiten imágenes PNG, JPG o WEBP");
      event.target.value = "";
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("La imagen no puede superar 8MB");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatarPreview(reader.result);
        setSelectedAvatarFile(file);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveChanges = async () => {
    if (!user) return;
    const explicitName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
    const fallbackName = user.name || [user.firstNames, user.lastNames].filter(Boolean).join(" ");
    const fullName = explicitName || fallbackName;
    if (!fullName.trim()) {
      toast.error("El nombre no puede quedar vacío");
      return;
    }
    setIsSavingProfile(true);
    try {
      let requestOptions: RequestInit;
      if (selectedAvatarFile) {
        const formData = new FormData();
        formData.append("full_name", fullName);
        formData.append("avatar", selectedAvatarFile);
        requestOptions = { method: "POST", body: formData };
      } else {
        requestOptions = {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ full_name: fullName }),
        };
      }
      await apiFetch("/auth/profile", requestOptions);
      clearAvatarCache();
      const refreshedUser = await refreshUser();
      if (refreshedUser) {
        updateProfile({
          name: refreshedUser.name,
          firstNames: refreshedUser.firstNames,
          lastNames: refreshedUser.lastNames,
          avatar: refreshedUser.avatar,
          phone: refreshedUser.phone,
          area: refreshedUser.area,
        });
        setAvatarPreview(refreshedUser.avatar && refreshedUser.avatar !== "/api/default-avatar" ? refreshedUser.avatar : defaultProfileAvatar);
      }
      setSelectedAvatarFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      window.dispatchEvent(new CustomEvent("ut-avatar-updated", { detail: { userId: user.id, avatarUrl: refreshedUser?.avatar } }));
      toast.success("Perfil actualizado correctamente");
    } catch (error: any) {
      console.error("Error al guardar perfil:", error);
      toast.error(error instanceof Error ? error.message : "No fue posible guardar el perfil");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCancelChanges = () => {
    if (!user) return;
    setFirstName(user.firstNames ?? "");
    setLastName(user.lastNames ?? "");
    setAvatarPreview(user.avatar && user.avatar !== "/api/default-avatar" ? user.avatar : defaultProfileAvatar);
    setSelectedAvatarFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePasswordSave = async () => {
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
        body: JSON.stringify({ current_password: currentPassword, password: newPassword, password_confirmation: confirmPassword }),
      });
      toast.success("Contraseña actualizada correctamente");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setIsPasswordOpen(false);
    } catch (error: any) {
      toast.error(error instanceof Error ? error.message : "No fue posible cambiar la contraseña");
    } finally {
      setIsSavingPassword(false);
    }
  };

  const resolvedServerAvatar = useResolvedAvatarUrl(
    user?.avatar && user.avatar !== "/api/default-avatar" ? user.avatar : null
  );
  const visibleAvatar = (selectedAvatarFile && avatarPreview?.startsWith("data:"))
    ? avatarPreview
    : (resolvedServerAvatar ?? defaultProfileAvatar);

  const memberSinceLabel = useMemo(() => {
    if (!user?.createdAt) return "Sin datos";
    const date = new Date(user.createdAt);
    if (Number.isNaN(date.getTime())) return "Sin datos";
    return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric" }).format(date);
  }, [user?.createdAt]);

  const roleLabel = user?.roles?.length && user.roles.length > 1
    ? user.roles.map((r) => (r === "administrador" ? "Administrador" : r === "supervisor" ? "Supervisor" : r === "tutor" ? "Tutor" : "Docente")).join(" y ")
    : user?.role === "administrador" ? "Administrador"
    : user?.role === "supervisor" ? "Supervisor"
    : user?.role === "tutor" ? "Tutor"
    : "Docente";

  const cardCls = "overflow-hidden border-emerald-200/60 bg-white/55 shadow-sm backdrop-blur dark:border-emerald-900/35 dark:bg-slate-950/55";
  const headerCls = "border-b border-emerald-200/30 p-4 sm:p-6 dark:border-emerald-900/25";
  const panelCls = "rounded-2xl border border-emerald-200/45 bg-white/45 p-4 dark:border-emerald-900/25 dark:bg-slate-950/35";

  return (
    <div className="flex flex-col gap-4 sm:gap-6 bg-transparent text-slate-900 dark:text-slate-100">

      {/* Título */}
      <div className="shrink-0 rounded-2xl sm:rounded-3xl border border-emerald-200/30 p-4 sm:p-6 dark:border-emerald-900/25">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">Mi Perfil</h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Gestiona tu información personal y preferencias</p>
      </div>

      {/* Grid principal */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">

        {/* Tarjeta principal (col 1-2) */}
        <Card className={`lg:col-span-2 ${cardCls}`}>
          <CardHeader className={headerCls}>
            <CardTitle className="text-base sm:text-lg">Información Personal</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Actualiza tus datos de perfil</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 p-4 sm:p-6">

            {/* Avatar */}
            <div className={`flex flex-col sm:flex-row gap-4 sm:items-center ${panelCls}`}>
              <Avatar className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 ring-2 ring-emerald-200/70 dark:ring-emerald-900/40">
                <AvatarImage
                  src={visibleAvatar}
                  alt={user?.name ?? "Foto de perfil"}
                  onClick={() => setIsAvatarOpen(true)}
                  className="cursor-pointer"
                />
                <AvatarFallback
                  className="bg-transparent p-0 overflow-hidden cursor-pointer"
                  onClick={() => setIsAvatarOpen(true)}
                >
                  <img src={defaultProfileAvatar} alt="Foto de perfil" className="h-full w-full object-cover" />
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2 flex-1">
                <Label className="text-sm">Foto de perfil</Label>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-sm">
                  <Upload className="h-4 w-4" />
                  Cambiar Foto
                </Button>
                <Input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleAvatarChange} />
                <p className="text-xs text-muted-foreground">JPG, PNG o WEBP. Máximo 8MB</p>
              </div>
            </div>

            {/* Campos */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm">Nombre</Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Primer nombre" className="text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Apellido</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Apellidos completos" className="text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Correo Electrónico</Label>
                <Input value={user?.email ?? ""} disabled className="bg-muted/40 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Rol</Label>
                <Input value={roleLabel} disabled className="bg-muted/40 text-sm" />
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={handleCancelChanges} className="text-sm">Cancelar</Button>
              <Button variant="success" size="sm" onClick={handleSaveChanges} disabled={isSavingProfile} className="text-sm">
                {isSavingProfile ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>

          </CardContent>
        </Card>

        {/* Columna derecha */}
        <Card className={`self-start ${cardCls}`}>
          <CardHeader className={headerCls}>
            <CardTitle className="text-base">Información de Cuenta</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className={`flex items-center gap-3 ${panelCls}`}>
              <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center shrink-0">
                <Calendar className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Miembro desde</p>
                <p className="text-xs text-muted-foreground capitalize">{memberSinceLabel}</p>
              </div>
            </div>
            <div className={`flex items-center gap-3 ${panelCls}`}>
              <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center shrink-0">
                <Lock className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Contraseña</p>
                <p className="text-xs text-muted-foreground">Cambia tu contraseña de acceso</p>
              </div>
              <Button variant="outline" size="sm" className="text-xs shrink-0" onClick={() => setIsPasswordOpen(true)}>
                Cambiar
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Estadísticas */}
      {user?.role !== "administrador" && (
        <Card className={cardCls}>
          <CardHeader className={headerCls}>
            <CardTitle className="text-base sm:text-lg">Estadísticas</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Resumen de tu actividad</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-4">
              <div className={`${panelCls} space-y-1`}>
                <p className="text-xs text-muted-foreground">Documentos Enviados</p>
                <p className="text-2xl font-bold">{profileStats.documentsSent}</p>
              </div>
              <div className={`${panelCls} space-y-1`}>
                <p className="text-xs text-muted-foreground">Revisados</p>
                <p className="text-2xl font-bold text-success">{profileStats.documentsReviewed}</p>
              </div>
              <div className={`${panelCls} space-y-1`}>
                <p className="text-xs text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{profileStats.documentsPending}</p>
              </div>
              <div className={`${panelCls} space-y-1`}>
                <p className="text-xs text-muted-foreground">Devueltos</p>
                <p className="text-2xl font-bold text-destructive">{profileStats.documentsReturned}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog de cambio de contraseña */}
      <Dialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
            <DialogDescription>Ingresa tu contraseña actual y la nueva contraseña para actualizar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm">Contraseña actual</Label>
              <div className="relative">
                <Input type={showCurrentPassword ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Contraseña actual" className="pr-10 text-sm" />
                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2" onClick={() => setShowCurrentPassword((v) => !v)}>
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Nueva contraseña</Label>
              <div className="relative">
                <Input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nueva contraseña" className="pr-10 text-sm" />
                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2" onClick={() => setShowNewPassword((v) => !v)}>
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Confirmar nueva contraseña</Label>
              <div className="relative">
                <Input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repetir contraseña" className="pr-10 text-sm" />
                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2" onClick={() => setShowConfirmPassword((v) => !v)}>
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setIsPasswordOpen(false)} className="text-sm">Cancelar</Button>
              <Button variant="success" size="sm" onClick={handlePasswordSave} disabled={isSavingPassword} className="text-sm">
                {isSavingPassword ? "Guardando..." : "Actualizar contraseña"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Vista previa del avatar */}
      <Dialog open={isAvatarOpen} onOpenChange={setIsAvatarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Foto de perfil</DialogTitle>
            <DialogDescription>Vista previa de tu imagen de perfil</DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-center">
            <img src={visibleAvatar} alt={`Foto de perfil de ${user?.name}`} className="max-h-[70vh] max-w-full rounded-lg object-contain" />
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
