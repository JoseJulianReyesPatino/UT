import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { Badge } from "../../components/ui/badge";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";
import { resolveApiAssetUrl } from "../../lib/env";
import { clearAvatarCache, getInitials, useResolvedAvatarUrl } from "../../lib/avatar";
import { Calendar, Eye, EyeOff, Key, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import defaultPerfilImg from "../../../assets/elementos/perfil2.webp";

const defaultProfileAvatar = defaultPerfilImg;

export function Profile({ onDirtyChange }: Readonly<{ onDirtyChange?: (dirty: boolean) => void }> = {}) {
  const { user, updateProfile, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(undefined);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [passwordStep, setPasswordStep] = useState<"request" | "verify">("request");
  const [pwCode, setPwCode] = useState("");
  const [pwNewPassword, setPwNewPassword] = useState("");
  const [pwConfirmPassword, setPwConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [showPwNew, setShowPwNew] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);
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
    if (!onDirtyChange || !user) return;
    const dirty =
      firstName !== (user.firstNames ?? "") ||
      lastName !== (user.lastNames ?? "") ||
      selectedAvatarFile !== null;
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [firstName, lastName, selectedAvatarFile, user, onDirtyChange]);

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
    // Un avatar real del servidor siempre llega como URL absoluta https://...
    // Los paths locales de Vite (defaultPerfilImg) no son avatares del servidor.
    const hadServerAvatar = !!(user?.avatar && user.avatar.startsWith("http"));

    setSelectedAvatarFile(null);
    setAvatarPreview(undefined);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (!hadServerAvatar) {
      // No hay avatar de servidor — solo limpiar estado local, no tocar user.avatar
      return;
    }

    try {
      await apiFetch("/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: null }),
      });

      clearAvatarCache();

      const refreshedUser = await refreshUser();
      
      if (refreshedUser) {
        // No pasar avatar: undefined — refreshUser ya actualizó user.avatar
        // al defaultPerfilImg a través de setUser en AuthContext.
        updateProfile({ 
          name: refreshedUser.name,
          firstNames: refreshedUser.firstNames,
          lastNames: refreshedUser.lastNames,
        });
      }

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

      if (selectedAvatarFile) {
        clearAvatarCache();
      }

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

        if (!selectedAvatarFile) {
          setAvatarPreview(refreshedUser.avatar && refreshedUser.avatar !== "/api/default-avatar" ? refreshedUser.avatar : defaultProfileAvatar);
        }
      }

      setSelectedAvatarFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

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

  const resetPasswordDialog = () => {
    setPasswordStep("request");
    setPwCode("");
    setPwNewPassword("");
    setPwConfirmPassword("");
    setPwLoading(false);
    setPwError("");
    setShowPwNew(false);
    setShowPwConfirm(false);
  };

  const handleRequestPasswordCode = async () => {
    if (!user?.email) return;
    setPwError("");
    setPwLoading(true);
    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: user.email }),
      });
      setPasswordStep("verify");
    } catch {
      toast.error("No se pudo enviar el código. Inténtalo de nuevo.");
    } finally {
      setPwLoading(false);
    }
  };

  const handleResendPasswordCode = async () => {
    if (!user?.email) return;
    setPwCode("");
    setPwError("");
    setPwLoading(true);
    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: user.email }),
      });
      toast.success("¡Código reenviado! Revisa tu bandeja de entrada.");
    } catch {
      toast.error("No se pudo reenviar el código. Inténtalo de nuevo.");
    } finally {
      setPwLoading(false);
    }
  };

  const handleVerifyPasswordCode = async () => {
    if (!user?.email) return;
    setPwError("");
    if (!pwCode.trim()) { setPwError("Ingresa el código de verificación."); return; }
    if (pwNewPassword !== pwConfirmPassword) { setPwError("Las contraseñas no coinciden."); return; }
    if (pwNewPassword.length < 8) { setPwError("La contraseña debe tener al menos 8 caracteres."); return; }
    setPwLoading(true);
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email: user.email,
          token: pwCode,
          password: pwNewPassword,
          password_confirmation: pwConfirmPassword,
        }),
      });
      setIsPasswordOpen(false);
      resetPasswordDialog();
      toast.success("¡Contraseña actualizada correctamente!", { duration: 5000 });
    } catch (err: unknown) {
      const apiErr = err as { status?: number; errors?: Record<string, string[]> };
      if (apiErr?.status === 422) {
        const apiErrors = apiErr?.errors?.token ?? apiErr?.errors?.password;
        const msg = Array.isArray(apiErrors) ? apiErrors[0] : "Código incorrecto o expirado. Solicita uno nuevo.";
        setPwError(msg);
      } else {
        toast.error("Ocurrió un error al cambiar la contraseña. Inténtalo de nuevo más tarde.");
      }
    } finally {
      setPwLoading(false);
    }
  };

  const avatarInitials = getInitials(`${firstName} ${lastName}`);
  
  const hasServerAvatar = user?.avatar && user.avatar !== "/api/default-avatar";
  
  const resolvedServerAvatar = useResolvedAvatarUrl(
    hasServerAvatar ? user.avatar : null
  );

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

  const mapRole = (role: string) =>
    role === "administrador" ? "Administrador"
    : role === "supervisor" ? "Supervisor"
    : role === "tutor" ? "Tutor"
    : "Docente";

  const roleLabel = user?.roles?.length && user.roles.length > 1
    ? user.roles.map(mapRole).join(" y ")
    : mapRole(user?.role ?? "");

  return (
    <div className="relative min-h-[calc(100vh-2rem)] overflow-hidden">
      <div className="relative z-10 space-y-6">
        {user?.role === "supervisor" ? (
          <div className="relative overflow-hidden rounded-[28px] border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-5 shadow-[0_24px_90px_-35px_rgba(16,185,129,0.35)] dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_42%)]" />
            <div className="relative">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Mi Perfil</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Gestiona tu información personal y preferencias</p>
            </div>
          </div>
        ) : (
          <div>
            <h1 className="inline-block rounded-xl bg-emerald-600 px-4 py-1.5 text-2xl font-bold text-white shadow-sm dark:bg-emerald-700">
              Mi Perfil
            </h1>
            <p className="mt-2 text-white/90 drop-shadow-sm dark:text-slate-400">
              Gestiona tu información personal y preferencias
            </p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <Card data-tour="perfil-info-card" className="lg:col-span-2 overflow-hidden border-border/70 bg-card shadow-sm dark:border-border/70 dark:bg-card dark:border-slate-800/70 dark:bg-slate-950/60">
            <CardHeader>
              <CardTitle className="dark:text-white">Información Personal</CardTitle>
              <CardDescription className="dark:text-slate-400">
                Actualiza tus datos de perfil
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <div
                  className="h-20 w-20 shrink-0 rounded-full overflow-hidden ring-2 ring-emerald-200/60 dark:ring-emerald-900/40 cursor-pointer"
                  onClick={() => setIsAvatarOpen(true)}
                >
                  <img
                    src={visibleAvatar}
                    alt={user?.name ?? "Foto de perfil"}
                    className="h-full w-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = defaultProfileAvatar; }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
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
                        className="rounded-2xl dark:hover:bg-slate-800 dark:text-slate-300"
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
                  <p className="text-xs text-muted-foreground mt-1 dark:text-slate-400">
                    JPG, PNG o WEBP. Máximo 8MB
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="dark:text-white">Nombre</Label>
                  <Input
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    placeholder="Primer nombre"
                    className="rounded-2xl dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-white">Apellido</Label>
                  <Input
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    placeholder="Apellidos completos"
                    className="rounded-2xl dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="dark:text-white">Correo Electrónico</Label>
                <Input value={user?.email ?? ""} disabled className="rounded-2xl bg-muted/40 dark:bg-slate-900/50 dark:text-slate-400 dark:border-slate-700" />
              </div>

              <div className="space-y-2">
                <Label className="dark:text-white">Rol</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    value={roleLabel} 
                    disabled 
                    className="flex-1 rounded-2xl bg-muted/40 dark:bg-slate-900/50 dark:text-slate-400 dark:border-slate-700"
                  />
                  <Badge variant="outline" className="rounded-full dark:border-slate-700 dark:text-slate-300">
                    {roleLabel}
                  </Badge>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-2 border-t border-border dark:border-slate-700">
                <Button variant="outline" onClick={handleCancelChanges} className="w-full sm:w-auto rounded-2xl dark:border-slate-700 dark:text-white dark:hover:bg-slate-800">Cancelar</Button>
                <Button variant="success" onClick={handleSaveChanges} disabled={isSavingProfile} className="w-full sm:w-auto rounded-2xl dark:bg-emerald-600 dark:hover:bg-emerald-700 dark:text-white">
                  {isSavingProfile ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Dialog open={isAvatarOpen} onOpenChange={setIsAvatarOpen}>
            <DialogContent className="dark:bg-slate-950 dark:border-slate-800">
              <DialogHeader>
                <DialogTitle className="dark:text-white">Foto de perfil</DialogTitle>
                <DialogDescription className="dark:text-slate-400">Vista previa de tu imagen de perfil</DialogDescription>
              </DialogHeader>
              <div className="mt-4 flex justify-center">
                <img src={visibleAvatar} alt={`Foto de perfil de ${user?.name}`} className="max-h-[70vh] max-w-full rounded-lg object-contain" />
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isPasswordOpen} onOpenChange={(open) => { setIsPasswordOpen(open); if (!open) resetPasswordDialog(); }}>
            <DialogContent className="max-w-[95vw] sm:max-w-md dark:bg-slate-950 dark:border-slate-800">
              <DialogHeader>
                <DialogTitle className="dark:text-white">Cambiar contraseña</DialogTitle>
                <DialogDescription className="dark:text-slate-400">
                  {passwordStep === "request"
                    ? "Te enviaremos un código de verificación a tu correo registrado."
                    : "Ingresa el código que recibiste y establece tu nueva contraseña."}
                </DialogDescription>
              </DialogHeader>

              {/* Indicador de pasos */}
              <div className="flex items-center gap-2 mt-1">
                {(["request", "verify"] as const).map((step, i) => (
                  <React.Fragment key={step}>
                    <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${passwordStep === step ? "bg-emerald-500 text-white" : i < (passwordStep === "verify" ? 1 : 0) ? "bg-emerald-200 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" : "bg-muted text-muted-foreground dark:bg-slate-800 dark:text-slate-400"}`}>
                      {i + 1}
                    </div>
                    {i < 1 && <div className={`h-px flex-1 transition-colors ${passwordStep === "verify" ? "bg-emerald-400" : "bg-border dark:bg-slate-700"}`} />}
                  </React.Fragment>
                ))}
                <span className="ml-1 text-xs text-muted-foreground dark:text-slate-400">
                  {passwordStep === "request" ? "Enviar código" : "Verificar y cambiar"}
                </span>
              </div>

              <div className="mt-1 space-y-4">
                {passwordStep === "request" ? (
                  <>
                    <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 flex items-center gap-3 dark:border-slate-700 dark:bg-slate-900/60">
                      <Key className="h-4 w-4 text-muted-foreground dark:text-slate-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground dark:text-slate-400">Correo registrado</p>
                        <p className="text-sm font-medium truncate dark:text-white">{user?.email}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground dark:text-slate-400">
                      Se enviará un código de 6 dígitos a ese correo. El código expira en 30 minutos.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label className="dark:text-white">Código de verificación</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={pwCode}
                        onChange={(e) => setPwCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="• • • • • •"
                        className="text-center text-2xl font-mono tracking-[0.5em] rounded-2xl dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                        autoComplete="one-time-code"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="dark:text-white">Nueva contraseña</Label>
                      <div className="relative">
                        <Input
                          type={showPwNew ? "text" : "password"}
                          value={pwNewPassword}
                          onChange={(e) => setPwNewPassword(e.target.value)}
                          placeholder="Mínimo 8 caracteres"
                          className="pr-10 rounded-2xl dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400"
                          autoComplete="new-password"
                        />
                        <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2" onClick={() => setShowPwNew((v) => !v)} aria-label={showPwNew ? "Ocultar" : "Mostrar"}>
                          {showPwNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="dark:text-white">Confirmar contraseña</Label>
                      <div className="relative">
                        <Input
                          type={showPwConfirm ? "text" : "password"}
                          value={pwConfirmPassword}
                          onChange={(e) => setPwConfirmPassword(e.target.value)}
                          placeholder="Repite la nueva contraseña"
                          className="pr-10 rounded-2xl dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400"
                          autoComplete="new-password"
                        />
                        <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2" onClick={() => setShowPwConfirm((v) => !v)} aria-label={showPwConfirm ? "Ocultar" : "Mostrar"}>
                          {showPwConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    {pwError && (
                      <p className="text-xs text-destructive font-medium">{pwError}</p>
                    )}
                    <button
                      type="button"
                      onClick={handleResendPasswordCode}
                      disabled={pwLoading}
                      className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-50"
                    >
                      ¿No recibiste el código? Reenviar
                    </button>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsPasswordOpen(false)}
                  disabled={pwLoading}
                  className="rounded-2xl dark:border-slate-700 dark:text-white dark:hover:bg-slate-800"
                >
                  Cancelar
                </Button>
                {passwordStep === "request" ? (
                  <Button type="button" variant="success" onClick={handleRequestPasswordCode} disabled={pwLoading} className="rounded-2xl dark:bg-emerald-600 dark:hover:bg-emerald-700 dark:text-white">
                    {pwLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</> : "Enviar código"}
                  </Button>
                ) : (
                  <Button type="button" variant="success" onClick={handleVerifyPasswordCode} disabled={pwLoading} className="rounded-2xl dark:bg-emerald-600 dark:hover:bg-emerald-700 dark:text-white">
                    {pwLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verificando...</> : "Confirmar"}
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <div className="space-y-6">
            <Card data-tour="perfil-account-card" className="overflow-hidden border-border/70 bg-card shadow-sm dark:border-border/70 dark:bg-card dark:border-slate-800/70 dark:bg-slate-950/60">
              <CardHeader>
                <CardTitle className="dark:text-white">Información de Cuenta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center dark:bg-slate-800">
                    <Calendar className="h-4 w-4 text-muted-foreground dark:text-slate-400" />
                  </div>
                  <div>
                    <p className="font-medium dark:text-white">Miembro desde</p>
                    <p className="text-muted-foreground capitalize dark:text-slate-400">{memberSinceLabel}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-tour="perfil-security-card" className="overflow-hidden border-border/70 bg-card shadow-sm dark:border-border/70 dark:bg-card dark:border-slate-800/70 dark:bg-slate-950/60">
              <CardHeader>
                <CardTitle className="dark:text-white">Seguridad</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start rounded-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
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

        {user?.role !== "administrador" && user?.role !== "supervisor" && (
          <Card data-tour="perfil-stats-card" className="overflow-hidden border-border/70 bg-card shadow-sm dark:border-slate-800/70 dark:bg-slate-950/60">
            <CardHeader>
              <CardTitle className="dark:text-white">Estadísticas</CardTitle>
              <CardDescription className="dark:text-slate-400">Resumen de tu actividad</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Documentos Enviados</p>
                  <p className="text-2xl font-bold dark:text-white">{profileStats.documentsSent}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Revisados</p>
                  <p className="text-2xl font-bold text-success dark:text-emerald-400">{profileStats.documentsReviewed}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground dark:text-slate-400">En Revisión</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-amber-400">{profileStats.documentsPending}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground dark:text-slate-400">Devueltos</p>
                  <p className="text-2xl font-bold text-destructive dark:text-rose-400">{profileStats.documentsReturned}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}