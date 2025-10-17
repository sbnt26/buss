'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';

interface Client {
  id: number;
  name: string;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
}

export default function CreateInvoicePage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [clientId, setClientId] = useState<string>('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, unit_price: 0 },
  ]);
  const [note, setNote] = useState('');
  const [vatApplicable, setVatApplicable] = useState(true);

  // Preview state
  const [preview, setPreview] = useState<{
    subtotal: number;
    vat: number;
    total: number;
  } | null>(null);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch('/api/clients?limit=100');
      const data = await res.json();
      if (res.ok) {
        setClients(data.clients || []);
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
    }
  }, []);

  const fetchPreview = useCallback(async () => {
    try {
      const res = await fetch('/api/invoices/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items
            .filter((item) => item.description && item.quantity > 0)
            .map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unit_price,
              vatRate: vatApplicable ? 21 : 0,
              unit: 'ks',
            })),
          isVatPayer: vatApplicable,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPreview({
          subtotal: Number(data.subtotal),
          vat: Number(data.vatAmount ?? data.vat),
          total: Number(data.total ?? data.total_with_vat ?? 0),
        });
      }
    } catch (err) {
      console.error('Error fetching preview:', err);
    }
  }, [items, vatApplicable]);

  useEffect(() => {
    fetchClients();

    (async () => {
      try {
        const res = await fetch('/api/organization');
        if (!res.ok) return;
        const data = await res.json();
        const organizationIsVatPayer = Boolean(data?.isVatPayer) || Boolean(data?.dic);
        setVatApplicable(organizationIsVatPayer);
      } catch (error) {
        console.error('Error fetching organization for VAT defaults:', error);
      }
    })();
  }, [fetchClients]);

  useEffect(() => {
    if (clientId && items.some((item) => item.description && item.quantity > 0)) {
      fetchPreview();
    }
  }, [clientId, items, vatApplicable, fetchPreview]);

  function addItem() {
    setItems([...items, { description: '', quantity: 1, unit_price: 0 }]);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof InvoiceItem, value: string | number) {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const validItems = items.filter(
        (item) => item.description && item.quantity > 0 && item.unit_price >= 0
      );

      if (validItems.length === 0) {
        setError('Přidejte alespoň jednu položku faktury');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/simple-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: parseInt(clientId, 10),
          issueDate: issueDate,
          dueDate: dueDate,
          items: validItems.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            vatRate: vatApplicable ? 21 : 0
          })),
          notes: note || undefined,
          vatApplicable: vatApplicable,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push(`/app/invoices/${data.id}`);
      } else {
        setError(data.error || 'Chyba při vytváření faktury');
      }
    } catch (err) {
      setError('Chyba při vytváření faktury');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Nová faktura</h1>
        <p className="mt-2 text-sm text-gray-600">
          Vytvořte novou fakturu pro klienta
        </p>
      </div>

      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Základní údaje</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Klient *
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">Vyberte klienta</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                DPH
              </label>
              <div className="flex items-center space-x-4 mt-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={vatApplicable}
                    onChange={() => setVatApplicable(true)}
                    className="mr-2"
                  />
                  <span className="text-sm">S DPH (21%)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={!vatApplicable}
                    onChange={() => setVatApplicable(false)}
                    className="mr-2"
                  />
                  <span className="text-sm">Bez DPH</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Datum vystavení *
              </label>
              <Input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Datum splatnosti *
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Položky faktury</h2>
            <Button type="button" variant="outline" onClick={addItem}>
              + Přidat položku
            </Button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Popis *
                    </label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      placeholder="např. Vývoj webové aplikace"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Množství *
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(index, 'quantity', parseFloat(e.target.value) || 0)
                      }
                      required
                    />
                  </div>

                  <div className="col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cena/ks (Kč) *
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) =>
                        updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)
                      }
                      required
                    />
                  </div>

                  <div className="col-span-1 flex items-end">
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeItem(index)}
                      >
                        ✕
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-2 text-sm text-gray-600">
                  Celkem: {(item.quantity * item.unit_price).toFixed(2)} Kč
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Note */}
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Poznámka</h2>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Volitelná poznámka k faktuře..."
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        {/* Preview */}
        {preview && (
          <div className="bg-emerald-50 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Náhled částek</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-gray-700">
                <span>Mezisoučet:</span>
                <span className="font-medium">
                  {preview.subtotal.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč
                </span>
              </div>
              {vatApplicable && (
                <div className="flex justify-between text-gray-700">
                  <span>DPH (21%):</span>
                  <span className="font-medium">
                    {preview.vat.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč
                  </span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold text-gray-900 border-t pt-2">
                <span>Celkem:</span>
                <span>
                  {preview.total.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Zrušit
          </Button>
          <Button type="submit" disabled={loading || !clientId}>
            {loading ? 'Vytváření...' : 'Vytvořit fakturu'}
          </Button>
        </div>
      </form>
    </div>
  );
}
