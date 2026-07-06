import { create } from 'zustand';
import type { AsyncState } from '@/types';

type PurchaseState = {
  isPremium: boolean;
  purchaseState: AsyncState<void>;
  setIsPremium: (value: boolean) => void;
  setPurchaseState: (state: AsyncState<void>) => void;
};

export const usePurchaseStore = create<PurchaseState>((set) => ({
  isPremium: false,
  purchaseState: { status: 'idle' },
  setIsPremium: (isPremium) => set({ isPremium }),
  setPurchaseState: (purchaseState) => set({ purchaseState }),
}));
