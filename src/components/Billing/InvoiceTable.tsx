import React from 'react';
import type { Invoice } from '../../types';

interface InvoiceTableProps {
  invoices: Invoice[];
  onViewReceipt?: (invoiceId: string) => void;
  isLoading?: boolean;
}

const formatCurrency = (amountCents: number, currency = 'USD') => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  });

  return formatter.format(amountCents / 100);
};

const formatDate = (iso: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const InvoiceTable: React.FC<InvoiceTableProps> = ({ invoices, onViewReceipt, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        Loading invoices...
      </div>
    );
  }

  if (!invoices.length) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-6 text-center text-gray-400">
        No invoices yet. Your subscription invoices will appear here after renewal.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-800 bg-gray-900/60">
      <table className="min-w-full divide-y divide-gray-800">
        <thead className="bg-gray-900/80">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Date</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Period</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Status</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Amount</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="hover:bg-gray-800/50">
              <td className="px-4 py-3 text-sm text-gray-200">{formatDate(invoice.created_at)}</td>
              <td className="px-4 py-3 text-sm text-gray-400">
                {formatDate(invoice.period_start)} – {formatDate(invoice.period_end)}
              </td>
              <td className="px-4 py-3 text-sm">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    invoice.status === 'paid'
                      ? 'bg-green-500/10 text-green-400'
                      : invoice.status === 'open'
                      ? 'bg-yellow-500/10 text-yellow-300'
                      : 'bg-gray-500/20 text-gray-300'
                  }`}
                >
                  {invoice.status.toUpperCase()}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-sm text-gray-200">
                {formatCurrency(invoice.amount_cents, invoice.currency)}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => onViewReceipt?.(invoice.id)}
                  className="rounded-lg border border-blue-500/40 px-3 py-1 text-sm font-medium text-blue-300 transition hover:bg-blue-500/10"
                >
                  View receipt
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InvoiceTable;
