'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggleSimple } from '@/components/theme/theme-toggle';
import { cn, sanitizeNextRedirect } from '@/lib/utils';

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

type RegisterFormData = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  role: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;

function RegisterForm() {
  const [formData, setFormData] = useState<RegisterFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    role: 'CUSTOMER',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams?.get('next');
  const nextPath = useMemo(() => sanitizeNextRedirect(rawNext), [rawNext]);
  const loginHref = nextPath
    ? `/auth/login?next=${encodeURIComponent(nextPath)}`
    : '/auth/login';

  useEffect(() => {
    const roleParam = searchParams?.get('role');
    if (roleParam) {
      setFormData((prev) => ({ ...prev, role: roleParam.toUpperCase() }));
    }
  }, [searchParams]);

  const clearFieldError = (field: keyof FieldErrors) => {
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const nextErrors: FieldErrors = {};

    if (!formData.name.trim()) {
      nextErrors.name = 'Full name is required.';
    }

    if (!formData.email.trim()) {
      nextErrors.email = 'Email is required.';
    } else if (!EMAIL_PATTERN.test(formData.email)) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!formData.password.trim()) {
      nextErrors.password = 'Password is required.';
    } else if (formData.password.length < PASSWORD_MIN_LENGTH) {
      nextErrors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
    }

    if (!formData.confirmPassword.trim()) {
      nextErrors.confirmPassword = 'Please confirm your password.';
    } else if (formData.confirmPassword !== formData.password) {
      nextErrors.confirmPassword = 'Passwords do not match.';
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
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          role: formData.role,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push(loginHref);
      } else {
        setFormError(data.error || 'Registration failed.');
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
                Build Your Poultry Network
              </h2>
              <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">
                Join a verified marketplace for buyers, sellers, and delivery teams.
              </p>
            </div>
            <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
              {[
                'Create a trusted customer profile in minutes',
                'Apply for Seller or Company access from your dashboard',
                'Get real-time order status and payouts',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-2 h-2 w-2 rounded-full bg-pfs-green dark:bg-emerald-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="rounded-2xl bg-white/70 p-4 text-sm text-slate-600 shadow-sm dark:bg-slate-900/70 dark:text-slate-300">
              Tip: Use a phone number that can receive delivery updates and payment
              confirmations.
            </div>
          </div>

          <div className="w-full sm:max-w-[420px] sm:justify-self-center lg:max-w-none lg:justify-self-end">
            <div className="w-full">
              <div className="text-center">
                <p className="text-xs uppercase tracking-[0.22em] text-pfs-green dark:text-emerald-400">
                  PoultryMarket
                </p>
                <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">
                  Create Your Account
                </h1>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Start buying or selling. For Seller or Company accounts, create a
                  customer account first and apply from your dashboard.
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

            <div>
              <Label htmlFor="name" className="text-sm text-slate-700 dark:text-slate-200">
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(event) => {
                  setFormData({ ...formData, name: event.target.value });
                  clearFieldError('name');
                  setFormError('');
                }}
                placeholder="Jane Doe"
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                className={inputClass(Boolean(fieldErrors.name))}
              />
              {fieldErrors.name && (
                <p
                  id="name-error"
                  className="mt-1 text-xs text-pfs-danger"
                  aria-live="polite"
                >
                  {fieldErrors.name}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="email" className="text-sm text-slate-700 dark:text-slate-200">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(event) => {
                  setFormData({ ...formData, email: event.target.value });
                  clearFieldError('email');
                  setFormError('');
                }}
                placeholder="you@poultrymarket.com"
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={
                  fieldErrors.email ? 'register-email-error' : undefined
                }
                className={inputClass(Boolean(fieldErrors.email))}
              />
              {fieldErrors.email && (
                <p
                  id="register-email-error"
                  className="mt-1 text-xs text-pfs-danger"
                  aria-live="polite"
                >
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="phone" className="text-sm text-slate-700 dark:text-slate-200">
                Phone Number (Optional)
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(event) => {
                  setFormData({ ...formData, phone: event.target.value });
                  setFormError('');
                }}
                placeholder="0712 345 678"
                className={cn(
                  inputBaseClass,
                  'border-slate-300 focus-visible:border-pfs-green dark:border-slate-700 dark:focus-visible:border-pfs-accent'
                )}
              />
            </div>

            <div className="rounded-lg bg-pfs-muted/60 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
              Account Type: Customer
            </div>

            <div>
              <Label htmlFor="password" className="text-sm text-slate-700 dark:text-slate-200">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(event) => {
                    setFormData({ ...formData, password: event.target.value });
                    clearFieldError('password');
                    clearFieldError('confirmPassword');
                    setFormError('');
                  }}
                  placeholder="Create a password"
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
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
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

            <div>
              <Label htmlFor="confirmPassword" className="text-sm text-slate-700 dark:text-slate-200">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(event) => {
                    setFormData({
                      ...formData,
                      confirmPassword: event.target.value,
                    });
                    clearFieldError('confirmPassword');
                    setFormError('');
                  }}
                  placeholder="Re-enter your password"
                  aria-invalid={Boolean(fieldErrors.confirmPassword)}
                  aria-describedby={
                    fieldErrors.confirmPassword
                      ? 'confirm-password-error'
                      : undefined
                  }
                  className={cn(
                    inputClass(Boolean(fieldErrors.confirmPassword)),
                    'pr-12'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-pressed={showConfirmPassword}
                  aria-label={
                    showConfirmPassword ? 'Hide password' : 'Show password'
                  }
                  className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full p-2 text-slate-500 transition-colors duration-150 hover:text-pfs-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pfs-green/40 dark:text-slate-400 dark:hover:text-emerald-400"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p
                  id="confirm-password-error"
                  className="mt-1 text-xs text-pfs-danger"
                  aria-live="polite"
                >
                  {fieldErrors.confirmPassword}
                </p>
              )}
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
                  Creating Account...
                </span>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

              <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
                Already Have An Account?{' '}
                <Link
                  href={loginHref}
                  className="font-semibold text-pfs-green transition-colors duration-150 hover:text-pfs-green-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
