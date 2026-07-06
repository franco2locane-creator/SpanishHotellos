import Purchases from 'react-native-purchases';
import Constants from 'expo-constants';
import { supabase } from './supabase';

const PRODUCT_ID = 'spanish4hoteleros_full_access';
export const ENTITLEMENT_ID = 'premium';

// ── SDK lifecycle ─────────────────────────────────────────────────────────────

export function configurePurchases(): void {
  const key = Constants.expoConfig?.extra?.revenueCatApiKey as string | undefined;
  if (!key) {
    if (__DEV__) console.warn('[Purchases] REVENUECAT_API_KEY not set — purchases disabled in this build');
    return;
  }
  Purchases.configure({ apiKey: key });
}

export async function loginPurchaseUser(userId: string): Promise<boolean> {
  try {
    const { customerInfo } = await Purchases.logIn(userId);
    return !!customerInfo.entitlements.active[ENTITLEMENT_ID];
  } catch {
    return false;
  }
}

export async function logoutPurchaseUser(): Promise<void> {
  try { await Purchases.logOut(); } catch {}
}

// ── Entitlement check ─────────────────────────────────────────────────────────

// Returns false on network error so callers fall back to cached zustand state.
export async function checkIsPremium(): Promise<boolean> {
  try {
    const info = await Purchases.getCustomerInfo();
    return !!info.entitlements.active[ENTITLEMENT_ID];
  } catch {
    return false;
  }
}

// ── Purchase ──────────────────────────────────────────────────────────────────

export type PurchaseOutcome = 'success' | 'cancelled' | 'pending' | 'error';
export type PurchaseResult = { outcome: PurchaseOutcome; errorMessage?: string };

export async function purchasePremium(): Promise<PurchaseResult> {
  try {
    const { customerInfo } = await Purchases.purchaseProduct(PRODUCT_ID);
    const active = !!customerInfo.entitlements.active[ENTITLEMENT_ID];
    if (active) return { outcome: 'success' };
    // Purchase completed but entitlement not active yet — rare edge case
    return { outcome: 'error', errorMessage: 'Purchase completed but entitlement not active. Tap "Restore purchases" to try again.' };
  } catch (e: any) {
    if (e?.userCancelled) return { outcome: 'cancelled' };
    // Detect pending (Ask to Buy, parental controls) from message since enum names vary
    const msg: string = e?.message ?? '';
    if (msg.toLowerCase().includes('pending')) return { outcome: 'pending' };
    return { outcome: 'error', errorMessage: msg || 'Purchase failed. Please try again.' };
  }
}

// ── Restore ───────────────────────────────────────────────────────────────────

export async function restorePurchasesFlow(): Promise<PurchaseResult> {
  try {
    const info = await Purchases.restorePurchases();
    const active = !!info.entitlements.active[ENTITLEMENT_ID];
    if (active) return { outcome: 'success' };
    return { outcome: 'error', errorMessage: 'No previous purchases found for this Apple ID.' };
  } catch (e: any) {
    return { outcome: 'error', errorMessage: e?.message ?? 'Restore failed. Please try again.' };
  }
}

// ── Analytics mirror ──────────────────────────────────────────────────────────

// Fire-and-forget; RevenueCat is the authoritative source, DB is analytics only.
export function mirrorPremiumToDb(userId: string): void {
  supabase.from('profiles').update({ is_premium: true }).eq('id', userId).then(() => {});
}
