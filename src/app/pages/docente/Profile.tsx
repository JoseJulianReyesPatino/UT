import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { useAuth } from "../../context/AuthContext";
import { User, Mail, Shield, Calendar, Key } from "lucide-react";
import { toast } from "sonner";

export function Profile() {
  const { user } = useAuth();

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
                <AvatarFallback className="bg-success/10 text-success text-xl">
                  {user?.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <Button variant="outline" size="sm">Cambiar Foto</Button>
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG o GIF. Máximo 2MB
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nombre Completo</Label>
                <Input defaultValue={user?.name} />
              </div>
              <div className="space-y-2">
                <Label>Correo Electrónico</Label>
                <Input type="email" defaultValue={user?.email} disabled />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Rol</Label>
              <div className="flex items-center gap-2">
                <Input 
                  value={user?.role === "docente" ? "Docente" : "Administrador"} 
                  disabled 
                  className="flex-1"
                />
                <Badge variant="outline">
                  {user?.role === "docente" ? "Docente" : "Administrador"}
                </Badge>
              </div>
            </div>

            <div className="pt-4 flex gap-2">
              <Button variant="outline">Cancelar</Button>
              <Button 
                variant="success"
                onClick={() => toast.success("Perfil actualizado correctamente")}
              >
                Guardar Cambios
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información de Cuenta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">ID de Usuario</p>
                  <p className="text-muted-foreground">{user?.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">Email Verificado</p>
                  <p className="text-success">Verificado ✓</p>
                </div>
              </div>
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
              <Button variant="outline" className="w-full justify-start">
                <Shield className="h-4 w-4 mr-2" />
                Verificación en Dos Pasos
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {user?.role === "docente" && (
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
                <p className="text-sm text-muted-foreground">Aprobados</p>
                <p className="text-2xl font-bold text-success">42</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">En Revisión</p>
                <p className="text-2xl font-bold text-warning">2</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Rechazados</p>
                <p className="text-2xl font-bold text-destructive">1</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}