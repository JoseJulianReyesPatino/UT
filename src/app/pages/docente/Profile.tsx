import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { Badge } from "../../components/ui/badge";
import { useAuth } from "../../context/AuthContext";
import { Calendar, Key, Upload } from "lucide-react";
import { toast } from "sonner";

export function Profile() {
  const { user, updateProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(undefined);
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const [initialFirstName, ...restOfName] = user.name.trim().split(/\s+/);
    setFirstName(initialFirstName ?? "");
    setLastName(restOfName.join(" "));
    setAvatarPreview(user.avatar);
  }, [user]);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecciona una imagen válida");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("La imagen no puede superar 2MB");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatarPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveChanges = () => {
    if (!user) return;

    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");

    if (!fullName) {
      toast.error("El nombre no puede quedar vacío");
      return;
    }

    updateProfile({
      name: fullName,
      ...(avatarPreview !== user.avatar ? { avatar: avatarPreview } : {}),
    });

    toast.success("Perfil actualizado correctamente");
  };

  const handleCancelChanges = () => {
    if (!user) return;

    const [initialFirstName, ...restOfName] = user.name.trim().split(/\s+/);
    setFirstName(initialFirstName ?? "");
    setLastName(restOfName.join(" "));
    setAvatarPreview(user.avatar);
  };

  const avatarInitials = [firstName, lastName]
    .map((value) => value.trim().charAt(0))
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
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
                  JPG, PNG o GIF. Máximo 2MB
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
              <Button variant="success" onClick={handleSaveChanges}>
                Guardar Cambios
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
                  <p className="text-muted-foreground">Enero 2024</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Seguridad</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
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
                <p className="text-2xl font-bold">45</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Revisados</p>
                <p className="text-2xl font-bold text-success">42</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">En Revisión</p>
                <p className="text-2xl font-bold text-emerald-600">2</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Devueltos</p>
                <p className="text-2xl font-bold text-destructive">1</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}