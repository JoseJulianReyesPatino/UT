import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";
import { clearAvatarCache, useResolvedAvatarUrl } from "../../lib/avatar";
import { Check, Eye, EyeOff, Key, Loader2, Moon, Sun, Upload } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { toast } from "sonner";
import defaultPerfilImg from "../../../assets/elementos/perfil2.webp";

const defaultProfileAvatar = defaultPerfilImg;

export function Profile({ onDirtyChange, layoutStyle }: Readonly<{ onDirtyChange?: (dirty: boolean) => void; layoutStyle?: string }> = {}) {
  const { user, updateProfile, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(undefined);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [passwordStep, setPasswordStep] = useState<"current" | "new" | "confirm">("current");
  const [pwCurrentPassword, setPwCurrentPassword] = useState("");
  const [pwNewPassword, setPwNewPassword] = useState("");
  const [pwConfirmPassword, setPwConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [showPwCurrent, setShowPwCurrent] = useState(false);
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

  const isDirty = useMemo(() =>
    firstName !== (user?.firstNames ?? "") ||
    lastName !== (user?.lastNames ?? "") ||
    selectedAvatarFile !== null,
    [firstName, lastName, selectedAvatarFile, user]
  );

  useEffect(() => {
    if (!onDirtyChange || !user) return;
    onDirtyChange(isDirty);
    return () => onDirtyChange(false);
  }, [isDirty, user, onDirtyChange]);

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
        setProfileStats({ documentsSent: 0, documentsReviewed: 0, documentsPending: 0, documentsReturned: 0 });
      }
    };
    loadProfileStats();
    return () => { isActive = false; };
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
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleRemoveAvatar = useCallback(async () => {
    if (isRemovingAvatar) return;
    const hadServerAvatar = !!(user?.avatar && user.avatar.startsWith("http"));
    setSelectedAvatarFile(null);
    setAvatarPreview(undefined);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!hadServerAvatar) return;
    setIsRemovingAvatar(true);
    try {
      await apiFetch("/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: null }),
      });
      clearAvatarCache();
      const refreshedUser = await refreshUser();
      if (refreshedUser) {
        updateProfile({ name: refreshedUser.name, firstNames: refreshedUser.firstNames, lastNames: refreshedUser.lastNames });
      }
      window.dispatchEvent(new CustomEvent('ut-avatar-updated', { detail: { userId: user?.id, avatarUrl: undefined } }));
      toast.success("Foto de perfil eliminada");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "No fue posible quitar la foto");
    } finally {
      setIsRemovingAvatar(false);
    }
  }, [isRemovingAvatar, user, refreshUser, updateProfile]);

  const handleSaveChanges = useCallback(async () => {
    if (!user) return;
    const explicitName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
    const fallbackName = user.name || [user.firstNames, user.lastNames].filter(Boolean).join(" ");
    const fullName = explicitName || fallbackName;
    if (!fullName.trim()) { toast.error("El nombre no puede quedar vacío"); return; }
    setIsSavingProfile(true);
    try {
      let requestOptions: RequestInit;
      if (selectedAvatarFile) {
        const formData = new FormData();
        formData.append("full_name", fullName);
        formData.append("avatar", selectedAvatarFile);
        requestOptions = { method: "POST", body: formData };
      } else {
        requestOptions = { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ full_name: fullName }) };
      }
      await apiFetch("/auth/profile", requestOptions);
      if (selectedAvatarFile) clearAvatarCache();
      const refreshedUser = await refreshUser();
      if (refreshedUser) {
        updateProfile({ name: refreshedUser.name, firstNames: refreshedUser.firstNames, lastNames: refreshedUser.lastNames, avatar: refreshedUser.avatar, phone: refreshedUser.phone, area: refreshedUser.area });
        if (!selectedAvatarFile) setAvatarPreview(refreshedUser.avatar && refreshedUser.avatar !== "/api/default-avatar" ? refreshedUser.avatar : defaultProfileAvatar);
      }
      setSelectedAvatarFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      window.dispatchEvent(new CustomEvent('ut-avatar-updated', { detail: { userId: user.id, avatarUrl: refreshedUser?.avatar } }));
      toast.success("Perfil actualizado correctamente");
    } catch (error: unknown) {
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
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getPasswordStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 2) return { score, label: "Débil", color: "bg-red-500" };
    if (score === 3) return { score, label: "Media", color: "bg-yellow-500" };
    if (score === 4) return { score, label: "Fuerte", color: "bg-emerald-500" };
    return { score, label: "Muy fuerte", color: "bg-emerald-600" };
  };

  const resetPasswordDialog = () => {
    setPasswordStep("current");
    setPwCurrentPassword(""); setPwNewPassword(""); setPwConfirmPassword("");
    setPwLoading(false); setPwError("");
    setShowPwCurrent(false); setShowPwNew(false); setShowPwConfirm(false);
  };

  const handleNextStep1 = async () => {
    setPwError("");
    if (!pwCurrentPassword) { setPwError("Ingresa tu contraseña actual."); return; }
    setPwLoading(true);
    try {
      await apiFetch("/auth/verify-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pwCurrentPassword }) });
      setPasswordStep("new");
    } catch (err: unknown) {
      const apiErr = err as { status?: number; errors?: Record<string, string[]> };
      setPwError(apiErr?.errors?.password?.[0] ?? "Contraseña incorrecta. Inténtalo de nuevo.");
    } finally { setPwLoading(false); }
  };

  const handleNextStep2 = () => {
    setPwError("");
    const strength = getPasswordStrength(pwNewPassword);
    if (strength.score < 5) { setPwError("La contraseña debe incluir mayúsculas, minúsculas, números y un carácter especial."); return; }
    setPasswordStep("confirm");
  };

  const handleSubmitPassword = async () => {
    setPwError("");
    if (pwNewPassword !== pwConfirmPassword) { setPwError("Las contraseñas no coinciden."); return; }
    setPwLoading(true);
    try {
      await apiFetch("/auth/password", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ current_password: pwCurrentPassword, password: pwNewPassword, password_confirmation: pwConfirmPassword }) });
      setIsPasswordOpen(false);
      resetPasswordDialog();
      toast.success("¡Contraseña actualizada correctamente!", { duration: 5000 });
    } catch (err: unknown) {
      const apiErr = err as { status?: number; errors?: Record<string, string[]> };
      if (apiErr?.status === 422) {
        const currentPwErrors = apiErr?.errors?.current_password;
        const pwErrors = apiErr?.errors?.password;
        if (currentPwErrors?.length) { setPasswordStep("current"); setPwError(currentPwErrors[0]); }
        else { setPwError(Array.isArray(pwErrors) ? pwErrors[0] : "Ocurrió un error de validación."); }
      } else { toast.error("Ocurrió un error al cambiar la contraseña. Inténtalo de nuevo más tarde."); }
    } finally { setPwLoading(false); }
  };

  const hasServerAvatar = user?.avatar && user.avatar !== "/api/default-avatar";
  const resolvedServerAvatar = useResolvedAvatarUrl(hasServerAvatar ? user.avatar : null);
  const visibleAvatar = (selectedAvatarFile && avatarPreview?.startsWith("data:"))
    ? avatarPreview
    : (resolvedServerAvatar ?? defaultProfileAvatar);

  const memberSinceLabel = useMemo(() => {
    if (!user?.createdAt) return "Sin datos";
    const date = new Date(user.createdAt);
    if (Number.isNaN(date.getTime())) return "Sin datos";
    return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric" }).format(date);
  }, [user?.createdAt]);

  const mapRole = (role: string) =>
    role === "administrador" ? "Administrador"
    : role === "supervisor" ? "Supervisor"
    : role === "tutor" ? "Tutor"
    : "Docente";

  const roleLabel = user?.roles?.length && user.roles.length > 1
    ? user.roles.map(mapRole).join(" y ")
    : mapRole(user?.role ?? "");

  const isFormal = layoutStyle === "formal";
  const { theme, toggleTheme } = useTheme();

  /* ── Diálogos compartidos ── */
  const sharedDialogs = (
    <>
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

      <Dialog
        open={isPasswordOpen}
        onOpenChange={(open) => { setIsPasswordOpen(open); if (!open) resetPasswordDialog(); }}
        key={isPasswordOpen ? "open" : "closed"}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-md dark:bg-slate-950 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Cambiar contraseña</DialogTitle>
            <DialogDescription className="dark:text-slate-400">
              {passwordStep === "current" && "Confirma tu contraseña actual para continuar."}
              {passwordStep === "new" && "Crea una contraseña segura para tu cuenta."}
              {passwordStep === "confirm" && "Confirma tu nueva contraseña para guardar los cambios."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 mt-1">
            {(["current", "new", "confirm"] as const).map((step, i) => {
              const stepIndex = ["current", "new", "confirm"].indexOf(passwordStep);
              const isDone = i < stepIndex;
              const isActive = passwordStep === step;
              return (
                <React.Fragment key={step}>
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${isActive ? "bg-emerald-500 text-white" : isDone ? "bg-emerald-200 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" : "bg-muted text-muted-foreground dark:bg-slate-800 dark:text-slate-400"}`}>
                    {isDone ? <Check className="h-3 w-3" /> : i + 1}
                  </div>
                  {i < 2 && <div className={`h-px flex-1 transition-colors ${isDone ? "bg-emerald-400" : "bg-border dark:bg-slate-700"}`} />}
                </React.Fragment>
              );
            })}
            <span className="ml-1 text-xs text-muted-foreground dark:text-slate-400">
              {passwordStep === "current" && "Contraseña actual"}
              {passwordStep === "new" && "Nueva contraseña"}
              {passwordStep === "confirm" && "Confirmar contraseña"}
            </span>
          </div>
          <div className="mt-1 space-y-4">
            {passwordStep === "current" && (
              <div className="space-y-2">
                <Label className="dark:text-white">Contraseña actual</Label>
                <div className="relative">
                  <Input type={showPwCurrent ? "text" : "password"} value={pwCurrentPassword} onChange={(e) => setPwCurrentPassword(e.target.value)} placeholder="Ingresa tu contraseña actual" className="pr-10 rounded-2xl dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400" autoComplete="new-password" readOnly onFocus={(e) => e.currentTarget.removeAttribute("readOnly")} autoFocus onKeyDown={(e) => e.key === "Enter" && handleNextStep1()} />
                  <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2" onClick={() => setShowPwCurrent((v) => !v)} aria-label={showPwCurrent ? "Ocultar" : "Mostrar"}>{showPwCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                </div>
                {pwError && <p className="text-xs text-destructive font-medium">{pwError}</p>}
              </div>
            )}
            {passwordStep === "new" && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="dark:text-white">Nueva contraseña</Label>
                  <div className="relative">
                    <Input type={showPwNew ? "text" : "password"} value={pwNewPassword} onChange={(e) => setPwNewPassword(e.target.value)} placeholder="Crea una contraseña segura" className="pr-10 rounded-2xl dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400" autoComplete="new-password" autoFocus onKeyDown={(e) => e.key === "Enter" && handleNextStep2()} />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2" onClick={() => setShowPwNew((v) => !v)} aria-label={showPwNew ? "Ocultar" : "Mostrar"}>{showPwNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                  </div>
                </div>
                {pwNewPassword.length > 0 && (() => {
                  const strength = getPasswordStrength(pwNewPassword);
                  return (
                    <div className="space-y-1.5">
                      <div className="flex gap-1">{[1,2,3,4,5].map((s) => <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= strength.score ? strength.color : "bg-muted dark:bg-slate-700"}`} />)}</div>
                      <p className={`text-xs font-medium ${strength.score < 5 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>{strength.label}</p>
                    </div>
                  );
                })()}
                <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1.5 dark:border-slate-700 dark:bg-slate-900/40">
                  <p className="text-xs font-semibold text-muted-foreground dark:text-slate-400 mb-2">Tu contraseña debe incluir:</p>
                  {[
                    { label: "Mínimo 8 caracteres", met: pwNewPassword.length >= 8 },
                    { label: "Letra mayúscula (A-Z)", met: /[A-Z]/.test(pwNewPassword) },
                    { label: "Letra minúscula (a-z)", met: /[a-z]/.test(pwNewPassword) },
                    { label: "Número (0-9)", met: /[0-9]/.test(pwNewPassword) },
                    { label: "Carácter especial (!@#$%...)", met: /[^A-Za-z0-9]/.test(pwNewPassword) },
                  ].map((criterion) => (
                    <div key={criterion.label} className="flex items-center gap-2">
                      <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors ${criterion.met ? "bg-emerald-500" : "bg-muted border border-border dark:bg-slate-800 dark:border-slate-600"}`}>{criterion.met && <Check className="h-2.5 w-2.5 text-white" />}</div>
                      <span className={`text-xs transition-colors ${criterion.met ? "text-foreground dark:text-white font-medium" : "text-muted-foreground dark:text-slate-400"}`}>{criterion.label}</span>
                    </div>
                  ))}
                </div>
                {pwError && <p className="text-xs text-destructive font-medium">{pwError}</p>}
              </div>
            )}
            {passwordStep === "confirm" && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="dark:text-white">Confirmar nueva contraseña</Label>
                  <div className="relative">
                    <Input type={showPwConfirm ? "text" : "password"} value={pwConfirmPassword} onChange={(e) => setPwConfirmPassword(e.target.value)} placeholder="Repite tu nueva contraseña" className="pr-10 rounded-2xl dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400" autoComplete="new-password" autoFocus onKeyDown={(e) => e.key === "Enter" && !pwLoading && handleSubmitPassword()} />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2" onClick={() => setShowPwConfirm((v) => !v)} aria-label={showPwConfirm ? "Ocultar" : "Mostrar"}>{showPwConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                  </div>
                  {pwConfirmPassword.length > 0 && (
                    <p className={`text-xs font-medium ${pwNewPassword === pwConfirmPassword ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                      {pwNewPassword === pwConfirmPassword ? "Las contraseñas coinciden ✓" : "Las contraseñas no coinciden"}
                    </p>
                  )}
                </div>
                {pwError && <p className="text-xs text-destructive font-medium">{pwError}</p>}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => { setIsPasswordOpen(false); resetPasswordDialog(); }} disabled={pwLoading} className="rounded-2xl dark:border-slate-700 dark:text-white dark:hover:bg-slate-800">Cancelar</Button>
            {passwordStep === "current" && <Button type="button" variant="success" onClick={handleNextStep1} disabled={pwLoading} className="rounded-2xl dark:bg-emerald-600 dark:hover:bg-emerald-700 dark:text-white">{pwLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verificando...</> : "Continuar"}</Button>}
            {passwordStep === "new" && <Button type="button" variant="success" onClick={handleNextStep2} className="rounded-2xl dark:bg-emerald-600 dark:hover:bg-emerald-700 dark:text-white">Continuar</Button>}
            {passwordStep === "confirm" && <Button type="button" variant="success" onClick={handleSubmitPassword} disabled={pwLoading} className="rounded-2xl dark:bg-emerald-600 dark:hover:bg-emerald-700 dark:text-white">{pwLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : "Guardar contraseña"}</Button>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );

  /* ── Modo empresarial ── */
  if (isFormal) {
    return (
      <>
        <div className="flex h-[calc(100vh-64px)] flex-col overflow-hidden bg-card text-foreground dark:bg-slate-950">
          {/* Flat header */}
          <div className="shrink-0 border-b border-border bg-card px-6 py-4 dark:border-slate-800 dark:bg-slate-950/80">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Mi Perfil</h1>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Gestiona tu información personal y preferencias.</p>
          </div>
          {/* Scrollable content */}
          <div className="flex flex-col min-h-0 flex-1 overflow-hidden p-4 sm:p-5">
            <div className="flex flex-col gap-4 min-h-0 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-500/20 scrollbar-track-transparent pb-2">
              {/* Profile banner */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 rounded-sm border border-border bg-card px-6 py-5 dark:border-slate-800/70 dark:bg-slate-950/60">
                <div className="h-20 w-20 shrink-0 rounded-sm overflow-hidden cursor-pointer" onClick={() => setIsAvatarOpen(true)}>
                  <img src={visibleAvatar} alt={user?.name ?? "Foto de perfil"} className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = defaultProfileAvatar; }} />
                </div>
                <div className="flex-1 min-w-0 text-center sm:text-left">
                  <p className="text-lg font-semibold text-slate-900 dark:text-white leading-tight">
                    {[firstName, lastName].filter(Boolean).join(" ") || user?.name || "—"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">{roleLabel} · {user?.email ?? ""}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Miembro desde{" "}
                    <span className="font-medium text-foreground dark:text-slate-300">{memberSinceLabel}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" type="button" onClick={() => fileInputRef.current?.click()} disabled={isRemovingAvatar || isSavingProfile} className="h-8 text-xs rounded-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800">
                    <Upload className="mr-1.5 h-3.5 w-3.5" />Cambiar foto
                  </Button>
                  {(selectedAvatarFile || hasServerAvatar) && (
                    <Button variant="ghost" size="sm" type="button" onClick={handleRemoveAvatar} disabled={isRemovingAvatar || isSavingProfile} className="h-8 text-xs rounded-sm dark:hover:bg-slate-800 dark:text-slate-400">
                      {isRemovingAvatar ? "Quitando..." : "Quitar"}
                    </Button>
                  )}
                </div>
                <Input ref={fileInputRef} id="avatar-formal-prf" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarChange} className="hidden" />
              </div>
              {/* Two columns */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
                {/* Left: datos personales */}
                <div className="rounded-sm border border-border bg-card dark:border-slate-800/70 dark:bg-slate-950/60">
                  <div className="border-b border-border px-5 py-3 dark:border-slate-800">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Datos personales</p>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="prf-f-nombres" className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Nombres</Label>
                        <Input id="prf-f-nombres" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Primer nombre" className="rounded-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="prf-f-apellidos" className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Apellidos</Label>
                        <Input id="prf-f-apellidos" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Apellidos completos" className="rounded-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="prf-f-correo" className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Correo electrónico</Label>
                        <Input id="prf-f-correo" value={user?.email ?? ""} disabled className="rounded-sm bg-muted/40 dark:bg-slate-900/50 dark:text-slate-500 dark:border-slate-700" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="prf-f-rol" className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Rol</Label>
                        <Input id="prf-f-rol" value={roleLabel} disabled className="rounded-sm bg-muted/40 dark:bg-slate-900/50 dark:text-slate-500 dark:border-slate-700" />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-border dark:border-slate-800">
                      <Button variant="outline" size="sm" type="button" onClick={handleCancelChanges} disabled={!isDirty || isSavingProfile} className="rounded-sm text-xs dark:border-slate-700 dark:text-white dark:hover:bg-slate-800">Cancelar</Button>
                      <Button variant="success" size="sm" onClick={handleSaveChanges} disabled={!isDirty || isSavingProfile} className="rounded-sm text-xs">{isSavingProfile ? "Guardando..." : "Guardar cambios"}</Button>
                    </div>
                  </div>
                </div>
                {/* Right: apariencia + seguridad */}
                <div className="space-y-4">
                  <div className="rounded-sm border border-border bg-card dark:border-slate-800/70 dark:bg-slate-950/60">
                    <div className="border-b border-border px-5 py-3 dark:border-slate-800">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Apariencia</p>
                    </div>
                    <div className="p-4">
                      <Button type="button" variant="outline" onClick={toggleTheme} className="w-full justify-start gap-2 rounded-sm text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800">
                        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        {theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-sm border border-border bg-card dark:border-slate-800/70 dark:bg-slate-950/60">
                    <div className="border-b border-border px-5 py-3 dark:border-slate-800">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Seguridad</p>
                    </div>
                    <div className="p-4">
                      <Button variant="outline" type="button" className="w-full justify-start gap-2 rounded-sm text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800" onClick={() => setIsPasswordOpen(true)}>
                        <Key className="h-4 w-4" />Cambiar contraseña
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {sharedDialogs}
      </>
    );
  }

  /* ── Modo clásico ── */
  return (
    <div className="relative">
      <div className="relative z-10 space-y-6">
        {user?.role === "supervisor" ? (
          <div className="relative overflow-hidden rounded-[28px] border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 p-5 shadow-[0_24px_90px_-35px_color-mix(in_oklch,var(--color-emerald-500)_35%,transparent)] dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_color-mix(in_oklch,var(--color-emerald-500)_16%,transparent),_transparent_42%)]" />
            <div className="relative">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Mi Perfil</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Gestiona tu información personal y preferencias</p>
            </div>
          </div>
        ) : (
          <div>
            <h1 className="inline-block rounded-xl bg-emerald-600 px-4 py-1.5 text-2xl font-bold text-white shadow-sm dark:bg-emerald-700">Mi Perfil</h1>
            <p className="mt-2 text-white/90 drop-shadow-sm dark:text-slate-400">Gestiona tu información personal y preferencias</p>
          </div>
        )}

        {/* Tres columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_340px] gap-6">
          {/* Columna 1: Foto */}
          <Card data-tour="perfil-info-card" className="w-full overflow-hidden border-border/70 bg-card shadow-sm dark:border-slate-800/70 dark:bg-slate-950/60">
            <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="h-40 w-40 shrink-0 rounded-full overflow-hidden ring-2 ring-emerald-200/60 dark:ring-emerald-900/40 cursor-pointer" onClick={() => setIsAvatarOpen(true)}>
                <img src={visibleAvatar} alt={user?.name ?? "Foto de perfil"} className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = defaultProfileAvatar; }} />
              </div>
              <div className="flex flex-col items-center gap-1.5 w-full">
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isRemovingAvatar || isSavingProfile} className="w-full rounded-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800">
                  <Upload className="mr-2 h-4 w-4" />Cambiar Foto
                </Button>
                {(selectedAvatarFile || hasServerAvatar) && (
                  <Button variant="ghost" size="sm" type="button" onClick={handleRemoveAvatar} disabled={isRemovingAvatar || isSavingProfile} className="w-full rounded-2xl dark:hover:bg-slate-800 dark:text-slate-300">
                    {isRemovingAvatar ? "Quitando..." : "Quitar foto"}
                  </Button>
                )}
              </div>
              <Input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleAvatarChange} />
              <p className="text-xs text-muted-foreground dark:text-slate-400">JPG, PNG o WEBP. Máximo 8MB</p>
            </div>
          </Card>

          {/* Columna 2: Datos personales */}
          <Card className="w-full overflow-hidden border-border/70 bg-card shadow-sm dark:border-slate-800/70 dark:bg-slate-950/60">
            <div className="p-8 space-y-5">
              <div>
                <h2 className="text-base font-semibold dark:text-white">Información Personal</h2>
                <p className="text-sm text-muted-foreground dark:text-slate-400">Actualiza tus datos de perfil</p>
              </div>
              <div className="space-y-1">
                <Label className="dark:text-white">Nombre</Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Primer nombre" className="rounded-2xl dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400" />
              </div>
              <div className="space-y-1">
                <Label className="dark:text-white">Apellido</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Apellidos completos" className="rounded-2xl dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-400" />
              </div>
              <div className="space-y-1.5">
                <Label className="dark:text-white">Correo Electrónico</Label>
                <Input value={user?.email ?? ""} disabled className="h-11 rounded-2xl bg-muted/40 dark:bg-slate-900/50 dark:text-slate-400 dark:border-slate-700" />
              </div>
              <div className="space-y-1.5">
                <Label className="dark:text-white">Rol</Label>
                <Input value={roleLabel} disabled className="h-11 rounded-2xl bg-muted/40 dark:bg-slate-900/50 dark:text-slate-400 dark:border-slate-700" />
              </div>
              <div className="pt-1.5 flex flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={handleCancelChanges} className="w-full sm:w-auto rounded-2xl dark:border-slate-700 dark:text-white dark:hover:bg-slate-800">Cancelar</Button>
                <Button variant="success" onClick={handleSaveChanges} disabled={!isDirty || isSavingProfile} className="w-full sm:w-auto rounded-2xl dark:bg-emerald-600 dark:hover:bg-emerald-700 dark:text-white">
                  {isSavingProfile ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </div>
          </Card>

          {/* Columna 3: Cuenta, estadísticas, seguridad */}
          <Card className="w-full overflow-hidden border-border/70 bg-card shadow-sm dark:border-slate-800/70 dark:bg-slate-950/60">
            <div className="flex h-full flex-col p-8 space-y-8">
              <div data-tour="perfil-account-card">
                <h2 className="text-base font-semibold dark:text-white mb-3">Información de Cuenta</h2>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground dark:text-slate-400">Miembro desde</p>
                    <p className="font-medium dark:text-white capitalize">{memberSinceLabel}</p>
                  </div>
                </div>
              </div>
              {user?.role !== "administrador" && user?.role !== "supervisor" && (
                <div data-tour="perfil-stats-card">
                  <h2 className="text-base font-semibold dark:text-white mb-3">Estadísticas</h2>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground dark:text-slate-400">Enviados</span>
                      <span className="font-semibold dark:text-white">{profileStats.documentsSent}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground dark:text-slate-400">Revisados</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">{profileStats.documentsReviewed}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground dark:text-slate-400">En Revisión</span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400">{profileStats.documentsPending}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground dark:text-slate-400">Devueltos</span>
                      <span className="font-semibold text-destructive dark:text-rose-400">{profileStats.documentsReturned}</span>
                    </div>
                  </div>
                </div>
              )}
              <div data-tour="perfil-security-card" className="mt-auto">
                <h2 className="text-base font-semibold dark:text-white mb-3">Seguridad</h2>
                <Button variant="outline" className="w-full justify-start rounded-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800" type="button" onClick={() => setIsPasswordOpen(true)}>
                  <Key className="h-4 w-4 mr-2" />Cambiar Contraseña
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {sharedDialogs}
      </div>
    </div>
  );
}
