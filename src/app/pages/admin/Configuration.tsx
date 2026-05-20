import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { getFormConfig, getGroups, addFieldFor, removeFieldFor, addGroup, removeGroup, Group } from "../../../lib/formConfig";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Sun, Moon } from "lucide-react";
import { toast } from "sonner";

type ConfigTab = "general" | "formularios" | "grupos" | "cuenta";

interface ConfigurationProps {
  initialTab?: ConfigTab;
}

export function Configuration(props: Readonly<ConfigurationProps>) {
  const { initialTab = "general" } = props;
  const { user, updateProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<ConfigTab>(initialTab);
  const [formConfig, setFormConfig] = useState(getFormConfig());
  const [groups, setGroups] = useState<Group[]>(getGroups());

  const [newField, setNewField] = useState("");
  const [newRole, setNewRole] = useState<"docente" | "tutor">("docente");

  const [careerCode, setCareerCode] = useState("");
  const [plan, setPlan] = useState<"nuevo-modelo" | "plan-normal">("nuevo-modelo");
  const [cuatrimestre, setCuatrimestre] = useState(1);
  const [groupNumber, setGroupNumber] = useState(1);

  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileArea, setProfileArea] = useState("");
  const [profileAvatar, setProfileAvatar] = useState<string | undefined>(undefined);

  useEffect(() => {
    setFormConfig(getFormConfig());
    setGroups(getGroups());
  }, []);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!user) return;
    setProfileName(user.name ?? "");
    setProfilePhone(user.phone ?? "");
    setProfileArea(user.area ?? "");
    setProfileAvatar(user.avatar);
  }, [user]);

  const handleAddField = () => {
    if (!newField.trim()) return;
    addFieldFor(newRole, newField.trim());
    setFormConfig(getFormConfig());
    setNewField("");
  };

  const handleRemoveField = (role: "docente" | "tutor", field: string) => {
    removeFieldFor(role, field);
    setFormConfig(getFormConfig());
  };

  const handleAddGroup = () => {
    if (!careerCode.trim()) return;
    addGroup({ careerCode: careerCode.toUpperCase(), plan, cuatrimestre: Number(cuatrimestre), groupNumber: Number(groupNumber) });
    setGroups(getGroups());
    // clear inputs
    setCareerCode("");
    setCuatrimestre(1);
    setGroupNumber(1);
  };

  const handleRemoveGroup = (id: number) => {
    removeGroup(id);
    setGroups(getGroups());
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
    if (!profileName.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }

    updateProfile({
      name: profileName.trim(),
      phone: profilePhone.trim(),
      area: profileArea.trim(),
      avatar: profileAvatar,
    });
    toast.success("Configuración de cuenta actualizada");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1>Configuración del Sistema</h1>
        <p className="text-muted-foreground">Ajustes globales y parámetros del sistema</p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ConfigTab)}>
        <TabsList>
          <TabsTrigger value="general">Generales</TabsTrigger>
          <TabsTrigger value="formularios">Formularios</TabsTrigger>
          <TabsTrigger value="grupos">Grupos</TabsTrigger>
          <TabsTrigger value="cuenta">Cuenta</TabsTrigger>
        </TabsList>

        <TabsContent value="cuenta">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de tu Cuenta</CardTitle>
              <CardDescription>Gestiona tu foto, datos básicos y preferencias visuales.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Avatar className="h-20 w-20 ring-2 ring-emerald-200/70 dark:ring-emerald-900/40">
                  {profileAvatar && <AvatarImage src={profileAvatar} alt={profileName || "Usuario"} />}
                  <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-xl">
                    {(profileName || user?.name || "U").split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Label htmlFor="avatar">Foto de perfil</Label>
                  <Input id="avatar" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarChange} />
                  <p className="text-xs text-muted-foreground">Formatos: PNG/JPG/WEBP. Tamaño máximo: 2MB.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre completo</Label>
                  <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Correo electrónico</Label>
                  <Input value={user?.email ?? ""} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} placeholder="Ej. 6531234567" />
                </div>
                <div className="space-y-2">
                  <Label>Área / Departamento</Label>
                  <Input value={profileArea} onChange={(e) => setProfileArea(e.target.value)} placeholder="Ej. Coordinación Académica" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tema de la aplicación</Label>
                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" onClick={toggleTheme} className="gap-2">
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
        </TabsContent>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Parámetros Generales</CardTitle>
              <CardDescription>Configuración visible para administradores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre de la Institución</Label>
                  <Input defaultValue="Instituto Tecnológico Ejemplo" />
                </div>
                <div className="space-y-2">
                  <Label>Correo de Soporte</Label>
                  <Input defaultValue="soporte@instituto.edu" />
                </div>
                <div className="space-y-2">
                  <Label>Modo de Operación</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar modo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="production">Producción</SelectItem>
                      <SelectItem value="staging">Staging</SelectItem>
                      <SelectItem value="development">Desarrollo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Puerto del Servidor de Desarrollo</Label>
                  <Input defaultValue="5173" />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="outline" className="mr-2">Restablecer</Button>
                <Button variant="success">Guardar</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="formularios">
          <Card>
            <CardHeader>
              <CardTitle>Formularios</CardTitle>
              <CardDescription>Administra los campos que ven docentes y tutores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium">Campos para Docentes</h3>
                  <div className="mt-3 space-y-2">
                    {formConfig.docenteFields.map((f) => (
                      <div key={f} className="flex items-center justify-between gap-2">
                        <div className="text-sm">{f}</div>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveField("docente", f)}>Eliminar</Button>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-medium">Campos para Tutores</h3>
                  <div className="mt-3 space-y-2">
                    {formConfig.tutorFields.map((f) => (
                      <div key={f} className="flex items-center justify-between gap-2">
                        <div className="text-sm">{f}</div>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveField("tutor", f)}>Eliminar</Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
                <Select value={newRole} onValueChange={(v: any) => setNewRole(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="docente">Docente</SelectItem>
                    <SelectItem value="tutor">Tutor</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Nombre del campo" value={newField} onChange={(e) => setNewField(e.target.value)} />
                <Button onClick={handleAddField} variant="success">Agregar campo</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grupos">
          <Card>
            <CardHeader>
              <CardTitle>Grupos</CardTitle>
              <CardDescription>Crear y administrar grupos que aparecerán en los formularios</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input placeholder="Nomenclatura carrera (ej. IDGS)" value={careerCode} onChange={(e) => setCareerCode(e.target.value.toUpperCase())} />
                <Select value={plan} onValueChange={(v: any) => setPlan(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nuevo-modelo">Plan Nuevo Modelo</SelectItem>
                    <SelectItem value="plan-normal">Plan Normal</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" min={1} placeholder="Cuatrimestre (ej. 10)" value={String(cuatrimestre)} onChange={(e) => setCuatrimestre(Number(e.target.value))} />
                <Input type="number" min={1} placeholder="Número de grupo (ej. 1)" value={String(groupNumber)} onChange={(e) => setGroupNumber(Number(e.target.value))} />
                <div className="flex items-center gap-2 md:col-span-2">
                  <div className="text-sm">Nombre generado: <strong className="ml-2">{careerCode ? `${careerCode}${cuatrimestre}-${groupNumber}` : "N/D"}</strong></div>
                </div>
                <Button onClick={handleAddGroup} variant="success">Crear grupo</Button>
              </div>

              <div className="mt-6 space-y-2">
                {groups.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No hay grupos creados.</div>
                ) : (
                  groups.map((g) => (
                    <div key={g.id} className="flex items-center justify-between gap-2">
                      <div className="text-sm">{g.name} — {g.plan}</div>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveGroup(g.id)}>Eliminar</Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Configuration;
