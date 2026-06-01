import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { Badge } from "../../components/ui/badge";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";
import { Calendar, Key, Upload } from "lucide-react";
import { toast } from "sonner";

export function Profile() {
  const { user, updateProfile } = useAuth();
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
    setAvatarPreview(user.avatar);
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

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecciona una imagen válida");
      event.target.value = "";
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      toast.error("La imagen no puede superar 4MB");
      event.target.value = "";
      return;
    }

    setSelectedAvatarFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatarPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveChanges = async () => {
    if (!user) return;

    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");

    if (!fullName) {
      toast.error("El nombre no puede quedar vacío");
      return;
    }

    setIsSavingProfile(true);

    try {
      const formData = new FormData();
      formData.append("_method", "PATCH");
      formData.append("full_name", fullName);

      if (selectedAvatarFile) {
        formData.append("avatar", selectedAvatarFile);
      }

      const response = (await apiFetch("/auth/profile", {
        method: "POST",
        body: formData,
      })) as {
        user: {
          full_name: string;
          first_names?: string | null;
          last_names?: string | null;
          phone?: string | null;
          area?: string | null;
          avatar_url?: string | null;
        };
      };

      updateProfile({
        name: response.user.full_name,
        firstNames: response.user.first_names ?? firstName.trim(),
        lastNames: response.user.last_names ?? lastName.trim(),
        avatar: response.user.avatar_url ?? undefined,
        phone: response.user.phone ?? undefined,
        area: response.user.area ?? undefined,
      });

      setAvatarPreview(response.user.avatar_url ?? undefined);
      setSelectedAvatarFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      toast.success("Perfil actualizado correctamente");
    } catch (error: any) {
      toast.error(error instanceof Error ? error.message : "No fue posible guardar el perfil");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCancelChanges = () => {
    if (!user) return;

    setFirstName(user.firstNames ?? "");
    setLastName(user.lastNames ?? "");
    setAvatarPreview(user.avatar);
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
    } catch (error: any) {
      toast.error(error instanceof Error ? error.message : "No fue posible cambiar la contraseña");
    } finally {
      setIsSavingPassword(false);
    }
  };

  const avatarInitials = [firstName, lastName]
    .map((value) => value.trim().charAt(0))
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
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
    <div className="space-y-6">
      <div>
        <h1>Mi Perfil</h1>
        <p className="text-muted-foreground">
          Gestiona tu información personal y preferencias
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Información Personal</CardTitle>
            <CardDescription>
              Actualiza tus datos de perfil
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                {avatarPreview ? (
                  <AvatarImage
                    src={avatarPreview}
                    alt={user?.name ?? "Foto de perfil"}
                    onClick={() => setIsAvatarOpen(true)}
                    className="cursor-pointer"
                  />
                ) : (
                  <AvatarFallback
                    className="bg-success/10 text-success text-xl cursor-pointer"
                    onClick={() => setIsAvatarOpen(true)}
                  >
                    {avatarInitials || "--"}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Cambiar Foto
                </Button>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG o GIF. Máximo 4MB
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

        {/* Avatar preview dialog */}
        <Dialog open={isAvatarOpen} onOpenChange={setIsAvatarOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Foto de perfil</DialogTitle>
              <DialogDescription>Vista previa de tu imagen de perfil</DialogDescription>
            </DialogHeader>
            <div className="mt-4 flex justify-center">
              {avatarPreview ? (
                <img src={avatarPreview} alt={`Foto de perfil de ${user?.name}`} className="max-h-[70vh] max-w-full rounded-lg object-contain" />
              ) : (
                <div className="h-40 w-40 rounded-lg bg-success/10 flex items-center justify-center text-2xl">
                  {avatarInitials || "--"}
                </div>
              )}
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
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  placeholder="Ingresa tu contraseña actual"
                />
              </div>
              <div className="space-y-2">
                <Label>Nueva contraseña</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Ingresa la nueva contraseña"
                />
              </div>
              <div className="space-y-2">
                <Label>Confirmar contraseña</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repite la nueva contraseña"
                />
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
          <Card>
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

          <Card>
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
        <Card>
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
  );
}