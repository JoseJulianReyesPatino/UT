const DATABASE_NAME = "UTSLRC_OFFLINE_DB";
const DATABASE_VERSION = 1;
const STORES = {
  pendingRequests: "pendingRequests",
  apiCache: "apiCache",
  localData: "localData",
} as const;

type OfflineRequest = {
  id: number;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
  timestamp: number;
};

type CachedApiResponse = {
  url: string;
  status: number;
  body: unknown;
  savedAt: number;
};

type LocalData = {
  key: string;
  value: unknown;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORES.pendingRequests)) {
        db.createObjectStore(STORES.pendingRequests, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.apiCache)) {
        db.createObjectStore(STORES.apiCache, { keyPath: "url" });
      }
      if (!db.objectStoreNames.contains(STORES.localData)) {
        db.createObjectStore(STORES.localData, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  storeName: keyof typeof STORES,
  mode: IDBTransactionMode,
  callback: (
    store: IDBObjectStore,
  ) => IDBRequest<unknown> | Promise<IDBRequest<unknown>>,
): Promise<T> {
  const db = await openDatabase();
  const tx = db.transaction(storeName, mode);
  const store = tx.objectStore(storeName);
  const result = await callback(store);

  return new Promise<T>((resolve, reject) => {
    tx.oncomplete = () => {
      resolve(result.result as T);
    };
    tx.onerror = () => reject(tx.error ?? result.error);
    tx.onabort = () => reject(tx.error ?? new Error("Transaction aborted"));
  });
}

export async function savePendingRequest(
  request: Omit<OfflineRequest, "id" | "timestamp">,
) {
  const payload: OfflineRequest = {
    ...request,
    id: Date.now(),
    timestamp: Date.now(),
  };

  await withStore(STORES.pendingRequests, "readwrite", (store) =>
    store.put(payload),
  );
}

export async function getPendingRequests(): Promise<OfflineRequest[]> {
  const db = await openDatabase();
  return new Promise<OfflineRequest[]>((resolve, reject) => {
    const tx = db.transaction(STORES.pendingRequests, "readonly");
    const store = tx.objectStore(STORES.pendingRequests);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as OfflineRequest[]);
    request.onerror = () => reject(request.error);
  });
}

export async function deletePendingRequest(id: number) {
  await withStore(STORES.pendingRequests, "readwrite", (store) =>
    store.delete(id),
  );
}

export async function syncPendingRequests() {
  const requests = await getPendingRequests();
  let synced = 0;

  for (const pending of requests) {
    try {
      const response = await fetch(pending.url, {
        method: pending.method,
        headers: pending.headers,
        body: pending.body === null ? undefined : pending.body,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(
          `Sync failed: ${response.status} ${response.statusText}`,
        );
      }

      await deletePendingRequest(pending.id);
      synced += 1;
    } catch (error) {
      console.error("Error sincronizando solicitud pendiente:", pending, error);
    }
  }

  return synced;
}

export async function saveApiResponseCache(
  url: string,
  status: number,
  body: unknown,
) {
  await withStore(STORES.apiCache, "readwrite", (store) =>
    store.put({ url, status, body, savedAt: Date.now() }),
  );
}

export async function getCachedApiResponse(
  url: string,
): Promise<CachedApiResponse | null> {
  const db = await openDatabase();
  return new Promise<CachedApiResponse | null>((resolve, reject) => {
    const tx = db.transaction(STORES.apiCache, "readonly");
    const store = tx.objectStore(STORES.apiCache);
    const request = store.get(url);

    request.onsuccess = () =>
      resolve(request.result as CachedApiResponse | null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveLocalData(key: string, value: unknown) {
  await withStore(STORES.localData, "readwrite", (store) =>
    store.put({ key, value }),
  );
}

export async function getLocalData<T = unknown>(
  key: string,
): Promise<T | null> {
  const db = await openDatabase();
  return new Promise<T | null>((resolve, reject) => {
    const tx = db.transaction(STORES.localData, "readonly");
    const store = tx.objectStore(STORES.localData);
    const request = store.get(key);

    request.onsuccess = () => {
      const result = request.result as LocalData | null;
      resolve(result ? (result.value as T) : null);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingRequestCount(): Promise<number> {
  const db = await openDatabase();
  return new Promise<number>((resolve, reject) => {
    const tx = db.transaction(STORES.pendingRequests, "readonly");
    const store = tx.objectStore(STORES.pendingRequests);
    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
