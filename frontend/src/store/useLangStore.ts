import { create } from 'zustand';

type LangState = {
  lang: 'es' | 'en';
  toggleLang: () => void;
};

export const useLangStore = create<LangState>((set) => ({
  lang: 'es', // Default to Spanish
  toggleLang: () => set((state) => ({ lang: state.lang === 'es' ? 'en' : 'es' })),
}));
