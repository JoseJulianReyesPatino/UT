import electromecanicaClaro from "../../assets/logotipos_carreras/Electromecanica_Industrial_claro.webp";
import electromecanicaOscuro from "../../assets/logotipos_carreras/Electromecanica_Industrial_oscuro.webp";
import energiaClaro from "../../assets/logotipos_carreras/Energia_renobable_claro.webp";
import energiaOscuro from "../../assets/logotipos_carreras/Energia_renobable_oscuro.webp";
import mecatronicaClaro from "../../assets/logotipos_carreras/logo-mecatronica_claro.webp";
import mecatronicaOscuro from "../../assets/logotipos_carreras/logo-mecatronica_oscuro.webp";
import negociosClaro from "../../assets/logotipos_carreras/Negocios_claro.webp";
import negociosOscuro from "../../assets/logotipos_carreras/Negocios_oscuro.webp";
import ociClaro from "../../assets/logotipos_carreras/Oci_logotipo_claro.webp";
import ociOscuro from "../../assets/logotipos_carreras/Oci_logotipo_oscuro.webp";
import bioalimentariosClaro from "../../assets/logotipos_carreras/Procesos_Bioalimentarios-claro.webp";
import bioalimentariosOscuro from "../../assets/logotipos_carreras/Procesos_Bioalimentarios-oscuro.webp";
import tiClaro from "../../assets/logotipos_carreras/TI2-claro.webp";
import tiOscuro from "../../assets/logotipos_carreras/TI-oscuro.webp";

const CARRERAS: { claro: string; oscuro: string; alt: string }[] = [
  { claro: mecatronicaClaro,     oscuro: mecatronicaOscuro,     alt: "Mecatrónica" },
  { claro: electromecanicaClaro, oscuro: electromecanicaOscuro, alt: "Electromecánica Industrial" },
  { claro: energiaClaro,         oscuro: energiaOscuro,         alt: "Energía Renovable" },
  { claro: negociosClaro,        oscuro: negociosOscuro,        alt: "Negocios" },
  { claro: ociClaro,             oscuro: ociOscuro,             alt: "OCI" },
  { claro: bioalimentariosClaro, oscuro: bioalimentariosOscuro, alt: "Procesos Bioalimentarios" },
  { claro: tiClaro,              oscuro: tiOscuro,              alt: "Tecnologías de Información" },
];

const SPEED = 35;

export function CarrerasLogoSlider() {
  const track = [...CARRERAS, ...CARRERAS];

  return (
    <div className="relative mt-6 w-full overflow-hidden rounded-2xl border border-border/70 bg-white shadow-sm dark:border-slate-800/70 dark:bg-slate-950/60">
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-16 bg-gradient-to-r from-white to-transparent dark:from-slate-950 sm:w-24" />
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 bg-gradient-to-l from-white to-transparent dark:from-slate-950 sm:w-24" />

      <div
        className="flex items-center hover:[animation-play-state:paused]"
        style={{
          width: `calc(220px * ${track.length})`,
          animation: `carreras-scroll ${SPEED}s linear infinite`,
        }}
      >
        {track.map((carrera, i) => (
          <div key={i} className="flex h-[100px] w-[220px] shrink-0 items-center justify-center px-6">
            <img src={carrera.claro} alt={carrera.alt} className="max-h-[72px] max-w-[180px] object-contain dark:hidden" />
            <img src={carrera.oscuro} alt={carrera.alt} className="max-h-[72px] max-w-[180px] object-contain hidden dark:block" />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes carreras-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(calc(-220px * ${CARRERAS.length})); }
        }
      `}</style>
    </div>
  );
}
