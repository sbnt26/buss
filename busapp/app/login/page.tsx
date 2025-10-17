'use client';

import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoginSchema, type LoginInput } from '@/lib/schemas/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/app';
  
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      setIsLoading(true);
      setError('');

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Chyba při přihlášení');
      }

      // Use hard redirect to ensure cookie is set
      const redirectUrl = result.needsOnboarding ? '/onboarding' : (redirect || '/app');
      window.location.href = redirectUrl;
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
            <h1 className="text-3xl font-bold mb-2">Přihlášení</h1>
            <p className="text-muted-foreground">
              Přihlaste se do svého účtu
            </p>
          </div>

          {error && (
            <Alert variant="error">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <Input
              label="Email"
              type="email"
              placeholder="vase@email.cz"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Heslo"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />

            <Button
              type="submit"
              className="w-full"
              loading={isLoading}
              disabled={isLoading}
            >
              {isLoading ? 'Přihlašování...' : 'Přihlásit se'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <a href="#" className="text-muted-foreground hover:text-primary">
              Zapomenuté heslo?
            </a>
          </div>

          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">Nemáte účet? </span>
            <a href="/signup" className="text-primary hover:underline font-medium">
              Registrovat se
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Načítání…</div>}>
      <LoginForm />
    </Suspense>
  );
}
