import { create } from 'zustand';

interface EmissaoStore {
  isEmitting: boolean;
  setEmitting: (value: boolean) => void;
}

// Função para obter o estado inicial
const getInitialState = () => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem("isEmitting") === "true";
};

export const useEmissaoStore = create<EmissaoStore>((set) => ({
  isEmitting: false,
  setEmitting: (value: boolean) => {
    if (typeof window !== 'undefined') {
      if (value) {
        localStorage.setItem("isEmitting", "true");
      } else {
        localStorage.removeItem("isEmitting");
        // Limpa outros estados relacionados
        localStorage.removeItem("emissaoCompleta");
        localStorage.removeItem("ingressoEmitido");
      }
    }
    set({ isEmitting: value });
  },
})); 