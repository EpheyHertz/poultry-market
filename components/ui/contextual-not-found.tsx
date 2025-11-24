'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home, RefreshCw } from 'lucide-react';

interface HelpfulLink {
  href: string;
  label: string;
  description?: string;
}

interface ActionLink {
  href: string;
  label: string;
}

interface ContextualNotFoundProps {
  title: string;
  description: string;
  contextLabel: string;
  primaryAction: ActionLink;
  secondaryAction?: ActionLink;
  helpfulLinks?: HelpfulLink[];
}

export default function ContextualNotFound({
  title,
  description,
  contextLabel,
  primaryAction,
  secondaryAction,
  helpfulLinks = [],
}: ContextualNotFoundProps) {
  return (
    <div className="min-h-[80vh] bg-gradient-to-br from-emerald-50 via-blue-50 to-white px-4 py-12 text-slate-900 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
      <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative mb-10 w-full overflow-hidden rounded-3xl border border-white/70 bg-white/80 p-8 shadow-2xl shadow-emerald-500/10 backdrop-blur-xl dark:border-slate-800/40 dark:bg-slate-900/70"
        >
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.25),_transparent_60%)]" />
          <span className="inline-flex items-center rounded-full bg-emerald-100/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
            {contextLabel} space
          </span>
          <h1 className="mt-4 text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-base text-slate-600 dark:text-slate-300">
            {description}
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <Button asChild className="w-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 text-white shadow-lg shadow-emerald-500/30 hover:from-emerald-600 hover:to-sky-600">
              <Link href={primaryAction.href}>
                <Home className="mr-2 h-4 w-4" />
                {primaryAction.label}
              </Link>
            </Button>
            {secondaryAction && (
              <Button asChild variant="outline" className="w-full rounded-full border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/40 dark:text-emerald-200 dark:hover:bg-emerald-500/10">
                <Link href={secondaryAction.href}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {secondaryAction.label}
                </Link>
              </Button>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="mt-8 text-sm text-slate-500 dark:text-slate-400"
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100/80 px-4 py-2 text-slate-600 dark:bg-slate-800/60 dark:text-slate-200">
              <RefreshCw className="h-4 w-4 text-emerald-500" />
              Try refreshing or explore the links below.
            </span>
          </motion.div>
        </motion.div>

        {helpfulLinks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="grid w-full gap-4 rounded-2xl border border-slate-100/80 bg-white/90 p-6 text-left shadow-xl shadow-emerald-500/5 dark:border-slate-800/60 dark:bg-slate-900/80"
          >
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Helpful links
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {helpfulLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group rounded-2xl border border-transparent bg-gradient-to-r from-emerald-50/70 to-sky-50/70 px-4 py-3 transition hover:border-emerald-200 hover:shadow-lg dark:from-slate-800/70 dark:to-slate-800/30"
                >
                  <p className="text-sm font-semibold text-slate-800 group-hover:text-emerald-700 dark:text-slate-100">
                    {link.label}
                  </p>
                  {link.description && (
                    <p className="text-xs text-slate-500 group-hover:text-slate-600 dark:text-slate-400">
                      {link.description}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
