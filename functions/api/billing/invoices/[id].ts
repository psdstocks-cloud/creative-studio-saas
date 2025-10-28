import { handleOptions, errorResponse, jsonResponse } from '../../../_lib/http';
import {
  requireBillingUser,
  handleUnexpectedError,
  INVOICE_WITH_ITEMS_SELECT,
  mapInvoice,
  isMissingTableError,
} from '../_shared';
import type { BillingEnv } from '../_shared';

const buildHtmlReceipt = (invoice: ReturnType<typeof mapInvoice>) => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: invoice.currency || 'usd',
  });

  const periodStart = new Date(invoice.period_start);
  const periodEnd = new Date(invoice.period_end);
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const itemsHtml = invoice.invoice_items
    .map(
      (item) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatter.format(
            item.amount_cents / 100
          )}</td>
        </tr>
      `
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Invoice ${invoice.id}</title>
  <style>
    body { font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; color: #111827; }
    .container { max-width: 640px; margin: 40px auto; background: white; padding: 32px; border-radius: 12px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.15); }
    h1 { font-size: 24px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    .totals { font-weight: 600; }
    .meta { margin-bottom: 24px; color: #4b5563; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Invoice Receipt</h1>
    <div class="meta">
      <div><strong>Invoice ID:</strong> ${invoice.id}</div>
      <div><strong>Status:</strong> ${invoice.status}</div>
      <div><strong>Period:</strong> ${dateFormatter.format(periodStart)} – ${dateFormatter.format(periodEnd)}</div>
      <div><strong>Issued:</strong> ${dateFormatter.format(new Date(invoice.created_at))}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th style="text-align: left; padding: 8px; border-bottom: 2px solid #e5e7eb;">Description</th>
          <th style="text-align: right; padding: 8px; border-bottom: 2px solid #e5e7eb;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
      <tfoot>
        <tr class="totals">
          <td style="padding: 8px; text-align: right;">Total</td>
          <td style="padding: 8px; text-align: right;">${formatter.format(invoice.amount_cents / 100)}</td>
        </tr>
      </tfoot>
    </table>
  </div>
</body>
</html>`;
};

export const onRequest = async ({
  request,
  env,
  params,
}: {
  request: Request;
  env: BillingEnv;
  params: { id: string };
}) => {
  if (request.method === 'OPTIONS') {
    return handleOptions(request);
  }

  if (request.method !== 'GET') {
    return errorResponse(request, 405, 'Method Not Allowed');
  }

  const invoiceId = params?.id;
  if (!invoiceId) {
    return errorResponse(request, 400, 'Invoice id is required.');
  }

  try {
    const { supabase, user } = await requireBillingUser(request, env);

    const { data, error } = await supabase
      .from('invoices')
      .select(INVOICE_WITH_ITEMS_SELECT)
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error, 'invoices')) {
        return errorResponse(request, 404, 'Invoice not found.');
      }
      throw new Error(error.message || 'Unable to load invoice.');
    }

    if (!data) {
      return errorResponse(request, 404, 'Invoice not found.');
    }

    const invoice = mapInvoice(data as any);

    const url = new URL(request.url);
    const wantsHtml = url.searchParams.get('format') === 'html' ||
      (request.headers.get('accept') || '').includes('text/html');

    if (wantsHtml) {
      return new Response(buildHtmlReceipt(invoice), {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
    }

    return jsonResponse(request, 200, { invoice });
  } catch (error) {
    return handleUnexpectedError(request, error, 'Unable to load invoice.');
  }
};
