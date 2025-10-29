import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PlanCard from '../components/Billing/PlanCard';
import InvoiceTable from '../components/Billing/InvoiceTable';
import AuthModal from '../components/AuthModal';
import {
  fetchPlans,
  fetchSubscription,
  fetchInvoices,
  changeSubscriptionPlan,
} from '../services/billingService';
import type { BillingPlan, BillingSubscription, Invoice } from '../types';
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

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

const Billing: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, refreshProfile } = useAuth();
  const [plans, setPlans] = useState<BillingPlan[]>(FALLBACK_PLANS);
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);

  const handleError = (err: any) => {
    const message = err?.message || 'Something went wrong.';
    if (isUnauthorizedError(message)) {
      setAuthRequired(true);
      return true;
    }
    setError(message);
    return false;
  };

  const loadData = async () => {
    setLoading(true);
    setLoadingInvoices(true);
    setError(null);

    try {
      let unauthorized = false;

      try {
        const planData = await fetchPlans('month');
        setPlans(planData.length ? planData : FALLBACK_PLANS);
      } catch (err) {
        unauthorized = handleError(err) || unauthorized;
      }

      try {
        const subscriptionData = await fetchSubscription();
        setSubscription(subscriptionData);
      } catch (err) {
        unauthorized = handleError(err) || unauthorized;
      }

      try {
        const invoiceData = await fetchInvoices();
        setInvoices(invoiceData);
      } catch (err) {
        unauthorized = handleError(err) || unauthorized;
      }

      if (!unauthorized) {
        setAuthRequired(false);
      }
    } catch (err: any) {
      if (!isUnauthorizedError(err?.message || '')) {
        console.error('Billing load failed', err);
      }
    } finally {
      setLoading(false);
      setLoadingInvoices(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setAuthRequired(true);
      return;
    }
    loadData();
  }, [isAuthenticated]);

  const handlePlanChange = async (plan: BillingPlan) => {
    if (!subscription) {
      navigate('/pricing');
      return;
    }

    try {
      setActionLoading(true);
      setPendingPlanId(plan.id);
      const updated = await changeSubscriptionPlan(plan.id);
      if (updated) {
        setSubscription(updated);
        try {
          await refreshProfile();
        } catch (refreshError) {
          console.error('Billing: Failed to refresh profile after changing plan', refreshError);
        }
      }
    } catch (err: any) {
      if (handleError(err)) {
        setAuthModalOpen(true);
      }
    } finally {
      setActionLoading(false);
      setPendingPlanId(null);
    }
  };

  const handleViewReceipt = (invoiceId: string) => {
    navigate(`/app/billing/receipt/${invoiceId}`);
  };

  const currentPlanId = subscription?.plan_id;
  const nextPeriodEnd = subscription ? formatDate(subscription.current_period_end) : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 text-white">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="mt-2 text-gray-400">
          Manage your CreativeSaaS subscription, payment schedule, and invoices.
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {authRequired && !isAuthenticated ? (
        <div className="rounded-lg border border-blue-500/40 bg-blue-500/10 p-6 text-center text-blue-200">
          You must sign in to view your billing information.
          <div className="mt-4">
            <button
              onClick={() => setAuthModalOpen(true)}
              className="rounded border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-200 hover:bg-blue-500/20"
            >
              Sign in
            </button>
          </div>
        </div>
      ) : (
        <>
          <section className="mb-12 rounded-xl border border-gray-800 bg-gray-900/60 p-6 shadow-sm">
            {loading ? (
              <div className="text-center text-gray-400">Loading subscription details...</div>
            ) : subscription ? (
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h2 className="text-xl font-semibold">Current subscription</h2>
                  <p className="mt-2 text-gray-300">
                    {subscription.plan?.name ?? 'Custom plan'} — renews every month.
                  </p>
                  {nextPeriodEnd && (
                    <p className="mt-4 text-sm text-gray-400">
                      {subscription.cancel_at_period_end
                        ? `Cancels on ${nextPeriodEnd}.`
                        : `Next renewal on ${nextPeriodEnd}.`}
                    </p>
                  )}
                  <div className="mt-6 space-y-3">
                    <p className="text-sm text-gray-300">
                      Need to make changes or cancel? Email{' '}
                      <a
                        href="mailto:subscription@creativesaas.com"
                        className="font-semibold text-blue-300 hover:text-blue-200"
                      >
                        subscription@creativesaas.com
                      </a>{' '}
                      with at least 5 days&#39; notice before your next renewal so we can process
                      the request.
                    </p>
                    <button
                      onClick={() => navigate('/pricing')}
                      className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-300 transition hover:bg-gray-800"
                    >
                      View pricing
                    </button>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Change plan</h3>
                  <p className="mt-2 text-sm text-gray-400">
                    Switch plans now — changes take effect on your next billing cycle.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-gray-300">You do not have an active subscription yet.</p>
                <button
                  onClick={() => navigate('/pricing')}
                  className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                >
                  Explore plans
                </button>
              </div>
            )}
          </section>

          {subscription && (
            <section className="mb-12">
              <div className="grid gap-6 md:grid-cols-3">
                {plans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    onSelect={handlePlanChange}
                    isCurrent={plan.id === currentPlanId}
                    isLoading={pendingPlanId === plan.id}
                    disabled={actionLoading && pendingPlanId !== null && pendingPlanId !== plan.id}
                    actionLabel="Switch plan"
                  />
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-xl font-semibold">Invoices</h2>
            <p className="mt-2 text-sm text-gray-400">Download receipts for your records.</p>
            <div className="mt-4">
              <InvoiceTable
                invoices={invoices}
                isLoading={loadingInvoices}
                onViewReceipt={handleViewReceipt}
              />
            </div>
          </section>
        </>
      )}

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
};

export default Billing;
