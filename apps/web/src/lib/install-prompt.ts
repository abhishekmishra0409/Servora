export interface DeferredInstallPrompt extends Event {
  prompt: () => Promise<void>;
}

