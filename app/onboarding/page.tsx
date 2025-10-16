'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { OnboardingSchema, type OnboardingInput } from '@/lib/schemas/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';

export default function OnboardingPage() {
  const router = useRouter();
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<OnboardingInput>({
    resolver: zodResolver(OnboardingSchema),
    defaultValues: {
      isVatPayer: true,
      defaultVatRate: 21,
      defaultCurrency: 'CZK',
      invoicePrefix: '',
      invoiceNumberingStart: 1,
      addressCountry: 'CZ',
    },
  });

  const isVatPayer = watch('isVatPayer');

  const onSubmit = async (data: OnboardingInput) => {
    try {
      setIsLoading(true);
      setError('');

      const safeDefaultVatRate = data.isVatPayer
        ? Number.isFinite(data.defaultVatRate)
          ? data.defaultVatRate!
          : 21
        : 0;
      const safeNumberingStart = Number.isFinite(data.invoiceNumberingStart)
        ? data.invoiceNumberingStart!
        : 1;

      const payload: OnboardingInput = {
        ...data,
        addressStreet: data.addressStreet?.trim() || '',
        addressCity: data.addressCity?.trim() || '',
        addressZip: data.addressZip?.trim() || '',
        addressCountry: (data.addressCountry || 'CZ').trim().toUpperCase() as OnboardingInput['addressCountry'],
        bankAccount: data.bankAccount?.trim() || '',
        iban: data.iban?.trim().toUpperCase() || '',
        bankName: data.bankName?.trim() || '',
        dic: data.dic?.trim() || '',
        defaultVatRate: safeDefaultVatRate,
        invoicePrefix: data.invoicePrefix?.trim().toUpperCase() || '',
        invoiceNumberingStart: safeNumberingStart,
        defaultCurrency: (data.defaultCurrency || 'CZK').trim().toUpperCase() as OnboardingInput['defaultCurrency'],
      };

      const response = await fetch('/api/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Chyba při ukládání nastavení');
      }

      // Redirect to dashboard
      router.replace('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Došlo k chybě');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-background rounded-lg shadow-lg p-8" role="form">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Nastavení organizace</h1>
            <p className="text-muted-foreground">
              Krok {step} ze 3 - Dokončete nastavení pro začátek používání
            </p>
          </div>

          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex gap-2">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-2 flex-1 rounded-full ${
                    s <= step ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>

          {error && (
            <Alert variant="error" className="mb-6">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4">Adresa firmy</h2>
                
                <Input
                  label="Ulice a číslo popisné"
                  placeholder="Hlavní 123"
                  error={errors.addressStreet?.message}
                  {...register('addressStreet')}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Město"
                    placeholder="Praha"
                    error={errors.addressCity?.message}
                    {...register('addressCity')}
                  />

                  <Input
                    label="PSČ"
                    placeholder="11000"
                    maxLength={5}
                    error={errors.addressZip?.message}
                    {...register('addressZip')}
                  />
                </div>

                <Button 
                  type="button" 
                  onClick={async () => {
                    // Validate step 1 fields before proceeding
                    const isValid = await trigger(['addressStreet', 'addressCity', 'addressZip']);
                    if (isValid) {
                      setStep(2);
                    }
                  }} 
                  className="w-full"
                >
                  Pokračovat
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4">Bankovní údaje</h2>

                <Input
                  label="Číslo účtu (např. 123456789/0100)"
                  placeholder="123456789/0100"
                  error={errors.bankAccount?.message}
                  {...register('bankAccount')}
                />

                <Input
                  label="IBAN (nepovinné)"
                  placeholder="CZ6508000000192000145399"
                  error={errors.iban?.message}
                  {...register('iban')}
                />

                <Input
                  label="Název banky (nepovinné)"
                  placeholder="ČSOB"
                  error={errors.bankName?.message}
                  {...register('bankName')}
                />

                <div className="flex gap-4">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>
                    Zpět
                  </Button>
                  <Button 
                    type="button" 
                    onClick={async () => {
                      const isValid = await trigger(['bankAccount', 'iban', 'bankName']);
                      if (isValid) {
                        setStep(3);
                      }
                    }} 
                    className="flex-1"
                  >
                    Pokračovat
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4">Nastavení DPH a fakturace</h2>
                
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300"
                      aria-label="Jsem plátce DPH"
                      {...register('isVatPayer')}
                    />
                    <span className="text-sm">Jsem plátce DPH</span>
                  </label>
                </div>

                {isVatPayer && (
                  <>
                    <Input
                      label="DIČ (nepovinné)"
                      placeholder="CZ12345678"
                      error={errors.dic?.message}
                      {...register('dic')}
                    />

                    <Input
                      label="Výchozí sazba DPH (%)"
                      type="number"
                      defaultValue={21}
                      error={errors.defaultVatRate?.message}
                      {...register('defaultVatRate', { valueAsNumber: true })}
                    />
                  </>
                )}

                <Input
                  label="Prefix čísla faktury (nepovinné)"
                  placeholder="FV- nebo prázdné"
                  maxLength={10}
                  error={errors.invoicePrefix?.message}
                  {...register('invoicePrefix')}
                />

                <Input
                  label="Začátek číslování faktur"
                  type="number"
                  defaultValue={1}
                  error={errors.invoiceNumberingStart?.message}
                  {...register('invoiceNumberingStart', { valueAsNumber: true })}
                />

                <div className="flex gap-4">
                  <Button type="button" variant="outline" onClick={() => setStep(2)}>
                    Zpět
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    loading={isLoading}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Ukládání...' : 'Dokončit nastavení'}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
