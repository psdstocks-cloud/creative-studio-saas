import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PlanCard from '../components/Billing/PlanCard';
import AuthModal from '../components/AuthModal';
import { fetchPlans, subscribeToPlan } from '../services/billingService';
import type { BillingPlan } from '../types';
import { useAuth } from '../contexts/AuthContext';

const FALLBACK_PLANS: BillingPlan[] = [
  {
    id: 'starter_m',
    name: 'Starter',
    description: 'Perfect for solo creators exploring the platform.',
    price_cents: 900,
    currency: 'usd',
    monthly_points: 9,
    billing_interval: 'month',
    active: true,
  },
  {
    id: 'pro_m',
    name: 'Pro',
    description: 'Expanded limits for growing teams and freelancers.',
    price_cents: 1900,
    currency: 'usd',
    monthly_points: 20,
    billing_interval: 'month',
    active: true,
  },
  {
    id: 'agency_m',
    name: 'Agency',
    description: 'Maximum scale for agencies managing many clients.',
    price_cents: 4900,
    currency: 'usd',
    monthly_points: 55,
    billing_interval: 'month',
    active: true,
  },
];

const isUnauthorizedError = (message: string) =>
  /access token|unauthorized|auth|session/i.test(message);

const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, refreshProfile } = useAuth();
  const [plans, setPlans] = useState<BillingPlan[]>(FALLBACK_PLANS);
  const [isLoading, setIsLoading] = useState(false);
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadPlans = async () => {
      setIsLoading(true);
      try {
        const remotePlans = await fetchPlans('month');
        if (!isMounted) return;
        if (remotePlans.length) {
          setPlans(remotePlans);
        }
        setAuthRequired(false);
        setError(null);
      } catch (err: any) {
        if (!isMounted) return;
        const message = err?.message || 'Unable to load plans.';
        if (isUnauthorizedError(message)) {
          setAuthRequired(true);
        } else {
          setError(message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadPlans();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  const handleSubscribe = async (plan: BillingPlan) => {
    if (!isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }

    try {
      setSubscribingPlanId(plan.id);
      await subscribeToPlan(plan.id);
      try {
        await refreshProfile();
      } catch (refreshError) {
        console.error('Pricing: Failed to refresh profile after subscription', refreshError);
      }
      navigate('/dashboard/billing');
    } catch (err: any) {
      const message = err?.message || 'Unable to start subscription.';
      if (isUnauthorizedError(message)) {
        setAuthModalOpen(true);
      } else {
        setError(message);
      }
    } finally {
      setSubscribingPlanId(null);
    }
  };

  const loadingState = useMemo(() => isLoading && !plans.length, [isLoading, plans.length]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 text-white">
      <section className="text-center mb-12">
        <h1 className="text-4xl font-bold">Choose the plan that fuels your creativity</h1>
        <p className="mt-4 text-gray-400">
          Monthly subscriptions that credit your account with fresh points for AI generations and
          stock downloads.
        </p>
      </section>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {authRequired && !isAuthenticated && (
        <div className="mb-8 rounded-lg border border-blue-500/40 bg-blue-500/10 p-4 text-sm text-blue-200">
          Sign in to view live pricing and subscribe.
          <button
            onClick={() => setAuthModalOpen(true)}
            className="ml-3 rounded border border-blue-400 px-3 py-1 text-xs font-semibold text-blue-200 hover:bg-blue-500/20"
          >
            Sign in
          </button>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            onSelect={handleSubscribe}
            isLoading={subscribingPlanId === plan.id}
          />
        ))}
      </div>

      {loadingState && <div className="mt-8 text-center text-gray-400">Loading plans...</div>}

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
};

export default Pricing;
