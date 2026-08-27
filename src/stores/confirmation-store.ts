import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

export type ConfirmationDecision = "confirmed" | "declined" | "cancelled";

export interface ConfirmationPrompt {
  cancelLabel: string;
  confirmLabel: string;
  description: string;
  eyebrow: string;
  id: number;
  title: string;
}

interface ConfirmationState {
  prompt: ConfirmationPrompt | null;
}

interface PendingConfirmation {
  abortSignal?: AbortSignal;
  id: number;
  onAbort?: () => void;
  resolve: (decision: ConfirmationDecision) => void;
}

interface ConfirmationRequest {
  cancelLabel?: string;
  confirmLabel?: string;
  description: string;
  eyebrow?: string;
  title: string;
}

let nextConfirmationId = 1;
let pendingConfirmation: PendingConfirmation | null = null;

export const confirmationStore = createStore<ConfirmationState>()(() => ({
  prompt: null,
}));

function settleConfirmation(decision: ConfirmationDecision) {
  const pending = pendingConfirmation;
  if (!pending) return;

  pendingConfirmation = null;
  if (pending.abortSignal && pending.onAbort) {
    pending.abortSignal.removeEventListener("abort", pending.onAbort);
  }
  confirmationStore.setState({ prompt: null });
  pending.resolve(decision);
}

export function requestConfirmation(
  request: ConfirmationRequest,
  options: { signal?: AbortSignal } = {},
) {
  if (options.signal?.aborted) {
    return Promise.resolve<ConfirmationDecision>("cancelled");
  }

  settleConfirmation("cancelled");
  const id = nextConfirmationId++;

  return new Promise<ConfirmationDecision>((resolve) => {
    const onAbort = () => {
      if (pendingConfirmation?.id === id) settleConfirmation("cancelled");
    };

    pendingConfirmation = {
      abortSignal: options.signal,
      id,
      onAbort,
      resolve,
    };
    options.signal?.addEventListener("abort", onAbort, { once: true });
    confirmationStore.setState({
      prompt: {
        cancelLabel: request.cancelLabel ?? "Keep it",
        confirmLabel: request.confirmLabel ?? "Confirm",
        description: request.description,
        eyebrow: request.eyebrow ?? "Please confirm",
        id,
        title: request.title,
      },
    });
  });
}

export function confirmConfirmation() {
  settleConfirmation("confirmed");
}

export function declineConfirmation() {
  settleConfirmation("declined");
}

export function cancelConfirmation() {
  settleConfirmation("cancelled");
}

export function useConfirmationStore<T>(
  selector: (state: ConfirmationState) => T,
) {
  return useStore(confirmationStore, selector);
}
