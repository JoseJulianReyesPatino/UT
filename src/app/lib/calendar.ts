import { API_BASE_URL } from "./env";

const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, "");

export const getCalendarFileUrl = (cacheBust?: string | number) => {
  const url = new URL("/api/calendar/file", apiOrigin);
  if (cacheBust !== undefined) {
    url.searchParams.set("v", String(cacheBust));
  }
  return url.toString();
};

export const getCalendarDownloadUrl = () => {
  const url = new URL("/api/calendar/file", apiOrigin);
  url.searchParams.set("download", "1");
  return url.toString();
};

export const getCalendarMetaUrl = () =>
  new URL("/api/calendar", apiOrigin).toString();
