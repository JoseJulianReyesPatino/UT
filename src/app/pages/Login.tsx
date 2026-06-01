import React, { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent } from "../components/ui/card";
import { Loader2, Mail, Lock, Eye, EyeOff, Sun, Moon } from "lucide-react";
import superiorImage from "../../assets/superior.png";
import inferiorImage from "../../assets/inferior.png";

export function Login() {
  const THEME_TOGGLE_COOLDOWN_MS = 700;
  const topDots = Array.from({ length: 16 }, (_, index) => `login-dot-top-${index}`);
  const bottomDots = Array.from({ length: 15 }, (_, index) => `login-dot-bottom-${index}`);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const lastThemeToggleRef = useRef(0);
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const logoSrc = isDark ? "/src/assets/LogotipoUTSLRC-BLANCO.png" : "/src/assets/LogotipoUTSLRC.png";

  const pageBackground = isDark
    ? "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
    : "bg-gradient-to-br from-white via-slate-50 to-white";
  const titleText = isDark ? "text-slate-50" : "text-slate-900";
  const cardSurface = isDark
    ? "bg-slate-950/85 border-slate-800/80 shadow-[0_24px_70px_rgba(0,0,0,0.45)]"
    : "bg-white border-slate-100/50 shadow-2xl";
  const labelText = isDark ? "text-slate-200" : "text-slate-700";
  const helperText = isDark ? "text-slate-400" : "text-slate-500";
  const inputClasses =
    "h-12 rounded-xl border bg-white/95 pl-12 pr-14 text-base text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#3BBF82] focus:border-transparent transition-all duration-200 hover:border-slate-300 dark:bg-slate-900/80 dark:text-slate-100 dark:placeholder:text-slate-500 dark:border-slate-700 dark:hover:border-slate-600";

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
        <div className="absolute top-0 left-0 w-[700px] h-[700px] bg-[#3BBF82]/5 blur-3xl rounded-full -translate-x-1/3 -translate-y-1/3 dark:bg-[#3BBF82]/10" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#3BBF82]/5 blur-3xl rounded-full translate-x-1/4 translate-y-1/4 dark:bg-[#3BBF82]/10" />
        <div className="hidden lg:block absolute bottom-8 right-8 w-48 h-48 bg-[#3BBF82]/12 blur-2xl rounded-full pointer-events-none dark:bg-[#3BBF82]/18" />
        
        {/* Manchas adicionales de color sutil */}
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-blue-300/3 blur-3xl rounded-full pointer-events-none dark:bg-blue-400/10" />
        <div className="absolute top-2/3 right-1/3 w-80 h-80 bg-emerald-200/3 blur-3xl rounded-full pointer-events-none dark:bg-emerald-400/10" />
        
        {/* Líneas decorativas sutiles */}
        <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#3BBF82]/20 to-transparent opacity-50 dark:via-[#3BBF82]/30" />
        <div className="hidden lg:block absolute top-3/4 right-0 w-1/2 h-px bg-gradient-to-r from-transparent via-[#3BBF82]/15 to-transparent opacity-40 dark:via-[#3BBF82]/25" />

        {/* Textura distribuida por toda la página */}
        <div className="absolute top-8 left-6 w-2 h-2 rounded-full bg-[#3BBF82]/30 dark:bg-[#3BBF82]/45" />
        <div className="absolute top-16 right-[14%] w-1.5 h-1.5 rounded-full bg-[#3BBF82]/35 dark:bg-[#3BBF82]/50" />
        <div className="absolute top-[22%] left-[10%] w-2 h-2 rounded-full border border-[#3BBF82]/25 opacity-50 dark:border-[#3BBF82]/40" />
        <div className="absolute top-[34%] right-[30%] w-1.5 h-1.5 rounded-full bg-[#3BBF82]/25 dark:bg-[#3BBF82]/40" />
        <div className="absolute bottom-[22%] left-[18%] w-3 h-3 rounded-full border-2 border-[#3BBF82]/15 opacity-40 dark:border-[#3BBF82]/30" />
        <div className="absolute bottom-[14%] right-[22%] w-2 h-2 rounded-full bg-[#3BBF82]/25 dark:bg-[#3BBF82]/40" />
        <div className="absolute top-[12%] left-[48%] w-32 h-px bg-gradient-to-r from-transparent via-[#3BBF82]/18 to-transparent rotate-12 dark:via-[#3BBF82]/28" />
        <div className="absolute top-[30%] right-[6%] w-24 h-px bg-gradient-to-r from-transparent via-[#3BBF82]/15 to-transparent -rotate-45 dark:via-[#3BBF82]/25" />
        <div className="absolute bottom-[26%] left-[7%] w-28 h-px bg-gradient-to-r from-transparent via-[#3BBF82]/18 to-transparent -rotate-12 dark:via-[#3BBF82]/28" />
        <div className="absolute bottom-[8%] right-[46%] w-20 h-20 rounded-full border border-[#3BBF82]/10 opacity-40 dark:border-[#3BBF82]/25" />
      </div>

      <div className="relative z-10 min-h-screen grid lg:grid-cols-2">
        {/* ===================================================== */}
        {/* COLUMNA IZQUIERDA - CONTENIDO VISUAL */}
        {/* ===================================================== */}
        <div className="hidden lg:flex items-center justify-center px-8 xl:px-12 relative">
          {/* DECORACIONES SUPERIORES - Cuadrícula de puntos */}
          <div className="absolute top-10 right-8 h-1.5 w-1.5 rounded-full bg-[#3BBF82]/35 dark:bg-[#3BBF82]/50" />
          <div className="absolute top-18 right-20 h-1 w-1 rounded-full bg-[#3BBF82]/30 dark:bg-[#3BBF82]/45" />
          <div className="absolute top-28 right-12 h-2 w-2 rounded-full border border-[#3BBF82]/25 opacity-50 dark:border-[#3BBF82]/40" />
          <div className="absolute top-6 right-[22%] h-px w-16 bg-gradient-to-r from-transparent via-[#3BBF82]/20 to-transparent rotate-12 dark:via-[#3BBF82]/30" />
          <div className="absolute top-24 right-[28%] h-px w-20 bg-gradient-to-r from-transparent via-[#3BBF82]/15 to-transparent -rotate-45 dark:via-[#3BBF82]/25" />
          <div className="absolute top-36 right-[18%] h-1.5 w-1.5 rounded-full bg-[#3BBF82]/30 dark:bg-[#3BBF82]/45" />

          {/* DECORACIONES LATERALES - Líneas verticales sutil */}
          <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-gradient-to-b from-transparent via-[#3BBF82]/20 to-transparent opacity-50 dark:via-[#3BBF82]/30" />
          <div className="absolute left-6 top-[18%] h-24 w-px bg-gradient-to-b from-transparent via-[#3BBF82]/18 to-transparent rotate-12 dark:via-[#3BBF82]/28" />
          <div className="absolute left-12 bottom-[18%] h-20 w-px bg-gradient-to-b from-transparent via-[#3BBF82]/14 to-transparent -rotate-12 dark:via-[#3BBF82]/24" />
          
          {/* PUNTOS DECORATIVOS ADICIONALES - Esquina inferior izquierda */}
          <div className="absolute bottom-20 left-8 h-1 w-1 rounded-full bg-[#3BBF82]/40 dark:bg-[#3BBF82]/55" />
          <div className="absolute bottom-28 left-20 h-1.5 w-1.5 rounded-full bg-[#3BBF82]/30 dark:bg-[#3BBF82]/45" />
          <div className="absolute bottom-36 left-12 h-px w-12 bg-gradient-to-r from-transparent via-[#3BBF82]/18 to-transparent rotate-45 dark:via-[#3BBF82]/28" />
          <div className="absolute bottom-14 left-28 h-2 w-2 rounded-full border border-[#3BBF82]/20 opacity-50 dark:border-[#3BBF82]/35" />

          {/* CÍRCULOS DECORATIVOS - Diferentes tamaños */}
          <div className="absolute top-16 left-12 w-2 h-2 rounded-full border border-[#3BBF82]/30 opacity-60" />
          <div className="absolute top-32 left-6 w-3 h-3 rounded-full border border-[#3BBF82]/20 opacity-40" />
          <div className="absolute bottom-40 left-16 w-4 h-4 rounded-full border-2 border-[#3BBF82]/25 opacity-50" />
          <div className="absolute bottom-1/3 right-1/4 w-2 h-2 rounded-full bg-[#3BBF82]/30 opacity-60" />

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
                  src="/src/assets/mascota3.png"
                  alt="Mascota institucional"
                  className="relative z-10 h-full w-full object-contain drop-shadow-2xl transition-transform duration-300 hover:scale-110 origin-center -translate-y-12"
                />
                
                {/* Puntos decorativos alrededor */}
                <div className="absolute top-0 right-0 w-3 h-3 rounded-full bg-[#3BBF82]/40" />
                <div className="absolute bottom-0 left-0 w-2 h-2 rounded-full bg-[#3BBF82]/30" />
              </div>
            </div>

            {/* Puntos decorativos extra - INDEPENDIENTES */}
            <div className="absolute top-[336px] right-[128px] grid grid-cols-4 gap-2 opacity-30 z-10">
              {topDots.map((id) => (
                <div key={id} className="h-1.5 w-1.5 rounded-full bg-[#3BBF82]" />
              ))}
            </div>

            <div className="absolute top-[520px] right-[-150px] grid grid-cols-5 gap-2 opacity-25 z-10">
              {bottomDots.map((id) => (
                <div key={id} className="h-1 w-1 rounded-full bg-[#3BBF82]" />
              ))}
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
            <div className="absolute -top-20 -right-20 w-64 h-64 border border-[#3BBF82]/10 rounded-full opacity-50" />
            <div className="absolute -bottom-32 -left-32 w-80 h-80 border border-[#3BBF82]/8 rounded-full opacity-40" />
            <div className="absolute top-0 right-1/3 w-px h-32 bg-gradient-to-b from-[#3BBF82]/30 to-transparent opacity-50" />
            <div className="absolute bottom-0 left-1/4 w-px h-40 bg-gradient-to-t from-[#3BBF82]/20 to-transparent opacity-40" />
            <div className="absolute top-12 left-10 w-24 h-px bg-gradient-to-r from-transparent via-[#3BBF82]/20 to-transparent rotate-45 dark:via-[#3BBF82]/30" />
            <div className="absolute bottom-20 right-8 w-28 h-px bg-gradient-to-r from-transparent via-[#3BBF82]/18 to-transparent -rotate-45 dark:via-[#3BBF82]/28" />
            <div className="absolute top-20 right-28 w-16 h-px bg-gradient-to-r from-transparent via-[#3BBF82]/16 to-transparent rotate-12 dark:via-[#3BBF82]/24" />
            <div className="absolute bottom-32 left-16 w-20 h-px bg-gradient-to-r from-transparent via-[#3BBF82]/16 to-transparent -rotate-12 dark:via-[#3BBF82]/24" />
            <div className="absolute top-8 right-8 w-2 h-2 rounded-full bg-[#3BBF82]/40 dark:bg-[#3BBF82]/55" />
            <div className="absolute bottom-12 right-16 w-1.5 h-1.5 rounded-full bg-[#3BBF82]/30 dark:bg-[#3BBF82]/45" />
            <div className="absolute top-1/3 left-4 w-1.5 h-1.5 rounded-full bg-[#3BBF82]/25 dark:bg-[#3BBF82]/40" />
            <div className="absolute top-1/4 right-24 w-16 h-16 rounded-full border border-[#3BBF82]/10 opacity-50 dark:border-[#3BBF82]/25" />
            <div className="absolute bottom-1/4 left-10 w-12 h-12 rounded-full bg-[#3BBF82]/5 blur-2xl dark:bg-[#3BBF82]/10" />
            <div className="absolute top-14 left-8 h-1.5 w-1.5 rounded-full bg-[#3BBF82]/35 dark:bg-[#3BBF82]/50" />
            <div className="absolute top-24 left-20 h-1 w-1 rounded-full bg-[#3BBF82]/28 dark:bg-[#3BBF82]/42" />
            <div className="absolute top-10 right-14 h-1 w-1 rounded-full bg-[#3BBF82]/30 dark:bg-[#3BBF82]/45" />
            <div className="absolute top-28 right-10 h-px w-14 bg-gradient-to-r from-transparent via-[#3BBF82]/16 to-transparent rotate-45 dark:via-[#3BBF82]/24" />
            <div className="absolute bottom-20 right-8 h-1.5 w-1.5 rounded-full bg-[#3BBF82]/30 dark:bg-[#3BBF82]/45" />
            <div className="absolute bottom-28 right-20 h-px w-16 bg-gradient-to-r from-transparent via-[#3BBF82]/16 to-transparent -rotate-12 dark:via-[#3BBF82]/24" />
            <div className="absolute bottom-1/4 left-8 w-32 h-32 rounded-full bg-sky-300/5 blur-3xl dark:bg-sky-400/10" />
          </div>

          {/* TARJETA DE LOGIN CON DECORACIONES */}
          <Card className={`w-full max-w-md rounded-3xl backdrop-blur-sm relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(59,191,130,0.18)] hover:border-[#3BBF82]/20 group will-change-transform animate-in fade-in slide-in-from-bottom-1 ${cardSurface}`}>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#3BBF82]/40 to-transparent opacity-60" />
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#3BBF82]/20 to-transparent opacity-40" />
            <div className="absolute -top-20 -right-12 w-56 h-56 rounded-full bg-[#3BBF82]/5 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-16 w-64 h-64 rounded-full bg-emerald-200/20 blur-3xl pointer-events-none" />

            <CardContent className="p-8 lg:p-10 relative">
              <div className="absolute inset-x-8 top-6 h-px bg-gradient-to-r from-transparent via-[#3BBF82]/15 to-transparent" />
              <div className="absolute inset-y-16 right-4 w-px bg-gradient-to-b from-transparent via-[#3BBF82]/10 to-transparent" />

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
                <p className={`${helperText} mt-2 text-center`}>
                  <span className="lg:hidden">Accede al sistema de gestión académica digital</span>
                  <span className="hidden lg:inline">Accede a tu plataforma académica institucional</span>
                </p>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mb-8 dark:via-slate-700" />

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

                <div className="text-center mt-3">
                  <button
                    type="button"
                    className="text-sm text-[#3BBF82] hover:underline font-medium"
                    aria-label="Olvidaste la contraseña"
                  >
                    ¿Olvidaste la contraseña?
                  </button>
                </div>
              </form>
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
    </div>
  );
}

