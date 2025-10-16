'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { SignupSchema, type SignupInput } from '@/lib/schemas/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(SignupSchema),
  });

  const onSubmit = async (data: SignupInput) => {
    try {
      setIsLoading(true);
      setError('');

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Chyba při registraci');
      }

      // Redirect to onboarding to complete setup
      router.push('/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Došlo k chybě');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="max-w-md w-full">
        <div className="bg-background rounded-lg shadow-lg p-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2">Registrace</h1>
            <p className="text-muted-foreground">
              Vytvořte si účet pro WhatsApp Invoicer
            </p>
          </div>

          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="vase@email.cz"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Celé jméno"
              type="text"
              placeholder="Jan Novák"
              error={errors.fullName?.message}
              {...register('fullName')}
            />

            <Input
              label="Heslo"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />

            <Input
              label="Název firmy"
              type="text"
              placeholder="Moje firma s.r.o."
              error={errors.companyName?.message}
              {...register('companyName')}
            />

            <Input
              label="IČO"
              type="text"
              placeholder="12345678"
              maxLength={8}
              error={errors.ico?.message}
              {...register('ico')}
            />

            <Button
              type="submit"
              className="w-full"
              loading={isLoading}
              disabled={isLoading}
            >
              {isLoading ? 'Probíhá registrace...' : 'Registrovat'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Již máte účet? </span>
            <a href="/login" className="text-primary hover:underline font-medium">
              Přihlásit se
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

