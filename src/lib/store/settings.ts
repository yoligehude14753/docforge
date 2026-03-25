import { create } from 'zustand';
import type { AIConfig } from '@/lib/ai/provider';
import type { SearchConfig } from '@/lib/knowledge/research/web-search';

interface SettingsState {
  aiConfig: AIConfig;
  searchConfig: SearchConfig | null;
  companyInfo: {
    name: string;
    description: string;
  };

  setAiConfig: (config: Partial<AIConfig>) => void;
  setSearchConfig: (config: SearchConfig | null) => void;
  setCompanyInfo: (info: Partial<{ name: string; description: string }>) => void;
}

const defaultAiConfig: AIConfig = {
  provider: 'deepseek',
  model: 'deepseek-chat',
  apiKey: '',
};

export const useSettingsStore = create<SettingsState>((set) => ({
  aiConfig: { ...defaultAiConfig },
  searchConfig: null,
  companyInfo: {
    name: '',
    description: '',
  },

  setAiConfig: (config) =>
    set((s) => ({
      aiConfig: { ...s.aiConfig, ...config },
    })),

  setSearchConfig: (config) => set({ searchConfig: config }),

  setCompanyInfo: (info) =>
    set((s) => ({
      companyInfo: { ...s.companyInfo, ...info },
    })),
}));
