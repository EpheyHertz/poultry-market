import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
          PoultryMarket
        </p>
        <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">Page Not Found</h1>
        <p className="mt-3 text-base text-slate-600 dark:text-slate-300">
          We could not find the page you requested. Check the link or head back to
          the marketplace.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-pfs-green px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-pfs-green-700"
        >
          Back To Home
        </Link>
      </div>
    </main>
  );
}
