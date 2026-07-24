import React, { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { Loader2, Mail, Lock, Eye, EyeOff, Sun, Moon, KeyRound, RotateCcw } from "lucide-react";
import apiFetch from "../lib/api";
import { toast } from "sonner";

export function Login() {
  const THEME_TOGGLE_COOLDOWN_MS = 700;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotFlipped, setIsForgotFlipped] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStep, setForgotStep] = useState<"email" | "code">("email");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [showForgotNew, setShowForgotNew] = useState(false);
  const [showForgotConfirm, setShowForgotConfirm] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const lastThemeToggleRef = useRef(0);
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const logoSrc = isDark ? "/src/assets/elementos/LogotipoUTSLRC-BLANCO.webp" : "/src/assets/elementos/LogotipoUTSLRC.webp";
  const superiorImage = new URL("../../assets/elementos/superior.webp", import.meta.url).href;
  const inferiorImage = new URL("../../assets/elementos/inferior.webp", import.meta.url).href;

  const pageBackground = isDark
    ? "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
    : "bg-gradient-to-br from-white via-slate-50 to-white";
  const cardSurface = isDark
    ? "bg-slate-950/85 border-slate-800/80 shadow-[0_24px_70px_rgba(0,0,0,0.45)]"
    : "bg-white border-slate-100/50 shadow-2xl";
  const labelText = isDark ? "text-white" : "text-slate-700";
  const helperText = isDark ? "text-slate-400" : "text-slate-500";
  const inputClasses =
    "h-12 rounded-xl border bg-white/95 pl-12 pr-14 text-base text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#3BBF82] focus:border-transparent transition-all duration-200 hover:border-slate-300 dark:bg-white/95 dark:text-slate-900 dark:placeholder:text-slate-400 dark:border-slate-300 dark:hover:border-slate-400";

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
    } catch {
      // Mensaje visible se maneja globalmente desde AuthContext/App.
    } finally {
      setIsLoading(false);
    }
  };

  const handleThemeToggle = () => {
    const now = Date.now();
    if (now - lastThemeToggleRef.current < THEME_TOGGLE_COOLDOWN_MS) {
      return;
    }
    lastThemeToggleRef.current = now;
    toggleTheme();
  };

  const openForgotPassword = () => {
    setForgotEmail(email);
    setForgotStep("email");
    setForgotCode("");
    setForgotNewPassword("");
    setForgotConfirmPassword("");
    setForgotError("");
    setForgotSuccess("");
    setIsForgotFlipped(true);
  };

  const closeForgotPassword = () => {
    setIsForgotFlipped(false);
  };

  const handleForgotEmailSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setForgotError("");
    setForgotLoading(true);
    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: forgotEmail }),
      });
      setForgotStep("code");
    } catch {
      toast.error("No se pudo enviar el código. Verifica tu correo e intenta de nuevo.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResendCode = async () => {
    setForgotError("");
    setForgotCode("");
    setForgotLoading(true);
    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: forgotEmail }),
      });
      toast.success("¡Código reenviado! Revisa tu bandeja de entrada.");
    } catch {
      toast.error("No se pudo reenviar el código. Inténtalo de nuevo.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setForgotError("");
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError("Las contraseñas no coinciden.");
      return;
    }
    if (forgotNewPassword.length < 8) {
      setForgotError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setForgotLoading(true);
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email: forgotEmail,
          token: forgotCode,
          password: forgotNewPassword,
          password_confirmation: forgotConfirmPassword,
        }),
      });
      // Cerrar dialog y volver al login
      setForgotStep("email");
      setForgotCode("");
      setForgotNewPassword("");
      setForgotConfirmPassword("");
      setForgotError("");
      setIsForgotFlipped(false);
      toast.success("¡Contraseña cambiada exitosamente! Ya puedes iniciar sesión con tu nueva contraseña.", {
        duration: 6000,
      });
    } catch (err: any) {
      if (err?.status === 422) {
        const apiErrors = err?.errors?.token ?? err?.errors?.password;
        const msg = Array.isArray(apiErrors) ? apiErrors[0] : "Código incorrecto o expirado. Solicita uno nuevo.";
        setForgotError(msg);
      } else {
        toast.error("Ocurrió un error al cambiar la contraseña. Inténtalo de nuevo más tarde.");
      }
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className={`${pageBackground} min-h-screen overflow-hidden relative`}>
      {/* BACKGROUND - Gradientes y decoraciones mejoradas */}
      <div className="absolute inset-0">
        <img
          src={superiorImage}
          alt="Decoración superior"
          className="absolute top-0 right-0 w-24 sm:w-32 lg:w-40 pointer-events-none select-none z-0"
        />
        <img
          src={inferiorImage}
          alt="Decoración inferior"
          className="absolute bottom-0 left-0 w-24 sm:w-32 lg:w-40 pointer-events-none select-none z-0"
        />

        {/* Manchas de gradiente principales */}
        <div className="absolute top-0 left-0 w-[700px] h-[700px] bg-slate-700/10 blur-3xl rounded-full -translate-x-1/3 -translate-y-1/3 dark:bg-slate-600/20" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-slate-700/10 blur-3xl rounded-full translate-x-1/4 translate-y-1/4 dark:bg-slate-600/20" />
        <div className="hidden lg:block absolute bottom-8 right-8 w-48 h-48 bg-slate-700/10 blur-2xl rounded-full pointer-events-none dark:bg-slate-600/20" />
        
        {/* Manchas adicionales de color sutil */}
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-blue-300/3 blur-3xl rounded-full pointer-events-none dark:bg-blue-400/10" />
        <div className="absolute top-2/3 right-1/3 w-80 h-80 bg-slate-700/8 blur-3xl rounded-full pointer-events-none dark:bg-slate-600/15" />
        
      </div>

      <div className="relative z-10 min-h-screen grid lg:grid-cols-2">
        {/* ===================================================== */}
        {/* COLUMNA IZQUIERDA - CONTENIDO VISUAL */}
        {/* ===================================================== */}
        <div className="hidden lg:flex items-center justify-center px-8 xl:px-12 relative">
          {/* CONTENIDO PRINCIPAL */}
          <div className="max-w-2xl relative z-10 min-h-[560px] w-full">
            {/* LOGO - Bloque independiente */}
            <div className="absolute left-0 top-[-56px]">
              <img
                src={logoSrc}
                alt="Logo Institucional"
                className="h-19 w-auto object-contain"
              />
            </div>

            {/* TÍTULO - Bloque independiente */}
            <div className="absolute left-0 top-16 max-w-[38rem]">
              <h1 className="text-[58px] lg:text-[64px] leading-[0.98] font-black tracking-tight text-slate-900 dark:text-slate-50 drop-shadow-sm">
                <span className="whitespace-nowrap">Sistema de Gestión</span>
                <span className="hidden lg:block text-[#3BBF82] dark:text-emerald-300">Académica Digital</span>
              </h1>
            </div>

            {/* TEXTO - Bloque independiente */}
            <div className="absolute left-0 top-[210px] max-w-[38rem]">
              <p className={`${isDark ? "text-slate-300" : "text-slate-600"} text-lg lg:text-xl leading-relaxed font-medium text-justify`}>
                Esta plataforma digital facilita la transición hacia el uso eficiente de documentos
                digitales, optimizando los flujos de trabajo de suma y documentación pertinentes en la
                institución.
              </p>
            </div>

            {/* MASCOTA - Bloque independiente con efecto flotante */}
            <div className="absolute right-[-180px] top-[300px] z-20">
              <div className="relative w-80 h-80 xl:w-[24rem] xl:h-[24rem] flex items-center justify-center">
                {/* Efecto de glow detrás del gallo */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#3BBF82]/10 to-[#3BBF82]/5 rounded-full blur-3xl" />
                
                {/* Aro decorativo */}
                <div className="absolute inset-0 border-2 border-[#3BBF82]/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 " />
                
                {/* Imagen del gallo */}
                <img
                  src="/src/assets/elementos/mascota3.webp"
                  alt="Mascota institucional"
                  className="relative z-10 h-full w-full object-contain drop-shadow-2xl transition-transform duration-300 hover:scale-110 origin-center -translate-y-12"
                />
                
              </div>
            </div>

            {/* Elementos visuales (círculo + tarjetas) eliminados según solicitud */}
          </div>
        </div>

        {/* ===================================================== */}
        {/* COLUMNA DERECHA - FORMULARIO DE LOGIN */}
        {/* ===================================================== */}
        <div className="flex items-center justify-center p-6 lg:p-10 relative">
          {/* DECORACIONES DE FONDO - Círculos, líneas y textura */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-14 -right-16 w-64 h-64 rounded-full bg-slate-700/10 blur-3xl opacity-60" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-slate-700/8 blur-3xl opacity-55" />
          </div>

          {/* TARJETA DE LOGIN CON DECORACIONES */}
          <Card className={`w-full max-w-md rounded-3xl backdrop-blur-sm relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(59,191,130,0.18)] hover:border-[#3BBF82]/20 group will-change-transform animate-in fade-in slide-in-from-bottom-1 ${cardSurface}`}>
            <div className="absolute -top-20 -right-12 w-56 h-56 rounded-full bg-slate-700/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-16 w-64 h-64 rounded-full bg-slate-700/10 blur-3xl pointer-events-none" />

            <CardContent className="p-8 lg:p-10 relative">

              {/* Versión Mobile */}
              <div className="lg:hidden text-center mb-8">
                <img src={logoSrc} alt="Logo Institucional" className="mx-auto h-12 w-auto" />
              </div>

              {/* Versión Desktop */}
              <div className="text-center mb-8">
                <div className="mb-6">
                  <div className="w-16 h-1 bg-gradient-to-r from-[#3BBF82] to-[#2da06a] rounded-full mx-auto mb-4" />
                  <p className="text-sm font-semibold text-[#3BBF82] uppercase tracking-wider">
                    Bienvenido
                  </p>
                </div>
                {isForgotFlipped ? (
                  <p className={`${helperText} mt-2 text-center`}>
                    Recupera el acceso a tu cuenta institucional
                  </p>
                ) : (
                  <p className={`${helperText} mt-2 text-center`}>
                    <span className="lg:hidden">Accede al sistema de gestión académica digital</span>
                    <span className="hidden lg:inline">Accede a tu plataforma académica institucional</span>
                  </p>
                )}
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mb-8 dark:via-slate-700" />

              <div className="relative [perspective:1800px]">
                <div
                  className={`relative transition-transform duration-700 [transform-style:preserve-3d] ${
                    isForgotFlipped ? "[transform:rotateY(180deg)]" : ""
                  }`}
                >
                  <div className="w-full [backface-visibility:hidden]">
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="space-y-2 group/email">
                        <Label htmlFor="email" className={`${labelText} font-medium text-sm`}>
                          Correo Electrónico
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500 group-focus-within/email:text-[#3BBF82] transition-colors" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="Ingresa tu correo institucional"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={isLoading}
                            className={`${inputClasses} pl-12`}
                          />
                        </div>
                      </div>

                      <div className="space-y-2 group/password">
                        <Label htmlFor="password" className={`${labelText} font-medium text-sm`}>
                          Contraseña
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500 group-focus-within/password:text-[#3BBF82] transition-colors" />
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={isLoading}
                            className={`${inputClasses} pl-12`}
                          />

                          <button
                            type="button"
                            onClick={() => setShowPassword((s) => !s)}
                            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                            title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#3BBF82] transition-colors duration-200 dark:text-slate-400"
                          >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-12 rounded-xl bg-gradient-to-r from-[#3BBF82] to-[#2da06a] hover:from-[#2da06a] hover:to-[#1f7a54] text-white font-semibold text-base shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Ingresando...
                          </>
                        ) : (
                          "Iniciar sesión"
                        )}
                      </Button>

                      <button
                        type="button"
                        className="w-full text-center text-xs font-medium text-[#3BBF82] hover:underline transition-colors duration-200"
                        aria-label="Olvidaste la contraseña"
                        onClick={openForgotPassword}
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </form>
                  </div>

                  <div className="absolute inset-0 w-full [backface-visibility:hidden] [transform:rotateY(180deg)]">

                    {/* ── PASO 1: Ingresar correo ── */}
                    {forgotStep === "email" && (
                      <form onSubmit={handleForgotEmailSubmit} className="space-y-5">
                        <div className="text-center">
                          <h2 className={`text-xl font-bold ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                            ¿Olvidaste tu contraseña?
                          </h2>
                          <p className={`mt-1 text-sm ${helperText}`}>
                            Te enviaremos un código de 6 dígitos a tu correo
                          </p>
                        </div>

                        <div className="space-y-2 group/forgot-email">
                          <Label htmlFor="forgot-email" className={`${labelText} font-medium text-sm`}>
                            Correo Electrónico
                          </Label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500 group-focus-within/forgot-email:text-[#3BBF82] transition-colors" />
                            <Input
                              id="forgot-email"
                              type="email"
                              value={forgotEmail}
                              onChange={(e) => setForgotEmail(e.target.value)}
                              placeholder="Ingresa tu correo institucional"
                              className={`${inputClasses} pl-12`}
                              required
                              disabled={forgotLoading}
                            />
                          </div>
                        </div>

                        <Button
                          type="submit"
                          disabled={forgotLoading}
                          className="w-full h-12 rounded-xl bg-gradient-to-r from-[#3BBF82] to-[#2da06a] hover:from-[#2da06a] hover:to-[#1f7a54] text-white font-semibold text-base shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                        >
                          {forgotLoading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando código...</>
                          ) : "Enviar código"}
                        </Button>

                        <button
                          type="button"
                          className="w-full text-center text-xs font-medium text-[#3BBF82] hover:underline transition-colors duration-200"
                          onClick={closeForgotPassword}
                        >
                          ¿Ya recuerdas tu contraseña? Inicia sesión
                        </button>
                      </form>
                    )}

                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleThemeToggle}
        aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full border-[#3BBF82]/40 bg-white/85 text-slate-800 shadow-lg backdrop-blur hover:bg-white dark:bg-slate-900/85 dark:text-slate-100 dark:hover:bg-slate-900"
      >
        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </Button>

      {/* ── MODAL PASO 2: Código + nueva contraseña ── */}
      <Dialog open={forgotStep === "code"} onOpenChange={(open) => { if (!open) { setForgotStep("email"); setForgotError(""); setForgotCode(""); setForgotNewPassword(""); setForgotConfirmPassword(""); } }}>
        <DialogContent className="sm:max-w-md dark:bg-slate-950 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-center text-xl dark:text-white">Ingresa tu código</DialogTitle>
            <DialogDescription className="text-center dark:text-slate-400">
              Revisa tu correo <span className="font-semibold text-foreground dark:text-slate-200">{forgotEmail}</span> · El código expira en <span className="font-semibold text-amber-500">30 min</span>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleResetPasswordSubmit} className="space-y-4 pt-2">
            {/* Campo código */}
            <div className="space-y-2 group/modal-code">
              <Label htmlFor="modal-code" className="font-medium text-sm dark:text-white">
                Código de verificación
              </Label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within/modal-code:text-[#3BBF82] transition-colors" />
                <Input
                  id="modal-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  value={forgotCode}
                  onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="● ● ● ● ● ●"
                  className={`${inputClasses} pl-12 text-center font-mono text-xl tracking-[0.5em]`}
                  required
                  disabled={forgotLoading}
                  autoFocus
                />
              </div>
            </div>

            {/* Nueva contraseña */}
            <div className="space-y-2 group/modal-new">
              <Label htmlFor="modal-new-password" className="font-medium text-sm dark:text-white">
                Nueva contraseña
              </Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within/modal-new:text-[#3BBF82] transition-colors" />
                <Input
                  id="modal-new-password"
                  type={showForgotNew ? "text" : "password"}
                  autoComplete="new-password"
                  value={forgotNewPassword}
                  onChange={(e) => setForgotNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className={`${inputClasses} pl-12 pr-12`}
                  required
                  disabled={forgotLoading}
                />
                <button type="button" onClick={() => setShowForgotNew((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#3BBF82] transition-colors dark:text-slate-400">
                  {showForgotNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Confirmar contraseña */}
            <div className="space-y-2 group/modal-confirm">
              <Label htmlFor="modal-confirm-password" className="font-medium text-sm dark:text-white">
                Confirmar contraseña
              </Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within/modal-confirm:text-[#3BBF82] transition-colors" />
                <Input
                  id="modal-confirm-password"
                  type={showForgotConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  value={forgotConfirmPassword}
                  onChange={(e) => setForgotConfirmPassword(e.target.value)}
                  placeholder="Repite la nueva contraseña"
                  className={`${inputClasses} pl-12 pr-12`}
                  required
                  disabled={forgotLoading}
                />
                <button type="button" onClick={() => setShowForgotConfirm((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#3BBF82] transition-colors dark:text-slate-400">
                  {showForgotConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {forgotError && (
              <p className="text-sm text-red-500 dark:text-red-400 text-center font-medium">{forgotError}</p>
            )}

            <Button
              type="submit"
              disabled={forgotLoading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-[#3BBF82] to-[#2da06a] hover:from-[#2da06a] hover:to-[#1f7a54] text-white font-semibold text-base shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
            >
              {forgotLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cambiando contraseña...</>
              ) : "Cambiar contraseña"}
            </Button>

            <button
              type="button"
              onClick={() => void handleResendCode()}
              disabled={forgotLoading}
              className="w-full flex items-center justify-center gap-1.5 h-9 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors disabled:opacity-50"
            >
              {forgotLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
              Reenviar código
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}