'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Invoice {
  id: number;
  invoice_number: string;
  client_name: string;
  issue_date: string;
  due_date: string;
  total_with_vat: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/invoices?${params}`);
      const data = await res.json();
      
      if (res.ok) {
        setInvoices(data.invoices);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setError('Nepodařilo se načíst faktury');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleDelete = useCallback(
    async (invoiceId: number) => {
      const confirmed = window.confirm('Opravdu chcete odstranit tuto fakturu?');
      if (!confirmed) {
        return;
      }

      setDeletingId(invoiceId);
      setError(null);

      try {
        const res = await fetch(`/api/invoices/${invoiceId}`, {
          method: 'DELETE',
        });

        if (res.ok) {
          setInvoices((prev) => prev.filter((invoice) => invoice.id !== invoiceId));
        } else {
          const data = await res.json();
          setError(data.error || 'Fakturu se nepodařilo odstranit');
        }
      } catch (err) {
        console.error('Error deleting invoice:', err);
        setError('Fakturu se nepodařilo odstranit');
      } finally {
        setDeletingId(null);
      }
    },
    []
  );

  const statusLabels = {
    draft: 'Koncept',
    sent: 'Odesláno',
    paid: 'Zaplaceno',
    overdue: 'Po splatnosti',
    cancelled: 'Zrušeno',
  };

  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-emerald-100 text-emerald-800',
    paid: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-500',
  };

  const handleStatusChange = useCallback(
    async (invoiceId: number, status: Invoice['status']) => {
      try {
        const res = await fetch(`/api/invoices/${invoiceId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Nepodařilo se změnit stav faktury');
        }

        const updated = await res.json();
        setInvoices((prev) =>
          prev.map((invoice) =>
            invoice.id === invoiceId
              ? {
                  ...invoice,
                  status: updated.status,
                  total_with_vat: updated.total_with_vat,
                  issue_date: updated.issue_date,
                  due_date: updated.due_date,
                }
              : invoice
          )
        );
      } catch (err) {
        console.error('Error updating status:', err);
        const message =
          err instanceof Error
            ? err.message
            : 'Nepodařilo se změnit stav faktury';
        setError(message);
      }
    },
    []
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Faktury</h1>
          <p className="mt-2 text-sm text-gray-600">
            Správa a přehled všech faktur
          </p>
        </div>
        <div className="flex gap-3">
          <a href="/api/invoices/export" download>
            <Button variant="outline">📊 Export CSV</Button>
          </a>
          <Link href="/app/invoices/create">
            <Button>+ Nová faktura</Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 border border-red-200 bg-red-50 text-sm text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <input
          type="text"
          placeholder="Hledat fakturu..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        >
          <option value="">Všechny stavy</option>
          <option value="draft">Koncept</option>
          <option value="sent">Odesláno</option>
          <option value="paid">Zaplaceno</option>
          <option value="overdue">Po splatnosti</option>
        </select>
      </div>

      {/* Invoices list */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Načítání...</div>
        ) : invoices.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Žádné faktury nenalezeny
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Číslo faktury
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Klient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Datum vystavení
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Splatnost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Celkem
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stav
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Akce
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {invoice.invoice_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {invoice.client_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(invoice.issue_date).toLocaleDateString('cs-CZ')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(invoice.due_date).toLocaleDateString('cs-CZ')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {parseFloat(invoice.total_with_vat).toLocaleString('cs-CZ', {
                      minimumFractionDigits: 2,
                    })}{' '}
                    Kč
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <select
                      value={invoice.status}
                      onChange={(e) =>
                        handleStatusChange(
                          invoice.id,
                          e.target.value as Invoice['status']
                        )
                      }
                      className={`px-2 py-1 rounded-md border text-xs font-semibold ${
                        statusColors[invoice.status]
                      }`}
                    >
                      <option value="draft">Koncept</option>
                      <option value="sent">Odesláno</option>
                      <option value="paid">Zaplaceno</option>
                      <option value="overdue">Po splatnosti</option>
                      <option value="cancelled">Zrušeno</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/app/invoices/${invoice.id}`}
                      className="text-emerald-600 hover:text-emerald-900 mr-4"
                    >
                      Detail
                    </Link>
                    <a
                      href={`/api/invoices/${invoice.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 hover:text-emerald-900 mr-4"
                    >
                      PDF
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDelete(invoice.id)}
                      className="inline-flex items-center justify-center text-red-600 hover:text-red-800 disabled:opacity-50"
                      disabled={deletingId === invoice.id}
                      aria-label="Odstranit fakturu"
                    >
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.75 3a1.25 1.25 0 0 0-1.25 1.25V5H5a.75.75 0 0 0 0 1.5h10a.75.75 0 0 0 0-1.5h-2.5v-.75A1.25 1.25 0 0 0 11.25 3h-2.5ZM6.5 7.5a.75.75 0 0 0-.75.75v6A1.75 1.75 0 0 0 7.5 16h5a1.75 1.75 0 0 0 1.75-1.75v-6a.75.75 0 0 0-1.5 0v6c0 .138-.112.25-.25.25h-5a.25.25 0 0 1-.25-.25v-6a.75.75 0 0 0-.75-.75Zm2 .75a.75.75 0 0 1 1.5 0v5a.75.75 0 0 1-1.5 0v-5Zm3.5-.75a.75.75 0 0 0-.75.75v5a.75.75 0 0 0 1.5 0v-5a.75.75 0 0 0-.75-.75Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
