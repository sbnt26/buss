'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';

interface Client {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  ico: string | null;
  dic: string | null;
  address_street: string | null;
  address_city: string | null;
  address_zip: string | null;
  address_country: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchClient = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}`);
      const data = await res.json();

      if (res.ok) {
        setClient(data);
      } else {
        setError(data.error || 'Klient nenalezen');
      }
    } catch (err) {
      setError('Chyba při načítání klienta');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!client) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const payload = {
        name: client.name ?? '',
        email: client.email ?? '',
        phone: client.phone ?? '',
        ico: client.ico ?? '',
        dic: client.dic ?? '',
        address_street: client.address_street ?? '',
        address_city: client.address_city ?? '',
        address_zip: client.address_zip ?? '',
        address_country: client.address_country ?? 'CZ',
        notes: client.notes ?? '',
      };

      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setClient(data);
        setEditing(false);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const data = await res.json();
        const validationMessage = Array.isArray(data.details)
          ? data.details[0]?.message
          : undefined;
        setError(validationMessage || data.error || 'Chyba při ukládání');
      }
    } catch (err) {
      setError('Chyba při ukládání klienta');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Opravdu chcete smazat tohoto klienta? Tato akce je nevratná.')) {
      return;
    }

    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        router.push('/app/clients');
      } else {
        const data = await res.json();
        setError(data.error || 'Chyba při mazání klienta');
      }
    } catch (err) {
      setError('Chyba při mazání klienta');
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-500">Načítání...</p>
      </div>
    );
  }

  if (error && !client) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Alert variant="error">{error}</Alert>
        <Button className="mt-4" onClick={() => router.push('/app/clients')}>
          ← Zpět na klienty
        </Button>
      </div>
    );
  }

  if (!client) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{client.name}</h1>
          <p className="mt-2 text-sm text-gray-600">
            Vytvořeno {new Date(client.created_at).toLocaleDateString('cs-CZ')}
          </p>
        </div>

        <div className="flex gap-3">
          {!editing ? (
            <>
              <Button variant="outline" onClick={() => setEditing(true)}>
                ✏️ Upravit
              </Button>
              <Button onClick={() => router.push('/app/clients')}>← Zpět</Button>
            </>
          ) : (
            <Button
              variant="outline"
              onClick={() => {
                setEditing(false);
                fetchClient();
              }}
            >
              Zrušit
            </Button>
          )}
        </div>
      </div>

      {success && (
        <Alert variant="success" className="mb-6">
          Klient byl úspěšně aktualizován
        </Alert>
      )}

      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Základní údaje</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Název *
              </label>
              <Input
                value={client.name}
                onChange={(e) => setClient({ ...client, name: e.target.value })}
                disabled={!editing}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <Input
                type="email"
                value={client.email || ''}
                onChange={(e) => setClient({ ...client, email: e.target.value })}
                disabled={!editing}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefon
              </label>
              <Input
                value={client.phone || ''}
                onChange={(e) => setClient({ ...client, phone: e.target.value })}
                disabled={!editing}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">IČO</label>
              <Input
                value={client.ico || ''}
                onChange={(e) => setClient({ ...client, ico: e.target.value })}
                disabled={!editing}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">DIČ</label>
              <Input
                value={client.dic || ''}
                onChange={(e) => setClient({ ...client, dic: e.target.value })}
                disabled={!editing}
              />
            </div>
          </div>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Adresa</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ulice a číslo
              </label>
              <Input
                value={client.address_street || ''}
                onChange={(e) => setClient({ ...client, address_street: e.target.value })}
                disabled={!editing}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Město</label>
              <Input
                value={client.address_city || ''}
                onChange={(e) => setClient({ ...client, address_city: e.target.value })}
                disabled={!editing}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">PSČ</label>
              <Input
                value={client.address_zip || ''}
                onChange={(e) => setClient({ ...client, address_zip: e.target.value })}
                disabled={!editing}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Země</label>
              <Input
                value={client.address_country || 'CZ'}
                onChange={(e) => setClient({ ...client, address_country: e.target.value })}
                disabled={!editing}
              />
            </div>
          </div>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Poznámka</h2>
          <textarea
            value={client.notes || ''}
            onChange={(e) => setClient({ ...client, notes: e.target.value })}
            disabled={!editing}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>

        {editing && (
          <div className="flex justify-between">
            <Button type="button" variant="destructive" onClick={handleDelete}>
              Smazat klienta
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Ukládání...' : 'Uložit změny'}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
