import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchInvoice } from '../services/billingService';
import type { Invoice } from '../types';
import AuthModal from '../components/AuthModal';
import { useAuth } from '../contexts/AuthContext';

const formatCurrency = (amountCents: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amountCents / 100);

const formatDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—';

const resolvePlanName = (invoice: Invoice) => {
  const snapshot = invoice.plan_snapshot as { name?: unknown };
  if (snapshot && typeof snapshot.name === 'string') {
    return snapshot.name;
  }
  return 'Subscription';
};

const Receipt: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    if (!id) {
      setError('Invoice id is missing.');
      setLoading(false);
      return;
    }

    const loadInvoice = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchInvoice(id);
        setInvoice(data);
      } catch (err: any) {
        const message = err?.message || 'Unable to load invoice.';
        if (/access token|unauthorized|auth|session/i.test(message)) {
          setAuthModalOpen(true);
        }
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      loadInvoice();
    } else {
      setAuthModalOpen(true);
      setLoading(false);
    }
  }, [id, isAuthenticated]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-white">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 text-sm text-blue-300 hover:text-blue-200"
      >
        ← Back to billing
      </button>

      {loading ? (
        <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-6 text-center text-gray-400">
          Loading receipt...
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">
          {error}
        </div>
      ) : invoice ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6 shadow-sm">
          <header className="mb-6">
            <h1 className="text-2xl font-bold">Invoice receipt</h1>
            <p className="mt-2 text-sm text-gray-400">Invoice #{invoice.id}</p>
          </header>

          <div className="mb-6 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-gray-400">Status</p>
              <p className="text-lg font-semibold text-white">{invoice.status}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Issued on</p>
              <p className="text-lg font-semibold text-white">{formatDate(invoice.created_at)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Service period</p>
              <p className="text-lg font-semibold text-white">
                {formatDate(invoice.period_start)} – {formatDate(invoice.period_end)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Amount</p>
              <p className="text-lg font-semibold text-white">
                {formatCurrency(invoice.amount_cents, invoice.currency)}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-800">
            <table className="min-w-full divide-y divide-gray-800">
              <thead>
                <tr className="bg-gray-900/80">
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-300">Description</th>
                  <th className="px-4 py-2 text-right text-sm font-semibold text-gray-300">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {(invoice.invoice_items ?? [
                  {
                    id: 'line-item',
                    description: resolvePlanName(invoice),
                    amount_cents: invoice.amount_cents,
                  },
                ]).map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2 text-sm text-gray-200">{item.description}</td>
                    <td className="px-4 py-2 text-right text-sm text-gray-200">
                      {formatCurrency(item.amount_cents, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={handlePrint}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Print receipt
            </button>
            <button
              onClick={() => navigate('/dashboard/billing')}
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-300 hover:bg-gray-800"
            >
              Back to billing
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-6 text-center text-gray-400">
          Invoice not found.
        </div>
      )}

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
};

export default Receipt;
