import { API_BASE_URL } from "./env";

const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, "");

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

export const getDocumentDownloadUrl = (documentId: string | number) => {
  const url = new URL(`/api/documents/${documentId}/file`, apiOrigin);
  url.searchParams.set("download", "1");
  return url.toString();
};
