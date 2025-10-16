'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import Link from 'next/link';

interface Invoice {
  id: number;
  invoice_number: string;
  client_name: string;
  client_email: string;
  client_ic: string;
  client_street: string;
  client_city: string;
  client_postal_code: string;
  issue_date: string;
  due_date: string;
  subtotal: string;
  vat: string;
  total_with_vat: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  note: string | null;
  vat_applicable: boolean;
  created_at: string;
  items: Array<{
    description: string;
    quantity: string;
    unit_price: string;
    total: string;
  }>;
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchInvoice = useCallback(async () => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`);
      const data = await res.json();

      if (res.ok) {
        setInvoice(data);
      } else {
        setError(data.error || 'Faktura nenalezena');
      }
    } catch (err) {
      setError('Chyba při načítání faktury');
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  async function updateStatus(newStatus: Invoice['status']) {
    setUpdating(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        const data = await res.json();
        setInvoice(data);
      } else {
        const data = await res.json();
        setError(data.error || 'Chyba při aktualizaci stavu');
      }
    } catch (err) {
      setError('Chyba při aktualizaci faktury');
    } finally {
      setUpdating(false);
    }
  }

  const statusLabels = {
    draft: 'Koncept',
    sent: 'Odesláno',
    paid: 'Zaplaceno',
    overdue: 'Po splatnosti',
    cancelled: 'Zrušeno',
  };

  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-500',
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-500">Načítání...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Alert variant="error">{error || 'Faktura nenalezena'}</Alert>
        <Button className="mt-4" onClick={() => router.push('/app/invoices')}>
          ← Zpět na faktury
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">{invoice.invoice_number}</h1>
            <span
              className={`px-3 py-1 text-sm font-semibold rounded-full ${
                statusColors[invoice.status]
              }`}
            >
              {statusLabels[invoice.status]}
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Vytvořeno {new Date(invoice.created_at).toLocaleDateString('cs-CZ')}
          </p>
        </div>

        <div className="flex gap-3">
          <Link href={`/api/invoices/${invoice.id}/pdf`} target="_blank">
            <Button variant="outline">📄 Stáhnout PDF</Button>
          </Link>
          <Button onClick={() => router.push('/app/invoices')}>← Zpět</Button>
        </div>
      </div>

      {/* Invoice Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Client Info */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Klient</h2>
          <div className="space-y-2 text-sm">
            <p className="font-medium text-gray-900">{invoice.client_name}</p>
            {invoice.client_ic && (
              <p className="text-gray-600">IČO: {invoice.client_ic}</p>
            )}
            {invoice.client_street && (
              <p className="text-gray-600">{invoice.client_street}</p>
            )}
            {invoice.client_city && (
              <p className="text-gray-600">
                {invoice.client_postal_code} {invoice.client_city}
              </p>
            )}
            {invoice.client_email && (
              <p className="text-gray-600">{invoice.client_email}</p>
            )}
          </div>
        </div>

        {/* Dates */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Data</h2>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-gray-600">Datum vystavení</p>
              <p className="font-medium text-gray-900">
                {new Date(invoice.issue_date).toLocaleDateString('cs-CZ')}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Datum splatnosti</p>
              <p className="font-medium text-gray-900">
                {new Date(invoice.due_date).toLocaleDateString('cs-CZ')}
              </p>
            </div>
          </div>
        </div>

        {/* Amounts */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Částky</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Mezisoučet:</span>
              <span className="font-medium text-gray-900">
                {parseFloat(invoice.subtotal).toLocaleString('cs-CZ', {
                  minimumFractionDigits: 2,
                })}{' '}
                Kč
              </span>
            </div>
            {invoice.vat_applicable && (
              <div className="flex justify-between">
                <span className="text-gray-600">DPH (21%):</span>
                <span className="font-medium text-gray-900">
                  {parseFloat(invoice.vat).toLocaleString('cs-CZ', {
                    minimumFractionDigits: 2,
                  })}{' '}
                  Kč
                </span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Celkem:</span>
              <span>
                {parseFloat(invoice.total_with_vat).toLocaleString('cs-CZ', {
                  minimumFractionDigits: 2,
                })}{' '}
                Kč
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Položky faktury</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Popis
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Množství
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cena/ks
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Celkem
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoice.items.map((item, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 text-sm text-gray-900">{item.description}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">
                    {parseFloat(item.quantity).toLocaleString('cs-CZ')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">
                    {parseFloat(item.unit_price).toLocaleString('cs-CZ', {
                      minimumFractionDigits: 2,
                    })}{' '}
                    Kč
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                    {parseFloat(item.total).toLocaleString('cs-CZ', {
                      minimumFractionDigits: 2,
                    })}{' '}
                    Kč
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Note */}
      {invoice.note && (
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Poznámka</h2>
          <p className="text-gray-700 text-sm">{invoice.note}</p>
        </div>
      )}

      {/* Actions */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Akce</h2>
        <div className="flex flex-wrap gap-3">
          {invoice.status === 'draft' && (
            <Button onClick={() => updateStatus('sent')} disabled={updating}>
              Označit jako odesláno
            </Button>
          )}
          {invoice.status === 'sent' && (
            <Button onClick={() => updateStatus('paid')} disabled={updating}>
              Označit jako zaplaceno
            </Button>
          )}
          {(invoice.status === 'draft' || invoice.status === 'sent') && (
            <Button
              variant="destructive"
              onClick={() => updateStatus('cancelled')}
              disabled={updating}
            >
              Zrušit fakturu
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

