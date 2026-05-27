'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggleSimple } from '@/components/theme/theme-toggle';
import { cn } from '@/lib/utils';

type FieldErrors = {
  email?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const clearFieldError = (field: keyof FieldErrors) => {
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const nextErrors: FieldErrors = {};

    if (!email.trim()) {
      nextErrors.email = 'Email is required.';
    } else if (!EMAIL_PATTERN.test(email)) {
      nextErrors.email = 'Enter a valid email address.';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');

    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSubmitted(true);
        setSuccessMessage(
          'If an account exists for this email, a reset link has been sent.'
        );
      } else {
        setFormError(data.error || 'Failed to send reset email.');
      }
    } catch (error) {
      setFormError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputBaseClass =
    'h-11 rounded-none border-0 border-b bg-transparent px-0 text-sm text-slate-900 placeholder:text-slate-400 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 dark:text-slate-100 dark:placeholder:text-slate-500';

  const inputClass = (hasError: boolean) =>
    cn(
      inputBaseClass,
      hasError
        ? 'border-pfs-danger focus-visible:border-pfs-danger'
        : 'border-slate-300 focus-visible:border-pfs-green dark:border-slate-700 dark:focus-visible:border-pfs-accent'
    );

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100 font-sans dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="fixed right-4 top-4 z-20">
        <ThemeToggleSimple />
      </div>
      <div className="min-h-screen flex items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-5xl lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-center lg:gap-12">
          <div className="hidden lg:flex lg:flex-col lg:gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-pfs-green dark:text-emerald-400">
                PoultryMarket
              </p>
              <h2 className="mt-3 text-4xl font-semibold text-slate-900 dark:text-slate-100">
                Recover Access In Minutes
              </h2>
              <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">
                We will send a secure reset link that expires in one hour.
              </p>
            </div>
            <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
              {[
                'Enter the email used on your account',
                'Check your inbox and spam folder for the link',
                'Create a strong password before signing in',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-2 h-2 w-2 rounded-full bg-pfs-green dark:bg-emerald-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="rounded-2xl bg-white/70 p-4 text-sm text-slate-600 shadow-sm dark:bg-slate-900/70 dark:text-slate-300">
              If you no longer have access to this email, contact support for manual
              verification.
            </div>
          </div>

          <div className="w-full sm:max-w-[420px] sm:justify-self-center lg:max-w-none lg:justify-self-end">
            <div className="w-full">
              <div className="text-center">
                <p className="text-xs uppercase tracking-[0.22em] text-pfs-green dark:text-emerald-400">
                  PoultryMarket
                </p>
                <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">
                  Reset Your Password
                </h1>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Enter your email and we will send a secure reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
                {formError && (
                  <div
                    role="alert"
                    className="rounded-md bg-red-50 px-3 py-2 text-sm text-pfs-danger dark:bg-red-950/40"
                  >
                    {formError}
                  </div>
                )}

                {successMessage && (
                  <div
                    role="status"
                    className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-pfs-green dark:bg-emerald-950/40"
                  >
                    {successMessage}
                  </div>
                )}

                <div>
                  <Label htmlFor="email" className="text-sm text-slate-700 dark:text-slate-200">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      clearFieldError('email');
                      setFormError('');
                      if (isSubmitted) {
                        setIsSubmitted(false);
                        setSuccessMessage('');
                      }
                    }}
                    placeholder="you@poultrymarket.com"
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={
                      fieldErrors.email ? 'forgot-email-error' : undefined
                    }
                    className={inputClass(Boolean(fieldErrors.email))}
                    disabled={isSubmitted}
                  />
                  {fieldErrors.email && (
                    <p
                      id="forgot-email-error"
                      className="mt-1 text-xs text-pfs-danger"
                      aria-live="polite"
                    >
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || isSubmitted}
                  aria-busy={isLoading}
                  className="h-11 w-full bg-pfs-green text-white transition-colors duration-150 hover:bg-pfs-green-700 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Sending...
                    </span>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
                <Link
                  href="/auth/login"
                  className="font-semibold text-pfs-green transition-colors duration-150 hover:text-pfs-green-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  Back To Login
                </Link>
              </div>

              {isSubmitted && (
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSubmitted(false);
                      setSuccessMessage('');
                    }}
                    className="text-sm font-semibold text-slate-500 transition-colors duration-150 hover:text-pfs-green dark:text-slate-400 dark:hover:text-emerald-400"
                  >
                    Send Another Email
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}