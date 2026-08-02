export type AppThemeId =
  | "emerald" | "ocean"   | "violet"
  | "rose"    | "amber"   | "indigo"
  | "red"     | "orange"  | "cyan"
  | "lime"    | "teal"    | "fuchsia"
  | "white"   | "black";

export interface AppTheme {
  id: AppThemeId;
  label: string;
  description: string;
  preview: string;
}

export const APP_THEMES: AppTheme[] = [
  { id: "emerald", label: "Verde",    description: "Predeterminado", preview: "#10b981" },
  { id: "ocean",   label: "Azul",     description: "",               preview: "#3b82f6" },
  { id: "violet",  label: "Morado",   description: "",               preview: "#8b5cf6" },
  { id: "rose",    label: "Rosa",     description: "",               preview: "#f43f5e" },
  { id: "amber",   label: "Amarillo", description: "",               preview: "#f59e0b" },
  { id: "indigo",  label: "Índigo",   description: "",               preview: "#6366f1" },
  { id: "red",     label: "Rojo",     description: "",               preview: "#ef4444" },
  { id: "orange",  label: "Naranja",  description: "",               preview: "#f97316" },
  { id: "cyan",    label: "Cian",     description: "",               preview: "#06b6d4" },
  { id: "lime",    label: "Lima",     description: "",               preview: "#84cc16" },
  { id: "teal",    label: "Turquesa", description: "",               preview: "#14b8a6" },
  { id: "fuchsia", label: "Fucsia",   description: "",               preview: "#d946ef" },
  { id: "white",   label: "Blanco",   description: "",               preview: "#ffffff" },
  { id: "black",   label: "Negro",    description: "",               preview: "#27272a" },
];

// En Tailwind v4 los utilitarios bg-emerald-*, text-emerald-*, etc. referencian variables
// CSS --color-emerald-{shade}. Sobrescribir estas variables en :root cambia todos los
// colores emerald del sistema sin tocar ningún componente.
const OCEAN_VARS: Record<string, string> = {
  "--color-emerald-50":  "oklch(0.970 0.014 237.323)",
  "--color-emerald-100": "oklch(0.932 0.032 254.585)",
  "--color-emerald-200": "oklch(0.882 0.059 254.128)",
  "--color-emerald-300": "oklch(0.809 0.105 251.813)",
  "--color-emerald-400": "oklch(0.707 0.165 254.624)",
  "--color-emerald-500": "oklch(0.623 0.214 259.815)",
  "--color-emerald-600": "oklch(0.546 0.245 262.881)",
  "--color-emerald-700": "oklch(0.488 0.243 264.376)",
  "--color-emerald-800": "oklch(0.424 0.199 265.638)",
  "--color-emerald-900": "oklch(0.379 0.146 265.522)",
  "--color-emerald-950": "oklch(0.282 0.091 267.935)",
};

const VIOLET_VARS: Record<string, string> = {
  "--color-emerald-50":  "oklch(0.969 0.016 293.756)",
  "--color-emerald-100": "oklch(0.943 0.029 294.588)",
  "--color-emerald-200": "oklch(0.894 0.057 293.283)",
  "--color-emerald-300": "oklch(0.811 0.111 293.571)",
  "--color-emerald-400": "oklch(0.702 0.183 293.541)",
  "--color-emerald-500": "oklch(0.606 0.250 292.717)",
  "--color-emerald-600": "oklch(0.541 0.281 293.009)",
  "--color-emerald-700": "oklch(0.491 0.270 292.581)",
  "--color-emerald-800": "oklch(0.432 0.232 292.759)",
  "--color-emerald-900": "oklch(0.380 0.189 293.745)",
  "--color-emerald-950": "oklch(0.283 0.141 291.089)",
};

const ROSE_VARS: Record<string, string> = {
  "--color-emerald-50":  "oklch(0.969 0.015 12.422)",
  "--color-emerald-100": "oklch(0.941 0.030 12.582)",
  "--color-emerald-200": "oklch(0.892 0.058 10.001)",
  "--color-emerald-300": "oklch(0.810 0.117 11.638)",
  "--color-emerald-400": "oklch(0.712 0.194 13.428)",
  "--color-emerald-500": "oklch(0.645 0.246 16.439)",
  "--color-emerald-600": "oklch(0.586 0.253 17.585)",
  "--color-emerald-700": "oklch(0.514 0.222 16.935)",
  "--color-emerald-800": "oklch(0.455 0.188 13.697)",
  "--color-emerald-900": "oklch(0.410 0.159 10.272)",
  "--color-emerald-950": "oklch(0.271 0.105 12.094)",
};

const AMBER_VARS: Record<string, string> = {
  "--color-emerald-50":  "oklch(0.987 0.022 95.277)",
  "--color-emerald-100": "oklch(0.962 0.059 95.617)",
  "--color-emerald-200": "oklch(0.924 0.120 95.746)",
  "--color-emerald-300": "oklch(0.879 0.169 91.605)",
  "--color-emerald-400": "oklch(0.828 0.189 84.429)",
  "--color-emerald-500": "oklch(0.769 0.188 70.080)",
  "--color-emerald-600": "oklch(0.666 0.179 58.318)",
  "--color-emerald-700": "oklch(0.555 0.163 48.998)",
  "--color-emerald-800": "oklch(0.473 0.137 46.201)",
  "--color-emerald-900": "oklch(0.414 0.112 45.904)",
  "--color-emerald-950": "oklch(0.279 0.077 45.635)",
};

const INDIGO_VARS: Record<string, string> = {
  "--color-emerald-50":  "oklch(0.962 0.018 272.314)",
  "--color-emerald-100": "oklch(0.930 0.034 272.788)",
  "--color-emerald-200": "oklch(0.870 0.065 274.039)",
  "--color-emerald-300": "oklch(0.785 0.115 274.713)",
  "--color-emerald-400": "oklch(0.673 0.182 276.935)",
  "--color-emerald-500": "oklch(0.585 0.233 277.117)",
  "--color-emerald-600": "oklch(0.511 0.262 276.966)",
  "--color-emerald-700": "oklch(0.457 0.240 277.023)",
  "--color-emerald-800": "oklch(0.398 0.195 277.366)",
  "--color-emerald-900": "oklch(0.359 0.144 278.697)",
  "--color-emerald-950": "oklch(0.257 0.090 281.288)",
};

const RED_VARS: Record<string, string> = {
  "--color-emerald-50":  "oklch(0.971 0.013 17.38)",
  "--color-emerald-100": "oklch(0.936 0.032 17.717)",
  "--color-emerald-200": "oklch(0.885 0.062 18.334)",
  "--color-emerald-300": "oklch(0.808 0.114 19.571)",
  "--color-emerald-400": "oklch(0.704 0.191 22.216)",
  "--color-emerald-500": "oklch(0.637 0.237 25.331)",
  "--color-emerald-600": "oklch(0.577 0.245 27.325)",
  "--color-emerald-700": "oklch(0.505 0.213 27.518)",
  "--color-emerald-800": "oklch(0.444 0.177 26.899)",
  "--color-emerald-900": "oklch(0.396 0.141 25.723)",
  "--color-emerald-950": "oklch(0.258 0.092 26.042)",
};

const ORANGE_VARS: Record<string, string> = {
  "--color-emerald-50":  "oklch(0.980 0.016 73.684)",
  "--color-emerald-100": "oklch(0.954 0.038 75.164)",
  "--color-emerald-200": "oklch(0.901 0.076 70.697)",
  "--color-emerald-300": "oklch(0.837 0.128 66.290)",
  "--color-emerald-400": "oklch(0.750 0.183 55.934)",
  "--color-emerald-500": "oklch(0.705 0.213 47.604)",
  "--color-emerald-600": "oklch(0.646 0.222 41.116)",
  "--color-emerald-700": "oklch(0.553 0.195 38.402)",
  "--color-emerald-800": "oklch(0.470 0.157 37.304)",
  "--color-emerald-900": "oklch(0.408 0.123 38.172)",
  "--color-emerald-950": "oklch(0.266 0.079 36.259)",
};

const CYAN_VARS: Record<string, string> = {
  "--color-emerald-50":  "oklch(0.984 0.019 200.873)",
  "--color-emerald-100": "oklch(0.956 0.045 203.388)",
  "--color-emerald-200": "oklch(0.917 0.080 205.041)",
  "--color-emerald-300": "oklch(0.865 0.127 207.078)",
  "--color-emerald-400": "oklch(0.789 0.154 211.530)",
  "--color-emerald-500": "oklch(0.715 0.143 215.221)",
  "--color-emerald-600": "oklch(0.609 0.126 221.723)",
  "--color-emerald-700": "oklch(0.520 0.105 223.128)",
  "--color-emerald-800": "oklch(0.450 0.085 224.283)",
  "--color-emerald-900": "oklch(0.398 0.070 227.392)",
  "--color-emerald-950": "oklch(0.302 0.056 229.695)",
};

const LIME_VARS: Record<string, string> = {
  "--color-emerald-50":  "oklch(0.986 0.031 120.757)",
  "--color-emerald-100": "oklch(0.967 0.067 122.328)",
  "--color-emerald-200": "oklch(0.938 0.127 124.321)",
  "--color-emerald-300": "oklch(0.897 0.196 126.665)",
  "--color-emerald-400": "oklch(0.841 0.238 128.850)",
  "--color-emerald-500": "oklch(0.768 0.233 130.850)",
  "--color-emerald-600": "oklch(0.648 0.200 131.684)",
  "--color-emerald-700": "oklch(0.532 0.157 131.589)",
  "--color-emerald-800": "oklch(0.453 0.124 130.933)",
  "--color-emerald-900": "oklch(0.405 0.101 131.063)",
  "--color-emerald-950": "oklch(0.274 0.072 132.109)",
};

const TEAL_VARS: Record<string, string> = {
  "--color-emerald-50":  "oklch(0.984 0.014 180.720)",
  "--color-emerald-100": "oklch(0.953 0.051 180.801)",
  "--color-emerald-200": "oklch(0.910 0.096 180.426)",
  "--color-emerald-300": "oklch(0.855 0.138 181.071)",
  "--color-emerald-400": "oklch(0.777 0.152 181.912)",
  "--color-emerald-500": "oklch(0.704 0.140 182.503)",
  "--color-emerald-600": "oklch(0.600 0.118 184.704)",
  "--color-emerald-700": "oklch(0.511 0.096 186.391)",
  "--color-emerald-800": "oklch(0.437 0.078 188.216)",
  "--color-emerald-900": "oklch(0.386 0.063 188.416)",
  "--color-emerald-950": "oklch(0.277 0.046 192.524)",
};

const FUCHSIA_VARS: Record<string, string> = {
  "--color-emerald-50":  "oklch(0.977 0.017 320.058)",
  "--color-emerald-100": "oklch(0.952 0.037 318.852)",
  "--color-emerald-200": "oklch(0.903 0.076 319.620)",
  "--color-emerald-300": "oklch(0.833 0.145 321.434)",
  "--color-emerald-400": "oklch(0.741 0.238 322.160)",
  "--color-emerald-500": "oklch(0.667 0.295 322.150)",
  "--color-emerald-600": "oklch(0.591 0.293 322.896)",
  "--color-emerald-700": "oklch(0.518 0.253 323.949)",
  "--color-emerald-800": "oklch(0.452 0.211 324.591)",
  "--color-emerald-900": "oklch(0.401 0.170 325.612)",
  "--color-emerald-950": "oklch(0.293 0.136 325.661)",
};

// Slate — cool blue-gray neutral; 500 = medium silver
const WHITE_VARS: Record<string, string> = {
  "--color-emerald-50":  "oklch(0.984 0.003 247.858)",
  "--color-emerald-100": "oklch(0.968 0.007 247.896)",
  "--color-emerald-200": "oklch(0.929 0.013 255.508)",
  "--color-emerald-300": "oklch(0.869 0.022 252.894)",
  "--color-emerald-400": "oklch(0.704 0.040 256.788)",
  "--color-emerald-500": "oklch(0.554 0.046 257.417)",
  "--color-emerald-600": "oklch(0.446 0.043 257.281)",
  "--color-emerald-700": "oklch(0.372 0.044 257.287)",
  "--color-emerald-800": "oklch(0.279 0.041 260.031)",
  "--color-emerald-900": "oklch(0.208 0.042 265.755)",
  "--color-emerald-950": "oklch(0.129 0.042 264.695)",
};

// Zinc dark-shifted — 500 maps to zinc-800 so buttons appear near-black
const BLACK_VARS: Record<string, string> = {
  "--color-emerald-50":  "oklch(0.985 0 0)",
  "--color-emerald-100": "oklch(0.967 0.001 286.375)",
  "--color-emerald-200": "oklch(0.920 0.004 286.32)",
  "--color-emerald-300": "oklch(0.705 0.015 286.067)",
  "--color-emerald-400": "oklch(0.552 0.016 285.938)",
  "--color-emerald-500": "oklch(0.274 0.006 286.033)",
  "--color-emerald-600": "oklch(0.210 0.006 285.885)",
  "--color-emerald-700": "oklch(0.141 0.005 285.823)",
  "--color-emerald-800": "oklch(0.110 0.004 285.823)",
  "--color-emerald-900": "oklch(0.090 0.003 285.823)",
  "--color-emerald-950": "oklch(0.060 0.002 285.823)",
};

const VARS_BY_THEME: Record<AppThemeId, Record<string, string>> = {
  emerald: {},
  ocean:   OCEAN_VARS,
  violet:  VIOLET_VARS,
  rose:    ROSE_VARS,
  amber:   AMBER_VARS,
  indigo:  INDIGO_VARS,
  red:     RED_VARS,
  orange:  ORANGE_VARS,
  cyan:    CYAN_VARS,
  lime:    LIME_VARS,
  teal:    TEAL_VARS,
  fuchsia: FUCHSIA_VARS,
  white:   WHITE_VARS,
  black:   BLACK_VARS,
};

export function applyAppTheme(themeId: AppThemeId): void {
  const styleId = "utslrc-app-theme";
  let el = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = styleId;
    document.head.appendChild(el);
  }

  const vars = VARS_BY_THEME[themeId] ?? {};
  if (Object.keys(vars).length === 0) {
    el.textContent = "";
    return;
  }

  const declarations = Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`).join("\n");
  el.textContent = `:root {\n${declarations}\n}`;
}
