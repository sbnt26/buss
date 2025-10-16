'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface DashboardStats {
  totalInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  sentInvoices: number;
  totalRevenue: string;
  recentInvoices: Array<{
    id: number;
    invoice_number: string;
    client_name: string;
    total_with_vat: string;
    status: string;
    issue_date: string;
  }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      // Fetch recent invoices
      const res = await fetch('/api/invoices?limit=3');
      const data = await res.json();

      if (res.ok) {
        // Calculate basic stats from the invoices
        const invoices = data.invoices || [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const paid = invoices.filter((inv: any) => inv.status === 'paid').length;
        const overdue = invoices.filter((inv: any) => {
          if (!inv.due_date) return false;
          const dueDate = new Date(inv.due_date);
          dueDate.setHours(0, 0, 0, 0);
          const isSettled = ['paid', 'cancelled'].includes(inv.status);
          return !isSettled && dueDate < today;
        }).length;
        const sent = invoices.filter((inv: any) => inv.status === 'sent').length;
        const revenue = invoices
          .filter((inv: any) => inv.status === 'paid')
          .reduce((sum: number, inv: any) => sum + parseFloat(inv.total_with_vat || '0'), 0);

        setStats({
          totalInvoices: data.pagination?.total || 0,
          paidInvoices: paid,
          overdueInvoices: overdue,
          sentInvoices: sent,
          totalRevenue: revenue.toFixed(2),
          recentInvoices: invoices,
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-500">Načítání...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Přehled vašeho fakturačního systému
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Celkem faktur</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {stats?.totalInvoices || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Zaplaceno</p>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {stats?.paidInvoices || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Po splatnosti</p>
          <p className="mt-2 text-3xl font-bold text-red-600">
            {stats?.overdueInvoices || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Odesláno</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">
            {stats?.sentInvoices || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-600">Celkový příjem</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {parseFloat(stats?.totalRevenue || '0').toLocaleString('cs-CZ', {
              minimumFractionDigits: 2,
            })}{' '}
            Kč
          </p>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">
            Poslední faktury
          </h2>
          <Link href="/app/invoices">
            <Button variant="outline">Zobrazit vše</Button>
          </Link>
        </div>
        <div className="p-6">
          {!stats?.recentInvoices || stats.recentInvoices.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Zatím nemáte žádné faktury
            </p>
          ) : (
            <div className="space-y-4">
              {stats.recentInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {invoice.invoice_number}
                    </p>
                    <p className="text-sm text-gray-600">{invoice.client_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {parseFloat(invoice.total_with_vat).toLocaleString('cs-CZ', {
                        minimumFractionDigits: 2,
                      })}{' '}
                      Kč
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(invoice.issue_date).toLocaleDateString('cs-CZ')}
                    </p>
                  </div>
                  <Link
                    href={`/app/invoices/${invoice.id}`}
                    className="ml-4 text-emerald-600 hover:text-emerald-900 text-sm font-medium"
                  >
                    Detail →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-emerald-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Rychlé akce
        </h2>
        <div className="flex gap-4">
          <Link href="/app/invoices/create">
            <Button>+ Nová faktura</Button>
          </Link>
          <Link href="/app/clients">
            <Button variant="outline">Správa klientů</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
