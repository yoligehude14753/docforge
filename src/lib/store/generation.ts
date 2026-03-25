import { create } from 'zustand';

interface GenerationState {
  isGenerating: boolean;
  currentStep: string;
  progress: number;
  streamingContent: string;
  error: string | null;

  startGeneration: (step: string) => void;
  updateProgress: (progress: number, step?: string) => void;
  appendStreamContent: (token: string) => void;
  resetStreamContent: () => void;
  setError: (error: string) => void;
  finishGeneration: () => void;
  reset: () => void;
}

const initial = {
  isGenerating: false,
  currentStep: '',
  progress: 0,
  streamingContent: '',
  error: null as string | null,
};

export const useGenerationStore = create<GenerationState>((set) => ({
  ...initial,

  startGeneration: (step) =>
    set({
      isGenerating: true,
      currentStep: step,
      progress: 0,
      streamingContent: '',
      error: null,
    }),

  updateProgress: (progress, step) =>
    set(() => ({
      progress: Math.min(100, Math.max(0, progress)),
      ...(step !== undefined ? { currentStep: step } : {}),
    })),

  appendStreamContent: (token) =>
    set((s) => ({
      streamingContent: s.streamingContent + token,
    })),

  resetStreamContent: () => set({ streamingContent: '' }),

  setError: (error) =>
    set({
      error,
      isGenerating: false,
    }),

  finishGeneration: () =>
    set({
      isGenerating: false,
      progress: 100,
    }),

  reset: () => set(initial),
}));
