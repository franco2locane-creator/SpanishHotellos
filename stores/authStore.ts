import { create } from 'zustand';
import type { AuthUser } from '@/types';

type AuthState = {
  user: AuthUser | null;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  setPremium: (isPremium: boolean) => void;
  setOnboardingComplete: () => void;
  setExamDate: (examDate: string) => void;
  setMockLevel: (mockLevel: 'basic' | 'intermediate') => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  setPremium: (isPremium) =>
    set((state) => ({
      user: state.user ? { ...state.user, isPremium } : null,
    })),
  setOnboardingComplete: () =>
    set((state) => ({
      user: state.user ? { ...state.user, onboardingStep: 'complete' } : null,
    })),
  setExamDate: (examDate) =>
    set((state) => ({
      user: state.user ? { ...state.user, examDate } : null,
    })),
  setMockLevel: (mockLevel) =>
    set((state) => ({
      user: state.user ? { ...state.user, mockLevel } : null,
    })),
}));
