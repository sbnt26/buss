'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';

interface Organization {
  name: string;
  ico: string;
  dic: string | null;
  addressStreet: string;
  addressCity: string;
  addressZip: string;
  addressCountry: string;
  bankAccount: string | null;
  iban: string | null;
  bankName: string | null;
  isVatPayer: boolean;
  defaultVatRate: number;
  invoicePrefix: string;
  invoiceNumberingStart: number;
  defaultCurrency: string;
}

export default function SettingsPage() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchOrganization();
  }, []);

  async function fetchOrganization() {
    try {
      setMessage(null);
      const res = await fetch('/api/organization');
      const data = await res.json();
      
      if (res.ok) {
        setOrganization({
          name: data.name ?? '',
          ico: data.ico ?? '',
          dic: data.dic ?? null,
          addressStreet: data.addressStreet ?? '',
          addressCity: data.addressCity ?? '',
          addressZip: data.addressZip ?? '',
          addressCountry: data.addressCountry ?? 'CZ',
          bankAccount: data.bankAccount ?? null,
          iban: data.iban ?? null,
          bankName: data.bankName ?? null,
          isVatPayer: Boolean(data.isVatPayer),
          defaultVatRate:
            data.defaultVatRate !== undefined && data.defaultVatRate !== null
              ? Number(data.defaultVatRate)
              : 21,
          invoicePrefix: data.invoicePrefix ?? '',
          invoiceNumberingStart:
            data.invoiceNumberingStart !== undefined && data.invoiceNumberingStart !== null
              ? Number(data.invoiceNumberingStart)
              : 1,
          defaultCurrency: data.defaultCurrency ?? 'CZK',
        });
      } else {
        setOrganization(null);
        setMessage({ type: 'error', text: data.error || 'Organizaci se nepodařilo načíst' });
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
      setMessage({ type: 'error', text: 'Chyba při načítání organizace' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!organization) return;

    setSaving(true);
    setMessage(null);

    try {
      const payload = {
        name: organization.name,
        ico: organization.ico,
        dic: organization.dic?.trim() ? organization.dic : undefined,
        addressStreet: organization.addressStreet,
        addressCity: organization.addressCity,
        addressZip: organization.addressZip,
        addressCountry: organization.addressCountry,
        bankAccount: organization.bankAccount?.trim()
          ? organization.bankAccount.trim()
          : undefined,
        iban: organization.iban?.trim() ? organization.iban.trim() : undefined,
        bankName: organization.bankName?.trim() ? organization.bankName.trim() : undefined,
        isVatPayer: organization.isVatPayer,
        defaultVatRate: organization.defaultVatRate,
        invoicePrefix: organization.invoicePrefix,
        invoiceNumberingStart: organization.invoiceNumberingStart,
        defaultCurrency: organization.defaultCurrency,
      };

      const res = await fetch('/api/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Nastavení bylo úspěšně uloženo' });
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Chyba při ukládání' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Chyba při ukládání nastavení' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-500">Načítání...</p>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Alert variant="error">{message?.text || 'Organizace nenalezena'}</Alert>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Nastavení</h1>
        <p className="mt-2 text-sm text-gray-600">
          Údaje vaší organizace pro faktury
        </p>
      </div>

      {message && (
        <Alert variant={message.type} className="mb-6">
          {message.text}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Název organizace *
              </label>
              <Input
                value={organization.name}
                onChange={(e) => setOrganization({ ...organization, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                IČO *
              </label>
              <Input
                value={organization.ico}
                onChange={(e) => setOrganization({ ...organization, ico: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                DIČ
              </label>
              <Input
                value={organization.dic || ''}
                onChange={(e) =>
                  setOrganization({ ...organization, dic: e.target.value || null })
                }
              />
            </div>

          </div>

          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Adresa</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ulice a číslo popisné
                </label>
                <Input
                value={organization.addressStreet}
                onChange={(e) => setOrganization({ ...organization, addressStreet: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Město
                </label>
                <Input
                value={organization.addressCity}
                onChange={(e) => setOrganization({ ...organization, addressCity: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PSČ
                </label>
                <Input
                value={organization.addressZip}
                onChange={(e) => setOrganization({ ...organization, addressZip: e.target.value })}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Země
                </label>
                <Input
                value={organization.addressCountry}
                onChange={(e) => setOrganization({ ...organization, addressCountry: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Bankovní údaje</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Číslo účtu
                </label>
                <Input
                  value={organization.bankAccount ?? ''}
                  onChange={(e) =>
                    setOrganization({ ...organization, bankAccount: e.target.value || null })
                  }
                  placeholder="123456789/0100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IBAN
                </label>
                <Input
                  value={organization.iban ?? ''}
                  onChange={(e) =>
                    setOrganization({ ...organization, iban: e.target.value || null })
                  }
                  placeholder="CZ65 0800 0000 1920 0014 5399"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Název banky (nepovinné)
                </label>
                <Input
                  value={organization.bankName ?? ''}
                  onChange={(e) =>
                    setOrganization({ ...organization, bankName: e.target.value || null })
                  }
                  placeholder="ČSOB"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? 'Ukládání...' : 'Uložit změny'}
          </Button>
        </div>
      </form>
    </div>
  );
}

