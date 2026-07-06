import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { checkIsPremium, mirrorPremiumToDb } from '@/lib/purchases';

/**
 * Returns whether the current user has an active premium entitlement.
 *
 * - In __DEV__ builds: returns true when devPremiumOverride is set.
 * - On mount: validates against RevenueCat and reconciles if stale.
 * - Falls back to zustand cache on network error (safe for offline launch).
 * - RevenueCat is always the source of truth; Supabase is mirrored for analytics only.
 */
export function usePremium(): boolean {
  const { user, setPremium } = useAuthStore();
  const { devPremiumOverride } = usePurchaseStore();

  useEffect(() => {
    // Skip RC validation when dev override is active
    if (__DEV__ && devPremiumOverride) return;

    checkIsPremium().then(isActive => {
      const cached = user?.isPremium ?? false;
      if (isActive !== cached) {
        setPremium(isActive);
        if (isActive && user?.id) mirrorPremiumToDb(user.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (__DEV__ && devPremiumOverride) return true;
  return user?.isPremium ?? false;
}
