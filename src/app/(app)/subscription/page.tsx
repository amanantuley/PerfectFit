'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Check,
  Gem,
  Wallet,
  Sparkles,
  ShieldCheck,
  Clock3,
  Gift,
  Crown,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/context/subscription-provider';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { subscriptionsApi, paymentsApi } from '@/lib/api';

const plans = [
  {
    id: 'basic',
    name: 'Basic',
    price: 299,
    description: 'Perfect for occasional rentals and trying out our service.',
    features: [
      '1 rental credit / month',
      'Access to casual wear',
      'Standard delivery',
      'Basic fit guarantee',
      '10% discount on purchases',
    ],
    popular: false,
    badge: 'Starter',
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 599,
    description: 'For the fashion-forward individual who loves variety.',
    features: [
      '4 rental credits / month',
      'Access to all collections',
      'Express delivery',
      'Perfect fit guarantee + free alterations',
      'Early access to new arrivals',
      '25% discount on purchases',
    ],
    popular: true,
    badge: 'Most loved',
  },
  {
    id: 'vip',
    name: 'VIP',
    price: 999,
    description: 'The ultimate wardrobe solution for any occasion.',
    features: [
      'Unlimited rental credits',
      'Access to all + premium collections',
      'Same-day delivery (select cities)',
      'Personal stylist consultation',
      'Exclusive event invites',
      '40% discount on purchases',
    ],
    popular: false,
    badge: 'Concierge',
  },
];

export default function SubscriptionPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { activePlan, isPremium, refreshSubscription } = useSubscription();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Login Required', description: 'Please log in to subscribe.' });
      return;
    }

    setLoadingPlan(planId);
    try {
      // Step 1: Initiate purchase via FastAPI
      const res = await subscriptionsApi.purchasePlan(planId);

      // Step 2: Create Razorpay Order
      const rzpOrder = await paymentsApi.createRazorpayOrder({
        subscription_id: res.subscription_id,
        payment_method: 'razorpay',
      });

      // Step 3: Open Razorpay Checkout Widget
      if (typeof window !== 'undefined' && (window as any).Razorpay) {
        const options = {
          key: rzpOrder.key_id,
          amount: Math.round(rzpOrder.amount * 100),
          currency: rzpOrder.currency || 'INR',
          name: 'PerfectFit Membership',
          description: `Subscription: ${res.plan_name}`,
          order_id: rzpOrder.razorpay_order_id,
          handler: async (response: any) => {
            try {
              await paymentsApi.verifyRazorpayPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });

              await refreshSubscription();
              toast({ title: '🎉 Subscription Activated!', description: `Your ${res.plan_name} plan is now active in PostgreSQL.` });
            } catch (err: any) {
              toast({ variant: 'destructive', title: 'Payment Verification Error', description: err.message || 'Failed to verify payment.' });
            }
          },
          prefill: {
            email: user.email,
          },
          theme: {
            color: '#8B5CF6',
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        toast({ title: 'Order Created', description: 'Please complete payment to activate subscription.' });
      }
    } catch (err: any) {
      console.error('Subscription error:', err);
      toast({ variant: 'destructive', title: 'Subscription Error', description: err.message || 'Failed to process subscription' });
    } finally {
      setLoadingPlan(null);
    }
  };

  const heroStats = [
    { label: 'Avg. savings per member', value: '₹4.3k', icon: Wallet },
    { label: 'Fit satisfaction', value: '4.9/5', icon: ShieldCheck },
    { label: 'Delivery SLA', value: '<24h metro', icon: Clock3 },
    { label: 'Exclusive drops', value: 'Weekly', icon: Gift },
  ];

  return (
    <motion.div
      className="space-y-10 animate-fade-in-up pb-10"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-fuchsia-500/10 via-background to-sky-500/10 p-6 sm:p-10">
        <div className="relative space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary gap-1">
              <Crown className="h-3.5 w-3.5" /> Memberships built for fit-first fashion
            </Badge>
            {isPremium && (
              <Badge className="bg-emerald-500 text-white">Active Plan: {activePlan?.toUpperCase()}</Badge>
            )}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-purple-400 to-sky-400">
                Tailored Memberships
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground max-w-2xl">
                Database-backed subscription plans with verified Razorpay test payments.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
            {heroStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-2xl border border-white/10 bg-background/70 p-3 flex items-center gap-3 shadow-sm">
                  <span className="p-2 bg-primary/10 rounded-full">
                    <Icon className="h-4 w-4 text-primary" />
                  </span>
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-sm font-semibold text-foreground">{stat.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-8">
        {plans.map((plan) => {
          const isCurrent = activePlan?.toLowerCase() === plan.id;
          return (
            <Card
              key={plan.id}
              className={`flex flex-col shadow-xl border backdrop-blur-sm transition-all duration-300 ${
                plan.popular
                  ? 'border-purple-500 border-2 bg-gradient-to-b from-purple-500/10 to-background/60'
                  : 'border-white/10 bg-background/60'
              }`}
            >
              {plan.popular && (
                <div className="text-center bg-purple-500 text-white text-xs font-bold py-1.5 rounded-t-lg uppercase tracking-wider">
                  ⭐ Most Popular
                </div>
              )}
              <CardHeader className="text-center pt-6">
                <CardTitle className="flex items-center justify-center gap-2 text-2xl font-bold">
                  <Gem className="text-purple-400 h-6 w-6" />
                  {plan.name}
                </CardTitle>
                <div className="flex flex-col items-center gap-1 mt-2">
                  <p className="text-4xl font-bold">
                    ₹{plan.price}
                    <span className="text-lg text-muted-foreground font-normal">/mo</span>
                  </p>
                </div>
                <CardDescription className="mt-2 text-muted-foreground">
                  {plan.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-grow px-6">
                <h3 className="font-semibold mb-3 text-purple-400 text-sm">What’s Included</h3>
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-3 text-xs text-muted-foreground">
                      <Check className="h-4 w-4 text-purple-400 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="p-6 pt-4">
                <Button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isCurrent || loadingPlan === plan.id}
                  variant={plan.popular ? 'default' : 'secondary'}
                  className="w-full font-bold flex items-center justify-center gap-2"
                >
                  {loadingPlan === plan.id ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
                  ) : isCurrent ? (
                    'Active Plan'
                  ) : (
                    <>Choose Plan <ArrowRight className="h-4 w-4" /></>
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </motion.div>
  );
}
