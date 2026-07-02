import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { Badge } from "../../components/ui/badge";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";
import { resolveApiAssetUrl } from "../../lib/env";
import { clearAvatarCache, getInitials, useResolvedAvatarUrl } from "../../lib/avatar";
import { Calendar, Eye, EyeOff, Key, Upload } from "lucide-react";
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
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
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
    if (!user) return;

    let isActive = true;

    const loadProfileStats = async () => {
      try {
        const response = await apiFetch("/auth/profile/stats", { method: "GET" });

        if (!isActive) return;

        const stats = (response && (response.stats ?? response.data?.stats)) ?? response;

        setProfileStats({
          documentsSent: stats?.documents_sent ?? stats?.documentsSent ?? 0,
          documentsReviewed: stats?.documents_reviewed ?? stats?.documentsReviewed ?? 0,
          documentsPending: stats?.documents_pending ?? stats?.documentsPending ?? 0,
          documentsReturned: stats?.documents_returned ?? stats?.documentsReturned ?? 0,
        });
      } catch {
        if (!isActive) return;

        setProfileStats({
          documentsSent: 0,
          documentsReviewed: 0,
          documentsPending: 0,
          documentsReturned: 0,
        });
      }
    };

    loadProfileStats();

    return () => {
      isActive = false;
    };
  }, [user]);

  const handleAvatarChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
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
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleRemoveAvatar = useCallback(async () => {
    const hadServerAvatar = user?.avatar && user.avatar !== "/api/default-avatar";

    // Limpiar inmediatamente el estado local
    setSelectedAvatarFile(null);
    setAvatarPreview(undefined);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    // Si no tenía avatar en el servidor, no hacer nada más
    if (!hadServerAvatar) {
      // Actualizar el usuario localmente sin avatar
      updateProfile({ avatar: undefined });
      return;
    }

    try {
      // Llamar al backend para eliminar el avatar
      await apiFetch("/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remove_avatar: true }),
      });

      // Limpiar caché de avatares
      clearAvatarCache();

      // Refrescar usuario
      const refreshedUser = await refreshUser();
      
      if (refreshedUser) {
        // Actualizar el perfil sin avatar
        updateProfile({ 
          avatar: undefined,
          name: refreshedUser.name,
          firstNames: refreshedUser.firstNames,
          lastNames: refreshedUser.lastNames,
        });
      }

      // Disparar evento para actualizar otros componentes
      window.dispatchEvent(new CustomEvent('ut-avatar-updated', { 
        detail: { userId: user?.id, avatarUrl: undefined } 
      }));

      toast.success("Foto de perfil eliminada");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "No fue posible quitar la foto");
    }
  }, [user, refreshUser, updateProfile]);

  const handleSaveChanges = useCallback(async () => {
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
        requestOptions = {
          method: "POST",
          body: formData,
        };
      } else {
        requestOptions = {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: fullName,
          }),
        };
      }

      await apiFetch("/auth/profile", requestOptions);

      // Solo limpiar caché si se subió una nueva foto
      if (selectedAvatarFile) {
        clearAvatarCache();
      }

      // Refrescar usuario para obtener los nuevos datos
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

        // Si no hay avatar seleccionado, mantener el avatar existente
        if (!selectedAvatarFile) {
          setAvatarPreview(refreshedUser.avatar && refreshedUser.avatar !== "/api/default-avatar" ? refreshedUser.avatar : defaultProfileAvatar);
        }
      }

      setSelectedAvatarFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Disparar evento para actualizar otros componentes
      window.dispatchEvent(new CustomEvent('ut-avatar-updated', { 
        detail: { userId: user.id, avatarUrl: refreshedUser?.avatar } 
      }));

      toast.success("Perfil actualizado correctamente");
    } catch (error: any) {
      toast.error(error instanceof Error ? error.message : "No fue posible guardar el perfil");
    } finally {
      setIsSavingProfile(false);
    }
  }, [user, firstName, lastName, selectedAvatarFile, refreshUser, updateProfile]);

  const handleCancelChanges = () => {
    if (!user) return;

    setFirstName(user.firstNames ?? "");
    setLastName(user.lastNames ?? "");
    setAvatarPreview(user.avatar && user.avatar !== "/api/default-avatar" ? user.avatar : defaultProfileAvatar);
    setSelectedAvatarFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
        body: JSON.stringify({
          current_password: currentPassword,
          password: newPassword,
          password_confirmation: confirmPassword,
        }),
      });

      toast.success("Contraseña actualizada correctamente");
      setIsPasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (error: any) {
      toast.error(error instanceof Error ? error.message : "No fue posible cambiar la contraseña");
    } finally {
      setIsSavingPassword(false);
    }
  };

  const avatarInitials = getInitials(`${firstName} ${lastName}`);
  
  // Determinar si el usuario tiene avatar en el servidor
  const hasServerAvatar = user?.avatar && user.avatar !== "/api/default-avatar";
  
  // Resolver la URL del avatar del servidor (solo si existe)
  const resolvedServerAvatar = useResolvedAvatarUrl(
    hasServerAvatar ? user.avatar : null
  );

  // Priorizar: 1) preview en base64 (instantáneo), 2) avatar del servidor, 3) default
  const visibleAvatar = (selectedAvatarFile && avatarPreview?.startsWith("data:"))
    ? avatarPreview
    : (resolvedServerAvatar ?? defaultProfileAvatar);

  const memberSinceLabel = useMemo(() => {
    if (!user?.createdAt) return "Sin datos";

    const date = new Date(user.createdAt);
    if (Number.isNaN(date.getTime())) return "Sin datos";

    return new Intl.DateTimeFormat("es-MX", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  }, [user?.createdAt]);

  const roleLabel = user?.roles?.length && user.roles.length > 1
    ? user.roles.map((role) => (role === "administrador" ? "Administrador" : role === "tutor" ? "Tutor" : "Docente")).join(" y ")
    : user?.role === "administrador"
    ? "Administrador"
    : user?.role === "tutor"
    ? "Tutor"
    : "Docente";

  return (
    <div className="relative min-h-[calc(100vh-2rem)] overflow-hidden">
      <div className="relative z-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Mi Perfil</h1>
          <p className="text-muted-foreground">
            Gestiona tu información personal y preferencias
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 dark:border-slate-800/70 dark:bg-slate-950/60 dark:backdrop-blur-xl dark:shadow-[0_18px_50px_rgba(2,6,23,0.6)]">
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
              <CardDescription>
                Actualiza tus datos de perfil
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
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
                <div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Cambiar Foto
                    </Button>
                    {(selectedAvatarFile || hasServerAvatar) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={handleRemoveAvatar}
                      >
                        Quitar foto
                      </Button>
                    )}
                  </div>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG o WEBP. Máximo 8MB
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    placeholder="Primer nombre"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Apellido</Label>
                  <Input
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    placeholder="Apellidos completos"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Correo Electrónico</Label>
                <Input value={user?.email ?? ""} disabled className="bg-muted/40" />
              </div>

              <div className="space-y-2">
                <Label>Rol</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    value={roleLabel} 
                    disabled 
                    className="flex-1"
                  />
                  <Badge variant="outline">
                    {roleLabel}
                  </Badge>
                </div>
              </div>

              <div className="pt-4 flex gap-2">
                <Button variant="outline" onClick={handleCancelChanges}>Cancelar</Button>
                <Button variant="success" onClick={handleSaveChanges} disabled={isSavingProfile}>
                  {isSavingProfile ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </CardContent>
          </Card>

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

          <Dialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cambiar contraseña</DialogTitle>
                <DialogDescription>Actualiza tu contraseña de acceso</DialogDescription>
              </DialogHeader>
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Contraseña actual</Label>
                  <div className="relative">
                    <Input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      placeholder="Ingresa tu contraseña actual"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                      onClick={() => setShowCurrentPassword((value) => !value)}
                      aria-label={showCurrentPassword ? "Ocultar contraseña actual" : "Mostrar contraseña actual"}
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Nueva contraseña</Label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="Ingresa la nueva contraseña"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                      onClick={() => setShowNewPassword((value) => !value)}
                      aria-label={showNewPassword ? "Ocultar nueva contraseña" : "Mostrar nueva contraseña"}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Confirmar contraseña</Label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Repite la nueva contraseña"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                      onClick={() => setShowConfirmPassword((value) => !value)}
                      aria-label={showConfirmPassword ? "Ocultar confirmación" : "Mostrar confirmación"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setIsPasswordOpen(false)}
                    disabled={isSavingPassword}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    variant="success"
                    onClick={handlePasswordSave}
                    disabled={isSavingPassword}
                  >
                    {isSavingPassword ? "Guardando..." : "Actualizar contraseña"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <div className="space-y-6">
            <Card className="dark:border-slate-800/70 dark:bg-slate-950/60 dark:backdrop-blur-xl dark:shadow-[0_18px_50px_rgba(2,6,23,0.6)]">
              <CardHeader>
                <CardTitle>Información de Cuenta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">Miembro desde</p>
                    <p className="text-muted-foreground capitalize">{memberSinceLabel}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="dark:border-slate-800/70 dark:bg-slate-950/60 dark:backdrop-blur-xl dark:shadow-[0_18px_50px_rgba(2,6,23,0.6)]">
              <CardHeader>
                <CardTitle>Seguridad</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  type="button"
                  onClick={() => setIsPasswordOpen(true)}
                >
                  <Key className="h-4 w-4 mr-2" />
                  Cambiar Contraseña
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {user?.role !== "administrador" && (
          <Card className="dark:border-slate-800/70 dark:bg-slate-950/60 dark:backdrop-blur-xl dark:shadow-[0_18px_50px_rgba(2,6,23,0.6)]">
            <CardHeader>
              <CardTitle>Estadísticas</CardTitle>
              <CardDescription>Resumen de tu actividad</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Documentos Enviados</p>
                  <p className="text-2xl font-bold">{profileStats.documentsSent}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Revisados</p>
                  <p className="text-2xl font-bold text-success">{profileStats.documentsReviewed}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">En Revisión</p>
                  <p className="text-2xl font-bold text-emerald-600">{profileStats.documentsPending}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Devueltos</p>
                  <p className="text-2xl font-bold text-destructive">{profileStats.documentsReturned}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}