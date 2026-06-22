import {
  API_BASE_URL,
  API_BASE_URL_CANDIDATES,
  AUTH_TOKEN_STORAGE_KEY,
} from "./env";

const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, "");

const candidateApiBases =
  API_BASE_URL_CANDIDATES.length > 0 ? API_BASE_URL_CANDIDATES : [API_BASE_URL];

const buildDocumentUrl = (
  baseApiUrl: string,
  documentId: string | number,
  download = false,
) => {
  const url = new URL(
    `/api/documents/${documentId}/file`,
    `${baseApiUrl.replace(/\/+$/, "")}/`,
  );
  if (download) {
    url.searchParams.set("download", "1");
  }
  return url.toString();
};

export const getDocumentFileUrl = (
  documentId: string | number,
  cacheBust?: string | number,
) => {
  const url = new URL(`/api/documents/${documentId}/file`, apiOrigin);
  if (cacheBust !== undefined) {
    url.searchParams.set("v", String(cacheBust));
  }
  return url.toString();
};

export const getDocumentFileUrlCandidates = (
  documentId: string | number,
  download = false,
) =>
  candidateApiBases.map((base) => buildDocumentUrl(base, documentId, download));

export const getDocumentDownloadUrl = (documentId: string | number) => {
  const url = new URL(`/api/documents/${documentId}/file`, apiOrigin);
  url.searchParams.set("download", "1");
  return url.toString();
};

export const fetchDocumentBlob = async (
  documentId: string | number,
  download = false,
): Promise<Blob> => {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  const headers: Record<string, string> = {
    Accept: "application/pdf",
    "ngrok-skip-browser-warning": "true",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const urls = getDocumentFileUrlCandidates(documentId, download);
  let lastError: Error | null = null;

  for (let index = 0; index < urls.length; index += 1) {
    const url = urls[index];
    const isLastCandidate = index === urls.length - 1;

    try {
      const res = await fetch(url, {
        method: "GET",
        headers,
        credentials: "include",
        mode: "cors",
      });

      if (!res.ok) {
        const error = new Error(
          `No se pudo abrir el documento (${res.status} ${res.statusText || ""})`.trim(),
        );

        if (!isLastCandidate && res.status >= 500) {
          lastError = error;
          continue;
        }

        throw error;
      }

      return await res.blob();
    } catch (error: any) {
      if (!isLastCandidate && !error?.status) {
        lastError = error instanceof Error ? error : new Error("Error de red");
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new Error("No fue posible abrir el documento");
};

const safeDecodeURIComponent = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const getDocumentDisplayFileName = (
  title?: string | null,
  filePath?: string | null,
) => {
  const cleanTitle = (title ?? "").trim();
  if (cleanTitle) {
    const decodedTitle = safeDecodeURIComponent(cleanTitle);
    const normalizedTitle = decodedTitle.replace(/\.pdf$/i, "");
    const lastSegment =
      normalizedTitle.split(" - ").pop()?.trim() ?? normalizedTitle;
    const cleanedTitle = String(lastSegment)
      .replace(/\.pdf$/i, "")
      .replaceAll("_", " ")
      .trim();

    const genericTitlePattern =
      /^(planeaci[oó]n|portafolio( digital)?|acta final|instrumento( \d+)?|lista concentrada|tutorias?|asesor[ií]a|remedial|estad[ií]as?|documento)$/i;
    if (cleanedTitle && !genericTitlePattern.test(cleanedTitle)) {
      return `${cleanedTitle}.pdf`;
    }
  }

  const path = (filePath ?? "").toString().trim();
  if (!path) {
    return "Documento sin nombre.pdf";
  }

  const base = path.split("?")[0].split("/").pop() ?? path;
  const decodedBase = safeDecodeURIComponent(base);
  const cleaned = decodedBase
    .replace(/^doc_[^_]+_/, "")
    .replace(/\.pdf$/i, "")
    .replaceAll("_", " ")
    .trim();

  return cleaned ? `${cleaned}.pdf` : "Documento sin nombre.pdf";
};
