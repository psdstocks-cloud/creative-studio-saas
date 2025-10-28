import React from 'react';
import type { BillingPlan } from '../../types';

interface PlanCardProps {
  plan: BillingPlan;
  onSelect: (plan: BillingPlan) => void;
  isCurrent?: boolean;
  isLoading?: boolean;
  disabled?: boolean;
  actionLabel?: string;
}

const formatPrice = (plan: BillingPlan) => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: plan.currency || 'USD',
    minimumFractionDigits: 0,
  });
  return formatter.format(plan.price_cents / 100);
};

const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  onSelect,
  isCurrent = false,
  isLoading = false,
  disabled = false,
  actionLabel,
}) => {
  return (
    <div
      className={`flex flex-col rounded-xl border p-6 shadow-sm transition hover:shadow-lg bg-gray-900/60 border-gray-800 ${
        isCurrent ? 'ring-2 ring-blue-500' : ''
      } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
        {plan.description && <p className="mt-2 text-sm text-gray-400">{plan.description}</p>}
      </div>

      <div className="mb-6">
        <div className="text-3xl font-bold text-blue-400">{formatPrice(plan)}</div>
        <div className="text-sm text-gray-400">per month</div>
      </div>

      <div className="mt-auto">
        <ul className="space-y-2 text-sm text-gray-300">
          <li>• {plan.monthly_points} monthly points</li>
          <li>• Priority email support</li>
          <li>• Unlimited creative downloads</li>
        </ul>
      </div>

      <button
        onClick={() => !disabled && !isCurrent && onSelect(plan)}
        disabled={disabled || isLoading || isCurrent}
        className={`mt-8 w-full rounded-lg px-4 py-2 font-semibold transition ${
          isCurrent
            ? 'bg-gray-700 text-gray-300 cursor-default'
            : 'bg-blue-600 text-white hover:bg-blue-500'
        } ${isLoading ? 'opacity-70 cursor-progress' : ''}`}
      >
        {isCurrent ? 'Current Plan' : isLoading ? 'Processing...' : actionLabel ?? 'Choose Plan'}
      </button>
    </div>
  );
};

export default PlanCard;
