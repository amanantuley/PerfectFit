'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { subscriptionsApi, ApiSubscription } from '@/lib/api';

export type SubscriptionPlan = 'basic' | 'premium' | 'vip' | 'Basic' | 'Pro' | 'Ultimate' | null;

interface SubscriptionContextType {
  subscription: ApiSubscription | null;
  activePlan: string | null;
  discount: number;
  isPremium: boolean;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<ApiSubscription | null>(null);

  const refreshSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      return;
    }
    try {
      const subs = await subscriptionsApi.list();
      const active = subs.find(s => s.status === 'active');
      setSubscription(active || null);
    } catch (e) {
      console.error('Failed to load subscriptions:', e);
      setSubscription(null);
    }
  }, [user]);

  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

  const activePlan = subscription ? subscription.plan_type : null;

  const getDiscount = (plan: string | null): number => {
    if (!plan) return 0;
    const lower = plan.toLowerCase();
    if (lower === 'basic') return 10;
    if (lower === 'premium' || lower === 'pro') return 25;
    if (lower === 'vip' || lower === 'ultimate') return 40;
    return 0;
  };

  const discount = getDiscount(activePlan);
  const isPremium = subscription !== null && subscription.status === 'active';

  return (
    <SubscriptionContext.Provider value={{ subscription, activePlan, discount, isPremium, refreshSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
