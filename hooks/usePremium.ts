import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { usePurchaseStore } from '@/stores/purchaseStore';
import { checkIsPremium, mirrorPremiumToDb } from '@/lib/purchases';
import { resolvePremium, PREVIEW_PREMIUM_ENABLED } from '@/lib/premiumGating';

/**
 * Returns whether the current user has an active premium entitlement.
 * Delegates the actual precedence (dev override / preview-build flag /
 * real entitlement) to lib/premiumGating.ts's resolvePremium() — the
 * single source of truth for gating logic.
 *
 * - On mount: validates against RevenueCat and reconciles the store if stale.
 * - Falls back to zustand cache on network error (safe for offline launch).
 * - RevenueCat is always the source of truth; Supabase is mirrored for analytics only.
 */
export function usePremium(): boolean {
  const { user, setPremium } = useAuthStore();
  const { devPremiumOverride } = usePurchaseStore();

  useEffect(() => {
    // Skip RC validation when dev override or the preview flag is forcing premium
    if ((__DEV__ && devPremiumOverride) || PREVIEW_PREMIUM_ENABLED) return;

    checkIsPremium().then(isActive => {
      const cached = user?.isPremium ?? false;
      if (isActive !== cached) {
        setPremium(isActive);
        if (isActive && user?.id) mirrorPremiumToDb(user.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return resolvePremium(devPremiumOverride, user?.isPremium ?? false);
}

/** True only when the build-time EXPO_PUBLIC_PREMIUM_PREVIEW flag is forcing premium on. */
export function usePreviewPremiumActive(): boolean {
  return PREVIEW_PREMIUM_ENABLED;
}
