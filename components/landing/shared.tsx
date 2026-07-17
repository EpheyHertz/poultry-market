import { useEffect, useRef, useState } from 'react';
import {
  motion,
  useInView,
  type Variants,
} from 'framer-motion';

/* ─── Animation variants ─────────────────────────────────────── */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 36 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' as const } },
};

export const fadeLeft: Variants = {
  hidden: { opacity: 0, x: -44 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.75, ease: 'easeOut' as const } },
};

export const fadeRight: Variants = {
  hidden: { opacity: 0, x: 44 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.75, ease: 'easeOut' as const } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.88 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

export const blurUp: Variants = {
  hidden: { opacity: 0, y: 24, filter: 'blur(8px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease: 'easeOut' as const } },
};

/* ─── Hooks ──────────────────────────────────────────────────── */
export function useCountUp(target: number, duration = 2.2) {
  const [count, setCount] = useState(0);
  const spanRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(spanRef, { once: true, margin: '-60px' });

  useEffect(() => {
    if (!inView) return;
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
      else setCount(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, duration]);

  return { count, spanRef };
}

/* ─── Reveal wrapper ─────────────────────────────────────────── */
export function Reveal({
  children,
  variants = fadeUp,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  variants?: Variants;
  delay?: number;
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  const patchedVariants: Variants = {
    ...variants,
    visible: delay > 0
      ? {
          ...(typeof variants.visible === 'object' ? variants.visible : {}),
          transition: {
            ...(typeof variants.visible === 'object' && 'transition' in variants.visible
              ? (variants.visible as { transition?: object }).transition
              : {}),
            delay,
          },
        }
      : variants.visible,
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={patchedVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Pill label ─────────────────────────────────────────────── */
export function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.12em] border
      bg-orange-50 border-orange-200 text-orange-600
      dark:bg-orange-950/50 dark:border-orange-800/60 dark:text-orange-400">
      {children}
    </span>
  );
}

/* ─── CTA button ─────────────────────────────────────────────── */
export function Btn({
  href,
  children,
  size = 'md',
  variant = 'primary',
  className = '',
  external = true,
}: {
  href: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'ghost' | 'outline' | 'white';
  className?: string;
  external?: boolean;
}) {
  const pad = { sm: 'px-5 py-2.5 text-sm', md: 'px-6 py-3 text-sm', lg: 'px-8 py-4 text-base' };
  const cls = {
    primary:
      'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-400/25 hover:shadow-orange-400/40 hover:from-orange-600 hover:to-amber-600',
    ghost:
      'bg-white/10 border border-white/20 text-white hover:bg-white/20 backdrop-blur-sm',
    outline:
      'border border-orange-400 text-orange-500 hover:bg-orange-500 hover:text-white dark:border-orange-500 dark:text-orange-400 dark:hover:bg-orange-500 dark:hover:text-white',
    white:
      'bg-white text-orange-600 font-bold shadow-lg hover:shadow-xl hover:bg-orange-50',
  };
  return (
    <motion.a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      whileHover={{ scale: 1.04, y: -2 }}
      whileTap={{ scale: 0.97 }}
      className={`inline-flex items-center gap-2 rounded-xl font-semibold transition-all duration-300 ${pad[size]} ${cls[variant]} ${className}`}
    >
      {children}
    </motion.a>
  );
}

/* ─── Stat counter ───────────────────────────────────────────── */
export function StatPill({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  const { count, spanRef } = useCountUp(value);
  return (
    <div className="flex flex-col items-center gap-1 p-5 rounded-2xl
      bg-white border border-gray-100 shadow-sm
      dark:bg-gray-900 dark:border-gray-800">
      <span className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
        <span ref={spanRef}>{count.toLocaleString()}</span>{suffix}
      </span>
      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium text-center">{label}</span>
    </div>
  );
}
