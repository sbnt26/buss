'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { clientSchema, type ClientInput } from '@/lib/schemas/client';

export default function CreateClientPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      country: 'Česká republika',
    },
  });

  const onSubmit = async (data: ClientInput) => {
    try {
      setLoading(true);
      setError(null);

      // Send data with correct field names for database
      const clientData = {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        ico: data.ic || null,
        dic: data.dic || null,
        address_street: data.street || null,
        address_city: data.city || null,
        address_zip: data.postal_code || null,
        address_country: 'CZ', // Always send CZ for Czech Republic
        notes: data.note || null,
      };

      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Chyba při vytváření klienta');
      }

      // Redirect to client detail
      router.push(`/app/clients/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Došlo k chybě');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Nový klient</h1>
        <p className="mt-2 text-sm text-gray-600">
          Vyplňte informace o novém klientovi
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Základní údaje
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Název *
              </label>
              <input
                type="text"
                placeholder="Název firmy nebo jméno"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                {...register('name')}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="info@firma.cz"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon
                </label>
                <input
                  type="tel"
                  placeholder="+420 123 456 789"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.phone ? 'border-red-300' : 'border-gray-300'
                  }`}
                  {...register('phone')}
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IČO
                </label>
                <input
                  type="text"
                  placeholder="12345678"
                  maxLength={8}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.ic ? 'border-red-300' : 'border-gray-300'
                  }`}
                  {...register('ic')}
                />
                {errors.ic && (
                  <p className="mt-1 text-sm text-red-600">{errors.ic.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  DIČ
                </label>
                <input
                  type="text"
                  placeholder="CZ12345678"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.dic ? 'border-red-300' : 'border-gray-300'
                  }`}
                  {...register('dic')}
                />
                {errors.dic && (
                  <p className="mt-1 text-sm text-red-600">{errors.dic.message}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Adresa</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ulice a číslo popisné
              </label>
              <input
                type="text"
                placeholder="Hlavní 123"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.street ? 'border-red-300' : 'border-gray-300'
                }`}
                {...register('street')}
              />
              {errors.street && (
                <p className="mt-1 text-sm text-red-600">{errors.street.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Město
                </label>
                <input
                  type="text"
                  placeholder="Praha"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.city ? 'border-red-300' : 'border-gray-300'
                  }`}
                  {...register('city')}
                />
                {errors.city && (
                  <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PSČ
                </label>
                <input
                  type="text"
                  placeholder="11000"
                  maxLength={6}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.postal_code ? 'border-red-300' : 'border-gray-300'
                  }`}
                  {...register('postal_code')}
                />
                {errors.postal_code && (
                  <p className="mt-1 text-sm text-red-600">{errors.postal_code.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Země
              </label>
              <input
                type="text"
                placeholder="Česká republika"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.country ? 'border-red-300' : 'border-gray-300'
                }`}
                {...register('country')}
              />
              {errors.country && (
                <p className="mt-1 text-sm text-red-600">{errors.country.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Poznámka</h2>
          <textarea
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.note ? 'border-red-300' : 'border-gray-300'
            }`}
            rows={4}
            placeholder="Volitelná poznámka o klientovi..."
            {...register('note')}
          ></textarea>
          {errors.note && (
            <p className="mt-1 text-sm text-red-600">{errors.note.message}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-end">
          <button
            type="button"
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            onClick={() => router.push('/app/clients')}
          >
            Zrušit
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Ukládání...' : 'Vytvořit klienta'}
          </button>
        </div>
      </form>
    </div>
  );
}

