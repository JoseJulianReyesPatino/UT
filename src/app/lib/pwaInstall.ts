interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const subscribers: Set<(prompt: BeforeInstallPromptEvent | null) => void> =
  new Set();

const notifySubscribers = () => {
  subscribers.forEach((subscriber) => subscriber(deferredPrompt));
};

export const getDeferredPrompt = () => deferredPrompt;

export const onBeforeInstallPrompt = (
  subscriber: (prompt: BeforeInstallPromptEvent | null) => void,
) => {
  subscriber(deferredPrompt);
  subscribers.add(subscriber);

  return () => {
    subscribers.delete(subscriber);
  };
};

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event: Event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notifySubscribers();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notifySubscribers();
  });
}

export type { BeforeInstallPromptEvent };
