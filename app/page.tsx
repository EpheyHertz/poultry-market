"use client";

import { useState, useEffect, useRef, useMemo, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion, useAnimation, useInView } from 'framer-motion';
import { clsx } from 'clsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  CheckCircle,
  Globe,
  Moon,
  Play,
  Shield,
  ShoppingCart,
  Star,
  Sun,
  Truck,
  Users,
  Zap
} from 'lucide-react';

type Highlight = {
  icon: typeof Truck;
  title: string;
  description: string;
};

type FeatureTile = {
  icon: typeof Truck;
  title: string;
  description: string;
  image: string;
  bullets: string[];
};

type Testimonial = {
  name: string;
  role: string;
  image: string;
  content: string;
  rating: number;
};

const heroHighlights: Highlight[] = [
  {
    icon: Truck,
    title: 'Cold-chain Dispatch',
    description: 'Guaranteed freshness with monitored temperature routes.'
  },
  {
    icon: Shield,
    title: 'Veterinary Certified',
    description: 'Audited farms and real-time health documentation.'
  },
  {
    icon: Globe,
    title: 'Nationwide Reach',
    description: '18 fulfillment hubs serving chefs, homes, and retailers.'
  }
];

const marketMetrics = [
  { label: 'Orders Delivered', value: '450K+', helper: '99.2% on-time fulfillment' },
  { label: 'Partner Farms', value: '620', helper: 'Traceable and certified' },
  { label: 'Daily Volume', value: '12T', helper: 'Fresh produce moved daily' },
  { label: 'Customer NPS', value: '74', helper: 'Industry-leading loyalty' }
];

const featureTiles: FeatureTile[] = [
  {
    icon: Shield,
    title: 'Traceable Supply Chains',
    description: 'Follow every flock from hatchery to doorstep with blockchain-backed certificates and live health records.',
    image: '/images/chicken_in_cages.jpg',
    bullets: ['Digital health passports', 'QA snapshots at every hub', 'Transparent farm audits']
  },
  {
    icon: Truck,
    title: 'Intelligent Fulfillment',
    description: 'AI-assisted route planning and demand forecasting keep inventory lean while guaranteeing freshness.',
    image: '/images/gettyimages-1791498223-612x612.jpg',
    bullets: ['Same-day dispatch windows', 'Cold-chain routing', 'Real-time tracking links']
  },
  {
    icon: ShoppingCart,
    title: 'Wholesale Meets Retail',
    description: 'Dynamic pricing and curated storefronts let chefs, households, and resellers shop their way.',
    image: '/images/gettyimages-919680038-612x612.jpg',
    bullets: ['Bulk & bundle deals', 'Smart substitutions', 'Flexible payment terms']
  },
  {
    icon: Users,
    title: 'Partner Growth Studio',
    description: 'Dedicated growth strategists help producers brand, package, and scale to new regions.',
    image: '/images/1758148946399-farm.png',
    bullets: ['Story-driven branding', 'Regional launch playbooks', 'Always-on analytics']
  }
];

const storyGallery = [
  {
    title: 'Morning Farm Harvest',
    image: '/images/black_chick.jpg',
    caption: 'Organic feed, humane rearing, and flavor-forward breeds ready for dispatch.'
  },
  {
    title: 'Quality Control Lab',
    image: '/images/gettyimages-92482265-612x612.jpg',
    caption: 'Veterinary teams certify every crate before it hits the cold-chain line.'
  },
  {
    title: 'Community Deliveries',
    image: '/images/chick.jpg',
    caption: 'Neighborhood hubs bring farm-fresh poultry closer to every table.'
  }
];

const testimonials: Testimonial[] = [
  {
    name: 'Chef Nala Wanjiru',
    role: 'Executive Chef, The Golden Rooster',
    image: '/images/gettyimages-92515721-612x612.jpg',
    content:
      'Poultry Market Kenya redesigned how we source poultry. Our kitchens now receive perfectly chilled, traceable cuts before brunch service even begins.',
    rating: 5
  },
  {
    name: 'Daniel Otieno',
    role: 'Second-generation Poultry Farmer',
    image: '/images/gettyimages-902089270-612x612.jpg',
    content:
      'The partner growth studio helped us launch a premium brand with packaging and storytelling that resonates. Weekly revenue is up 52%.',
    rating: 5
  },
  {
    name: 'Farida Musa',
    role: 'Caterer & Home Chef',
    image: '/images/gettyimages-919680038-612x612.jpg',
    content:
      'Deliveries are effortless and punctual. The platform remembers my prep calendar and adjusts orders automatically.',
    rating: 5
  }
];

const marqueeItems = [
  'Farm-to-table logistics',
  'Always-on quality assurance',
  'Predictive procurement tools',
  'Sustainable packaging loops',
  'Partner profitability clinics',
  'Chef-tested recipes & cuts'
];

type RevealDirection = 'up' | 'down' | 'left' | 'right';

function Reveal({
  children,
  delay = 0,
  className,
  direction = 'up'
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  direction?: RevealDirection;
}) {
  const controls = useAnimation();
  const ref = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(ref, { once: true, margin: '-120px' });
  const variants = useMemo(() => {
    const offset = 64;
    const hidden = { opacity: 0, x: 0, y: 0 } as { opacity: number; x?: number; y?: number };

    if (direction === 'left') hidden.x = -offset;
    if (direction === 'right') hidden.x = offset;
    if (direction === 'up') hidden.y = offset;
    if (direction === 'down') hidden.y = -offset;

    return {
      hidden,
      visible: { opacity: 1, x: 0, y: 0 }
    };
  }, [direction]);

  useEffect(() => {
    if (isInView) {
      controls.start('visible');
    }
  }, [controls, isInView]);

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={controls}
      variants={variants}
      transition={{ duration: 0.8, ease: 'easeOut', delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function HomePage() {
  const [isDark, setIsDark] = useState(true);
  const hasResolvedTheme = useRef(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined' || hasResolvedTheme.current) {
      return;
    }

    const stored = window.localStorage.getItem('pmk-theme');
    const prefersDark = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false;
    const initialTheme = stored ? stored === 'dark' : prefersDark;

    setIsDark(initialTheme);
    document.documentElement.classList.toggle('dark', initialTheme);
    hasResolvedTheme.current = true;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !hasResolvedTheme.current) {
      return;
    }

    window.localStorage.setItem('pmk-theme', isDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial(prev => (prev + 1) % testimonials.length);
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={clsx(
        'min-h-screen transition-colors duration-500 overflow-x-hidden',
        isDark ? 'bg-slate-950 text-slate-50' : 'bg-slate-50 text-slate-900'
      )}
    >
      <nav
        className={clsx(
          'fixed top-0 z-50 w-full overflow-hidden backdrop-blur-2xl transition-colors duration-500 shadow-[0_1px_0_0_rgba(255,255,255,0.05)]',
          isDark
            ? 'border-b border-white/10 bg-slate-950/70 supports-[backdrop-filter]:bg-slate-950/45'
            : 'border-b border-emerald-100/60 bg-white/70 supports-[backdrop-filter]:bg-white/40'
        )}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <motion.div
            initial={{ opacity: 0, scale: 0.6, x: -120, y: -40 }}
            animate={{ opacity: 0.45, scale: 1.1, x: 40, y: 0 }}
            transition={{ duration: 8, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
            className={clsx(
              'absolute -top-24 -left-24 h-56 w-56 rounded-full blur-3xl',
              isDark ? 'bg-emerald-500/40' : 'bg-emerald-300/40'
            )}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.5, x: 120, y: 60 }}
            animate={{ opacity: 0.35, scale: 1.2, x: -30, y: -10 }}
            transition={{ duration: 10, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
            className={clsx(
              'absolute -bottom-28 right-[-6rem] h-64 w-64 rounded-full blur-3xl',
              isDark ? 'bg-amber-400/30' : 'bg-amber-300/40'
            )}
          />
          <motion.div
            initial={{ opacity: 0, rotate: -10 }}
            animate={{ opacity: 0.15, rotate: 6 }}
            transition={{ duration: 12, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
            className={clsx(
              'absolute inset-x-1/4 top-1/2 h-32 w-2/3 -translate-y-1/2 rounded-full bg-gradient-to-r blur-2xl',
              isDark ? 'from-emerald-500/20 via-teal-400/20 to-amber-300/10' : 'from-emerald-300/20 via-white/30 to-amber-200/10'
            )}
          />
          <div
            className={clsx(
              'absolute inset-x-0 bottom-0 h-px w-full opacity-60',
              isDark
                ? 'bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent'
                : 'bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent'
            )}
          />
        </div>

        <div className="container relative mx-auto flex items-center justify-between px-3 sm:px-4 py-3 sm:py-4">
          <Link href="/" className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <div className="relative h-9 w-9 sm:h-11 sm:w-11 flex-shrink-0 overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-400 via-rose-400 to-emerald-500 shadow-lg">
              <span className="flex h-full w-full items-center justify-center text-lg sm:text-2xl">🐔</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm sm:text-lg font-semibold tracking-[0.08em] sm:tracking-[0.12em] text-emerald-300 truncate">
                <span className="sm:hidden">PMK</span>
                <span className="hidden sm:inline">POULTRY MARKET KENYA</span>
              </p>
              <p className={clsx('text-[10px] sm:text-xs truncate', isDark ? 'text-slate-300' : 'text-slate-500')}>
                <span className="hidden sm:inline">Farm-to-table poultry experiences</span>
                <span className="sm:hidden">Poultry Market</span>
              </p>
            </div>
          </Link>

          <div
            className={clsx(
              'hidden items-center space-x-4 lg:space-x-8 text-sm font-medium md:flex',
              isDark ? 'text-slate-200' : 'text-slate-700'
            )}
          >
            <Link href="#features" className="transition-colors hover:text-emerald-400">
              Features
            </Link>
            <Link href="#story" className="transition-colors hover:text-emerald-400">
              Story
            </Link>
            <Link href="#testimonials" className="transition-colors hover:text-emerald-400">
              Reviews
            </Link>
            <Link href="/blog" className="transition-colors hover:text-emerald-400">
              Blog
            </Link>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className={clsx(
                'h-8 w-8 sm:h-10 sm:w-10 transition-colors duration-300',
                isDark ? 'text-emerald-200 hover:text-white' : 'text-emerald-600 hover:text-emerald-500'
              )}
              onClick={() => setIsDark(prev => !prev)}
              aria-pressed={isDark}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="h-4 w-4 sm:h-5 sm:w-5" /> : <Moon className="h-4 w-4 sm:h-5 sm:w-5" />}
            </Button>
            <Link href="/auth/login" className="hidden sm:block">
              <Button
                variant="ghost"
                className={clsx(
                  'transition-colors duration-300',
                  isDark ? 'text-emerald-200 hover:text-white' : 'text-emerald-600 hover:text-emerald-500'
                )}
              >
                Sign In
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button
                size="sm"
                className={clsx(
                  'transition-transform duration-300 hover:scale-[1.02] shadow-lg text-xs sm:text-sm px-2 sm:px-4 h-8 sm:h-10',
                  isDark
                    ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-amber-300 text-slate-950 hover:from-emerald-300 hover:via-teal-300 hover:to-amber-200'
                    : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-400 text-white hover:from-emerald-400 hover:via-teal-400 hover:to-amber-300'
                )}
              >
                <span className="hidden sm:inline">Join PMK</span>
                <span className="sm:hidden">Join</span>
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-24 sm:pt-28">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src="/images/chickencages.jpg"
              alt="Poultry Market Kenya farm partners"
              fill
              priority
              sizes="100vw"
              className={clsx('object-cover transition duration-500', isDark ? 'brightness-[0.45]' : 'brightness-[0.75]')}
            />
            <div
              className={clsx(
                'absolute inset-0 transition-colors duration-500',
                isDark
                  ? 'bg-gradient-to-br from-slate-950/60 via-slate-950/70 to-slate-950/30'
                  : 'bg-gradient-to-br from-white/40 via-white/20 to-emerald-100/20'
              )}
            />
          </div>

          <div className="relative">
            <div className="container mx-auto grid gap-8 lg:gap-12 px-4 pb-20 pt-12 sm:pb-28 sm:pt-16 lg:grid-cols-[minmax(0,1fr),minmax(0,0.8fr)] lg:pb-36 lg:pt-24">
              <Reveal className="space-y-6 sm:space-y-8">
                <Badge
                  className={clsx(
                    'w-fit backdrop-blur transition-colors duration-300 text-xs sm:text-sm',
                    isDark ? 'border border-white/20 bg-white/10 text-emerald-200' : 'border border-emerald-200/60 bg-emerald-50 text-emerald-700'
                  )}
                >
                  <span className="hidden sm:inline">2025 Launch · Trusted by Kenyan chefs, farmers & households</span>
                  <span className="sm:hidden">Trusted by Kenyan farmers & buyers</span>
                </Badge>
                <h1
                  className={clsx(
                    'max-w-2xl text-3xl font-semibold leading-tight transition-colors sm:text-4xl md:text-5xl lg:text-6xl',
                    isDark ? 'text-white' : 'text-slate-900'
                  )}
                >
                  Farm-fresh poultry for every Kenyan table.
                </h1>
                <p
                  className={clsx(
                    'max-w-xl text-base transition-colors sm:text-lg md:text-xl',
                    isDark ? 'text-slate-200' : 'text-slate-600'
                  )}
                >
                  Connect with trusted farmers, get reliable cold-chain delivery, and enjoy premium poultry products across Kenya.
                </p>

                <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                  <Link href="/auth/register" className="w-full sm:w-auto">
                    <Button size="lg" className="w-full bg-emerald-400 text-slate-950 shadow-emerald-500/40 transition hover:scale-[1.02] hover:bg-emerald-300 text-sm sm:text-base">
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  </Link>
                  <Button
                    size="lg"
                    variant="outline"
                    className={clsx(
                      'w-full transition sm:w-auto text-sm sm:text-base',
                      isDark
                        ? 'border-white/30 bg-white/10 text-white hover:bg-white/20'
                        : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                    )}
                  >
                    <Play className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    Watch Demo
                  </Button>
                </div>

                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
                  {heroHighlights.map((item, index) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 32 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ y: -8, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ delay: 0.4 + index * 0.1, duration: 0.6, ease: 'easeOut' }}
                      className={clsx(
                        'rounded-xl sm:rounded-2xl p-3 sm:p-4 backdrop-blur transition-colors duration-300',
                        isDark ? 'border border-white/10 bg-white/10' : 'border border-emerald-100 bg-white/70'
                      )}
                    >
                      <div
                        className={clsx(
                          'flex items-center space-x-2 sm:space-x-3 text-xs sm:text-sm font-medium uppercase tracking-[0.12em] sm:tracking-[0.18em]',
                          isDark ? 'text-emerald-200' : 'text-emerald-600'
                        )}
                      >
                        <item.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span>
                          {item.title}
                        </span>
                      </div>
                      <p
                        className={clsx(
                          'mt-2 sm:mt-3 text-xs sm:text-sm transition-colors duration-300',
                          isDark ? 'text-slate-100/80' : 'text-slate-600'
                        )}
                      >
                        {item.description}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </Reveal>

              <div className="relative hidden lg:block">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ delay: 0.35, duration: 0.8, ease: 'easeOut' }}
                  className={clsx(
                    'relative rounded-[32px] p-6 backdrop-blur-xl shadow-2xl transition-colors duration-500',
                    isDark ? 'border border-white/20 bg-white/5' : 'border border-emerald-100 bg-white/70'
                  )}
                >
                  <div className="grid gap-4">
                    <motion.div
                      animate={{ y: [0, -12, 0] }}
                      transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                      className="relative h-64 overflow-hidden rounded-3xl sm:h-80"
                    >
                      <Image
                        src="/images/chicken_in_cages.jpg"
                        alt="Cold-chain prep"
                        fill
                        sizes="(min-width: 1024px) 520px, 100vw"
                        className="object-cover"
                      />
                    </motion.div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <motion.div
                        animate={{ y: [0, 10, 0] }}
                        transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
                        className="relative h-40 overflow-hidden rounded-2xl"
                      >
                        <Image
                          src="/images/black_and_white_chick.jpg"
                          alt="Heritage breeds"
                          fill
                          sizes="(min-width: 640px) 250px, 100vw"
                          className="object-cover"
                        />
                      </motion.div>
                      <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
                        className="relative h-40 overflow-hidden rounded-2xl"
                      >
                        <Image
                          src="/images/gettyimages-1791498223-612x612.jpg"
                          alt="Market-ready cuts"
                          fill
                          sizes="(min-width: 640px) 250px, 100vw"
                          className="object-cover"
                        />
                      </motion.div>
                    </div>
                  </div>

                  <div
                    className={clsx(
                      'mt-5 flex flex-col gap-3 rounded-2xl p-4 text-sm transition-colors duration-300',
                      isDark ? 'bg-slate-950/70 text-slate-200' : 'bg-emerald-50 text-slate-700'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className={clsx('uppercase tracking-[0.3em]', isDark ? 'text-emerald-300' : 'text-emerald-600')}>
                        Live dispatch
                      </p>
                      <div
                        className={clsx(
                          'flex items-center space-x-2 text-xs transition-colors',
                          isDark ? 'text-slate-300' : 'text-emerald-700'
                        )}
                      >
                        <Shield className="h-4 w-4" />
                        <span>QA cleared 3 mins ago</span>
                      </div>
                    </div>
                    <p className={clsx(isDark ? 'text-slate-100' : 'text-slate-700')}>
                      &ldquo;Batch FF-0825&rdquo; is sealed, scanned, and loading for Nairobi CBD in a zero-emission fleet.
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>

            <div className="absolute inset-x-0 bottom-0">
              <div
                className={clsx(
                  'overflow-hidden border-t py-4 transition-colors duration-500',
                  isDark ? 'border-white/10 bg-slate-950/80' : 'border-emerald-100 bg-emerald-50/70'
                )}
              >
                <motion.div
                  className={clsx(
                    'flex min-w-max items-center space-x-6 text-sm uppercase tracking-[0.3em] transition-colors duration-500',
                    isDark ? 'text-slate-200' : 'text-emerald-700'
                  )}
                  animate={{ x: ['0%', '-50%'] }}
                  transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
                >
                  {[...marqueeItems, ...marqueeItems].map((item, index) => (
                    <span key={`${item}-${index}`} className="flex items-center space-x-2">
                      <span>{item}</span>
                      <span className={clsx(isDark ? 'text-emerald-300' : 'text-emerald-500')}>•</span>
                    </span>
                  ))}
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="features"
          className={clsx(
            'py-16 sm:py-24 transition-colors duration-500',
            isDark ? 'bg-slate-950' : 'bg-slate-100'
          )}
        >
          <div className="container mx-auto px-4">
            <Reveal className="mx-auto max-w-3xl text-center" direction="down">
              <Badge
                className={clsx(
                  'mb-4 transition-colors duration-300',
                  isDark
                    ? 'border border-emerald-300/40 bg-emerald-300/10 text-emerald-200'
                    : 'border border-emerald-200/60 bg-emerald-50 text-emerald-700'
                )}
              >
                Why partners choose Poultry Market Kenya
              </Badge>
              <h2
                className={clsx(
                  'text-2xl font-semibold transition-colors sm:text-3xl md:text-4xl',
                  isDark ? 'text-white' : 'text-slate-900'
                )}
              >
                Everything you need to succeed in poultry.
              </h2>
              <p
                className={clsx(
                  'mt-3 sm:mt-4 text-base sm:text-lg transition-colors',
                  isDark ? 'text-slate-300' : 'text-slate-600'
                )}
              >
                Tools designed to boost quality, protect margins, and grow your business.
              </p>
            </Reveal>

            <div className="mt-10 sm:mt-14 grid gap-6 sm:gap-8 lg:grid-cols-2">
              {featureTiles.map((feature, index) => (
                <Reveal key={feature.title} delay={index * 0.12} className="h-full" direction={index % 2 === 0 ? 'left' : 'right'}>
                  <motion.div whileHover={{ y: -12, scale: 1.01 }} whileTap={{ scale: 0.99 }} className="h-full">
                    <Card
                      className={clsx(
                        'h-full overflow-hidden transition-colors',
                        isDark ? 'border border-white/10 bg-white/5 text-slate-50' : 'border border-emerald-100 bg-white text-slate-800'
                      )}
                    >
                      <CardContent className="grid gap-6 p-6 sm:grid-cols-[minmax(0,0.7fr),1fr]">
                      <div className="relative h-48 overflow-hidden rounded-2xl sm:h-full">
                        <Image
                          src={feature.image}
                          alt={feature.title}
                          fill
                          sizes="(min-width: 1024px) 320px, 100vw"
                          className="object-cover"
                        />
                        <div
                          className={clsx(
                            'absolute inset-0 transition-colors duration-300',
                            isDark ? 'bg-gradient-to-t from-slate-950/60 via-slate-950/10 to-transparent' : 'bg-gradient-to-t from-slate-900/20 via-white/10 to-transparent'
                          )}
                        />
                        <div
                          className={clsx(
                            'absolute bottom-4 left-4 flex items-center space-x-2 text-xs uppercase tracking-[0.25em] transition-colors',
                            isDark ? 'text-emerald-200' : 'text-emerald-600'
                          )}
                        >
                          <feature.icon className="h-4 w-4" />
                          <span>Poultry Market Kenya</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3
                          className={clsx(
                            'text-2xl font-semibold transition-colors',
                            isDark ? 'text-white' : 'text-slate-900'
                          )}
                        >
                          {feature.title}
                        </h3>
                        <p
                          className={clsx(
                            'text-sm transition-colors',
                            isDark ? 'text-slate-200/90' : 'text-slate-600'
                          )}
                        >
                          {feature.description}
                        </p>
                        <ul
                          className={clsx(
                            'space-y-2 text-sm transition-colors',
                            isDark ? 'text-slate-200/80' : 'text-slate-600'
                          )}
                        >
                          {feature.bullets.map(bullet => (
                            <li key={bullet} className="flex items-start space-x-2">
                              <CheckCircle
                                className={clsx(
                                  'mt-0.5 h-4 w-4',
                                  isDark ? 'text-emerald-300' : 'text-emerald-500'
                                )}
                              />
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section
          className={clsx(
            'py-16 sm:py-24 transition-colors duration-500',
            isDark ? 'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950' : 'bg-gradient-to-b from-white via-emerald-50 to-white'
          )}
          id="story"
        >
          <div className="container mx-auto px-4">
            <Reveal className="mx-auto max-w-3xl text-center" direction="down">
              <Badge
                className={clsx(
                  'mb-4 transition-colors duration-300',
                  isDark ? 'border border-amber-200/40 bg-amber-100/10 text-amber-200' : 'border border-amber-200/60 bg-amber-50 text-amber-700'
                )}
              >
                Inside the Poultry Market Kenya journey
              </Badge>
              <h2
                className={clsx(
                  'text-2xl font-semibold transition-colors sm:text-3xl md:text-4xl',
                  isDark ? 'text-white' : 'text-slate-900'
                )}
              >
                See how we keep things fresh, every day.
              </h2>
            </Reveal>

            <div className="mt-10 sm:mt-14 grid gap-6 sm:gap-10 lg:grid-cols-3">
              {storyGallery.map((story, index) => (
                <Reveal key={story.title} delay={index * 0.15} direction={index === 1 ? 'up' : index === 0 ? 'left' : 'right'}>
                  <motion.div
                    whileHover={{ y: -10, scale: 1.01 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    className={clsx(
                      'group overflow-hidden rounded-3xl shadow-lg transition duration-500',
                      isDark
                        ? 'border border-white/10 bg-white/5 hover:border-emerald-300/40 hover:shadow-emerald-500/20'
                        : 'border border-emerald-100 bg-white hover:border-emerald-300/60 hover:shadow-emerald-400/20'
                    )}
                  >
                    <div className="relative h-72 overflow-hidden">
                      <Image
                        src={story.image}
                        alt={story.title}
                        fill
                        sizes="(min-width: 1024px) 360px, 100vw"
                        className=" object-cover transition duration-700 group-hover:scale-105"
                      />
                      <div
                        className={clsx(
                          'absolute inset-0 transition-colors duration-300',
                          isDark
                            ? 'bg-gradient-to-t from-slate-950/80 via-transparent'
                            : 'bg-gradient-to-t from-slate-900/20 via-transparent'
                        )}
                      />
                      <div className="absolute bottom-4 left-4">
                        <p
                          className={clsx(
                            'text-sm font-semibold uppercase tracking-[0.3em] transition-colors',
                            isDark ? 'text-emerald-200' : 'text-emerald-600'
                          )}
                        >
                          {story.title}
                        </p>
                      </div>
                    </div>
                    <div className="p-6">
                      <p
                        className={clsx(
                          'text-sm transition-colors',
                          isDark ? 'text-slate-200/90' : 'text-slate-600'
                        )}
                      >
                        {story.caption}
                      </p>
                    </div>
                  </motion.div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section
          className={clsx(
            'py-16 sm:py-24 transition-colors duration-500',
            isDark ? 'bg-slate-950' : 'bg-white'
          )}
        >
          <div className="container mx-auto px-4">
            <Reveal className="mx-auto max-w-5xl text-center" direction="down">
              <Badge
                className={clsx(
                  'mb-4 transition-colors duration-300',
                  isDark ? 'border border-emerald-300/40 bg-emerald-300/10 text-emerald-200' : 'border border-emerald-200/60 bg-emerald-50 text-emerald-700'
                )}
              >
                Signals that matter
              </Badge>
              <h2
                className={clsx(
                  'text-2xl font-semibold transition-colors sm:text-3xl md:text-4xl',
                  isDark ? 'text-white' : 'text-slate-900'
                )}
              >
                Our impact in numbers.
              </h2>
            </Reveal>

            <div className="mt-8 sm:mt-12 grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
              {marketMetrics.map(metric => (
                <Reveal key={metric.label} className="h-full" direction="up">
                  <motion.div whileHover={{ y: -10, scale: 1.01 }} transition={{ type: 'spring', stiffness: 200, damping: 18 }} className="h-full">
                    <div
                      className={clsx(
                        'h-full rounded-3xl p-6 text-left shadow-lg transition-colors duration-300',
                        isDark ? 'border border-white/10 bg-white/5' : 'border border-emerald-100 bg-white'
                      )}
                    >
                      <p className={clsx('text-3xl font-semibold transition-colors', isDark ? 'text-white' : 'text-slate-900')}>
                        {metric.value}
                      </p>
                      <p
                        className={clsx(
                          'mt-2 text-sm font-medium uppercase tracking-[0.25em] transition-colors',
                          isDark ? 'text-emerald-200' : 'text-emerald-600'
                        )}
                      >
                        {metric.label}
                      </p>
                      <p className={clsx('mt-4 text-sm transition-colors', isDark ? 'text-slate-200/80' : 'text-slate-600')}>
                        {metric.helper}
                      </p>
                    </div>
                  </motion.div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section
          id="testimonials"
          className={clsx(
            'py-16 sm:py-24 transition-colors duration-500',
            isDark ? 'bg-gradient-to-b from-slate-900 to-slate-950' : 'bg-gradient-to-b from-emerald-50 to-white'
          )}
        >
          <div className="container mx-auto px-4">
            <Reveal className="mx-auto max-w-2xl text-center" direction="down">
              <Badge
                className={clsx(
                  'mb-4 transition-colors duration-300',
                  isDark ? 'border border-amber-200/40 bg-amber-200/10 text-amber-200' : 'border border-amber-200/60 bg-amber-50 text-amber-700'
                )}
              >
                Partner voices
              </Badge>
              <h2
                className={clsx(
                  'text-2xl font-semibold transition-colors sm:text-3xl md:text-4xl',
                  isDark ? 'text-white' : 'text-slate-900'
                )}
              >
                What our partners say.
              </h2>
              <p
                className={clsx(
                  'mt-3 sm:mt-4 text-base sm:text-lg transition-colors',
                  isDark ? 'text-slate-300' : 'text-slate-600'
                )}
              >
                Real stories from farmers, chefs, and businesses across Kenya.
              </p>
            </Reveal>

            <div className="relative mx-auto mt-10 sm:mt-14 max-w-4xl">
              <div
                className={clsx(
                  'relative overflow-hidden rounded-[32px] shadow-2xl transition-colors duration-500',
                  isDark ? 'border border-white/10 bg-white/5' : 'border border-emerald-100 bg-white'
                )}
              >
                <AnimatePresence mode="wait">
                  {(() => {
                    const testimonial = testimonials[activeTestimonial];
                    return (
                      <motion.div
                        key={testimonial.name}
                        initial={{ opacity: 0, x: 120 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -120 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="relative px-6 py-10 sm:px-16 sm:py-16"
                      >
                        <div className="flex min-h-[350px] sm:min-h-[420px] flex-col items-center justify-center space-y-6 sm:space-y-8 text-center">
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                            className={clsx(
                              'relative h-24 w-24 overflow-hidden rounded-full border-[6px] transition-colors',
                              isDark ? 'border-emerald-300/60' : 'border-emerald-400/80'
                            )}
                          >
                            <Image
                              src={testimonial.image}
                              alt={testimonial.name}
                              fill
                              sizes="96px"
                              className="object-cover"
                            />
                          </motion.div>
                          <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1, duration: 0.4, ease: 'easeOut' }}
                            className="flex items-center justify-center gap-2"
                          >
                            {[...Array(testimonial.rating)].map((_, starIndex) => (
                              <Star
                                key={`${testimonial.name}-star-${starIndex}`}
                                className={clsx('h-5 w-5', isDark ? 'fill-amber-300 text-amber-300' : 'fill-amber-400 text-amber-400')}
                              />
                            ))}
                          </motion.div>
                          <motion.blockquote
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15, duration: 0.5, ease: 'easeOut' }}
                            className={clsx(
                              'max-w-3xl text-lg sm:text-xl md:text-2xl font-medium leading-relaxed transition-colors',
                              isDark ? 'text-slate-100' : 'text-slate-700'
                            )}
                          >
                            &ldquo;{testimonial.content}&rdquo;
                          </motion.blockquote>
                          <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.4, ease: 'easeOut' }}
                            className="space-y-1"
                          >
                            <p
                              className={clsx(
                                'text-base sm:text-lg font-semibold transition-colors',
                                isDark ? 'text-white' : 'text-slate-900'
                              )}
                            >
                              {testimonial.name}
                            </p>
                            <p
                              className={clsx(
                                'text-xs sm:text-sm uppercase tracking-[0.2em] sm:tracking-[0.3em] transition-colors',
                                isDark ? 'text-emerald-200' : 'text-emerald-600'
                              )}
                            >
                              {testimonial.role}
                            </p>
                          </motion.div>
                        </div>
                      </motion.div>
                    );
                  })()}
                </AnimatePresence>
                <div className="relative flex h-full items-end justify-center space-x-3 pb-6">
                  {testimonials.map((testimonial, index) => (
                    <button
                      key={testimonial.name}
                      type="button"
                      onClick={() => setActiveTestimonial(index)}
                      className={`h-2.5 w-10 rounded-full transition ${
                        index === activeTestimonial
                          ? isDark
                            ? 'bg-emerald-300'
                            : 'bg-emerald-500'
                          : isDark
                            ? 'bg-white/20 hover:bg-white/40'
                            : 'bg-emerald-100 hover:bg-emerald-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-400 py-24 text-slate-950">
          <div className="absolute inset-0 bg-white/10 mix-blend-overlay" />
          <div className="container relative mx-auto px-4">
            <Reveal className="mx-auto max-w-3xl text-center" delay={0.1}>
              <Zap className="mx-auto h-14 w-14 text-slate-950/80" />
              <h2 className="mt-6 text-4xl font-semibold sm:text-5xl">
                Launch your next chapter with Poultry Market Kenya.
              </h2>
              <p className="mt-4 text-lg text-slate-900/80">
                Secure sourcing, smart delivery, and storytelling that moves Kenyan markets. Let’s build a fresher food future together.
              </p>
            </Reveal>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/auth/register">
                <Button size="lg" className="bg-slate-950 text-emerald-300 shadow-lg shadow-slate-900/40 transition hover:scale-[1.03] hover:text-white">
                  Create your free hub
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="border-slate-900 text-slate-900 transition hover:bg-slate-900 hover:text-emerald-200">
                  Talk to our growth team
                </Button>
              </Link>
            </div>
            <p className="mt-8 text-center text-sm text-slate-900/70">
              Early adopters enjoy complimentary packaging audits and launch campaign assets.
            </p>
          </div>
        </section>
      </main>

      <footer
        className={clsx(
          'py-10 sm:py-16 transition-colors duration-500',
          isDark ? 'border-t border-white/10 bg-slate-950' : 'border-t border-emerald-100 bg-white'
        )}
      >
        <div className="container mx-auto px-4">
          {/* Top Section - Logo and Description */}
          <div className="flex flex-col items-center text-center mb-10">
            <Link href="/" className="flex items-center space-x-3 mb-4">
              <div className="relative h-12 w-12 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 via-rose-400 to-emerald-500 shadow-lg">
                <span className="flex h-full w-full items-center justify-center text-2xl">🐔</span>
              </div>
              <div className="text-left">
                <p className="text-base sm:text-lg font-semibold tracking-[0.12em] text-emerald-400">PMK</p>
                <p className={clsx('text-xs transition-colors', isDark ? 'text-slate-400' : 'text-slate-500')}>
                  Poultry Market Kenya
                </p>
              </div>
            </Link>
            <p className={clsx('text-sm max-w-md transition-colors', isDark ? 'text-slate-400' : 'text-slate-600')}>
              Connecting farmers, sellers, and buyers across Kenya.
            </p>
          </div>

          {/* Links Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 mb-10">
            <div className="space-y-3">
              <p className={clsx('text-xs font-semibold uppercase tracking-wider', isDark ? 'text-emerald-300' : 'text-emerald-600')}>
                Shop
              </p>
              <div className={clsx('flex flex-col space-y-2 text-sm', isDark ? 'text-slate-300' : 'text-slate-600')}>
                <Link href="/products" className="hover:text-emerald-400 transition-colors">Products</Link>
                <Link href="/store" className="hover:text-emerald-400 transition-colors">Stores</Link>
                <Link href="/categories" className="hover:text-emerald-400 transition-colors">Categories</Link>
              </div>
            </div>

            <div className="space-y-3">
              <p className={clsx('text-xs font-semibold uppercase tracking-wider', isDark ? 'text-emerald-300' : 'text-emerald-600')}>
                Sell
              </p>
              <div className={clsx('flex flex-col space-y-2 text-sm', isDark ? 'text-slate-300' : 'text-slate-600')}>
                <Link href="/auth/register" className="hover:text-emerald-400 transition-colors">Register</Link>
                <Link href="/company" className="hover:text-emerald-400 transition-colors">Business</Link>
                <Link href="/seller" className="hover:text-emerald-400 transition-colors">Dashboard</Link>
              </div>
            </div>

            <div className="space-y-3">
              <p className={clsx('text-xs font-semibold uppercase tracking-wider', isDark ? 'text-emerald-300' : 'text-emerald-600')}>
                Learn
              </p>
              <div className={clsx('flex flex-col space-y-2 text-sm', isDark ? 'text-slate-300' : 'text-slate-600')}>
                <Link href="/blog" className="hover:text-emerald-400 transition-colors">Blog</Link>
                <Link href="/chatbot" className="hover:text-emerald-400 transition-colors">AI Chat</Link>
                <Link href="/contact" className="hover:text-emerald-400 transition-colors">Contact</Link>
              </div>
            </div>

            <div className="space-y-3">
              <p className={clsx('text-xs font-semibold uppercase tracking-wider', isDark ? 'text-emerald-300' : 'text-emerald-600')}>
                Legal
              </p>
              <div className={clsx('flex flex-col space-y-2 text-sm', isDark ? 'text-slate-300' : 'text-slate-600')}>
                <Link href="/terms" className="hover:text-emerald-400 transition-colors">Terms</Link>
                <Link href="/terms" className="hover:text-emerald-400 transition-colors">Privacy</Link>
                <Link href="/contact" className="hover:text-emerald-400 transition-colors">Help</Link>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div
            className={clsx(
              'pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs',
              isDark ? 'border-white/10 text-slate-500' : 'border-emerald-100 text-slate-500'
            )}
          >
            <p>© {new Date().getFullYear()} Poultry Market Kenya</p>
            <div className="flex items-center gap-4">
              <Link href="/terms" className="hover:text-emerald-400 transition-colors">Terms</Link>
              <span>•</span>
              <Link href="/terms" className="hover:text-emerald-400 transition-colors">Privacy</Link>
              <span>•</span>
              <Link href="/contact" className="hover:text-emerald-400 transition-colors">Support</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
