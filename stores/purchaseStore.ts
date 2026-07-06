import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEV_KEY = '@sp4h_dev_premium';

export type PurchaseStatus = 'idle' | 'loading' | 'success' | 'pending' | 'error' | 'cancelled';

type PurchaseState = {
  purchaseStatus: PurchaseStatus;
  errorMessage: string | null;
  devPremiumOverride: boolean;
  setPurchaseStatus: (status: PurchaseStatus, errorMessage?: string | null) => void;
  setDevPremiumOverride: (value: boolean) => void;
  loadDevOverride: () => Promise<void>;
  resetStatus: () => void;
};

export const usePurchaseStore = create<PurchaseState>((set) => ({
  purchaseStatus: 'idle',
  errorMessage: null,
  devPremiumOverride: false,

  setPurchaseStatus: (purchaseStatus, errorMessage = null) =>
    set({ purchaseStatus, errorMessage }),

  resetStatus: () => set({ purchaseStatus: 'idle', errorMessage: null }),

  setDevPremiumOverride: (value) => {
    if (__DEV__) {
      AsyncStorage.setItem(DEV_KEY, value ? 'true' : 'false').catch(() => {});
    }
    set({ devPremiumOverride: value });
  },

  loadDevOverride: async () => {
    if (!__DEV__) return;
    try {
      const stored = await AsyncStorage.getItem(DEV_KEY);
      set({ devPremiumOverride: stored === 'true' });
    } catch {}
  },
}));
