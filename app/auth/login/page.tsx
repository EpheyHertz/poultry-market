'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import GoogleSignIn from '@/components/auth/google-signin';
import { ThemeToggleSimple } from '@/components/theme/theme-toggle';
import { cn, sanitizeNextRedirect } from '@/lib/utils';

type FieldErrors = {
  email?: string;
  password?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;

function LoginPageContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams?.get('next');
  const nextPath = useMemo(() => sanitizeNextRedirect(rawNext), [rawNext]);
  const registerHref = nextPath
    ? `/auth/register?next=${encodeURIComponent(nextPath)}`
    : '/auth/register';
  const forgotPasswordHref = nextPath
    ? `/auth/forgot-password?next=${encodeURIComponent(nextPath)}`
    : '/auth/forgot-password';

  const redirectToRoleDashboard = (role?: string | null) => {
    switch (role) {
      case 'ADMIN':
        router.push('/admin/dashboard');
        return;
      case 'SELLER':
        router.push('/seller/dashboard');
        return;
      case 'COMPANY':
        router.push('/company/dashboard');
        return;
      case 'STAKEHOLDER':
        router.push('/stakeholder/dashboard');
        return;
      case 'DELIVERY_AGENT':
        router.push('/delivery-agent/dashboard');
        return;
      default:
        router.push('/customer/dashboard');
    }
  };

  const redirectAfterLogin = (role?: string | null) => {
    if (nextPath) {
      router.push(nextPath);
      return;
    }

    redirectToRoleDashboard(role);
  };

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

    if (!password.trim()) {
      nextErrors.password = 'Password is required.';
    } else if (password.length < PASSWORD_MIN_LENGTH) {
      nextErrors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        redirectAfterLogin(data?.user?.role);
      } else {
        setFormError(data.error || 'Invalid credentials.');
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
                Welcome Back To  Poultry Market
              </h2>
              <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">
                Track orders, manage listings, and keep your buyers updated from one
                secure dashboard.
              </p>
            </div>
            <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
              {[
                'Secure access with verified accounts',
                'Live order updates and delivery status',
                'Insights on demand and pricing trends',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-2 h-2 w-2 rounded-full bg-pfs-green dark:bg-emerald-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="rounded-2xl bg-white/70 p-4 text-sm text-slate-600 shadow-sm dark:bg-slate-900/70 dark:text-slate-300">
              Need help getting started? Contact support for account access or password
              recovery guidance.
            </div>
          </div>

          <div className="w-full sm:max-w-[420px] sm:justify-self-center lg:max-w-none lg:justify-self-end">
            <div className="w-full">
              <div className="text-center">
                <p className="text-xs uppercase tracking-[0.22em] text-pfs-green dark:text-emerald-400">
                  PoultryMarket
                </p>
                <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">
                  Welcome Back
                </h1>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Sign in to manage your marketplace account.
                </p>
              </div>

              <div className="mt-6 space-y-5">
                <GoogleSignIn
                  redirectTo={nextPath ?? undefined}
                  onError={(message) => setFormError(message)}
                />

                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                  <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                    Or
                  </span>
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                </div>

                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                  {formError && (
                    <div
                      role="alert"
                      className="rounded-md bg-red-50 px-3 py-2 text-sm text-pfs-danger dark:bg-red-950/40"
                    >
                      {formError}
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
                      }}
                      placeholder="you@poultrymarket.com"
                      aria-invalid={Boolean(fieldErrors.email)}
                      aria-describedby={
                        fieldErrors.email ? 'email-error' : undefined
                      }
                      className={inputClass(Boolean(fieldErrors.email))}
                    />
                    {fieldErrors.email && (
                      <p
                        id="email-error"
                        className="mt-1 text-xs text-pfs-danger"
                        aria-live="polite"
                      >
                        {fieldErrors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="password" className="text-sm text-slate-700 dark:text-slate-200">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(event) => {
                          setPassword(event.target.value);
                          clearFieldError('password');
                          setFormError('');
                        }}
                        placeholder="Enter your password"
                        aria-invalid={Boolean(fieldErrors.password)}
                        aria-describedby={
                          fieldErrors.password ? 'password-error' : undefined
                        }
                        className={cn(
                          inputClass(Boolean(fieldErrors.password)),
                          'pr-12'
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-pressed={showPassword}
                        aria-label={
                          showPassword ? 'Hide password' : 'Show password'
                        }
                        className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full p-2 text-slate-500 transition-colors duration-150 hover:text-pfs-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pfs-green/40 dark:text-slate-400 dark:hover:text-emerald-400"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p
                        id="password-error"
                        className="mt-1 text-xs text-pfs-danger"
                        aria-live="polite"
                      >
                        {fieldErrors.password}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <Link
                        href={forgotPasswordHref}
                        className="text-pfs-green transition-colors duration-150 hover:text-pfs-green-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                      >
                        Forgot Password?
                      </Link>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    aria-busy={isLoading}
                    className="h-11 w-full bg-pfs-green text-white transition-colors duration-150 hover:bg-pfs-green-700 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Signing In...
                      </span>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>

                <p className="text-center text-sm text-slate-600 dark:text-slate-300">
                  No Account Yet?{' '}
                  <Link
                    href={registerHref}
                    className="font-semibold text-pfs-green transition-colors duration-150 hover:text-pfs-green-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                  >
                    Create One
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}