'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ShoppingCart, BookOpen, Users, PenTool, TrendingUp, CheckCircle,
  ArrowRight, Bird, MessageCircle, Instagram, Facebook, Globe, Menu,
  X, Sparkles, BarChart3, Shield, Zap, Heart, Search, MapPin, Award,
  Lightbulb, Moon, Sun, Bot, Brain, ChevronDown, Star, UserPlus, Mail,
  Calendar, DollarSign, Megaphone, FileText, type LucideIcon,
} from 'lucide-react';

/* ─── Shared Components ──────────────────────────────────────── */

// FIX: Allow any CSS property (including 'filter') in motion variants
type MotionVariant = {
  hidden: { opacity?: number; y?: number; x?: number; scale?: number; filter?: string };
  visible: { opacity?: number; y?: number; x?: number; scale?: number; filter?: string };
};

export const fadeUp: MotionVariant = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};
export const fadeLeft: MotionVariant = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0 },
};
export const fadeRight: MotionVariant = {
  hidden: { opacity: 0, x: 30 },
  visible: { opacity: 1, x: 0 },
};
export const scaleIn: MotionVariant = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 },
};
export const blurUp: MotionVariant = {
  hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)' },
};

function Reveal({
  children,
  variants = fadeUp,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  variants?: MotionVariant;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Btn({
  children,
  href,
  size = 'md',
  variant = 'primary',
  className = '',
  external = true,
}: {
  children: React.ReactNode;
  href: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'ghost' | 'outline';
  className?: string;
  external?: boolean;
}) {
  const sizes = {
    sm: 'px-3.5 py-2 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-sm',
  };
  const variants = {
    primary:
      'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-400/25 hover:shadow-orange-400/45 border-0',
    ghost:
      'bg-white/5 border border-white/20 text-white hover:bg-white/15 hover:border-white/35',
    outline:
      'bg-transparent border border-orange-500/60 text-orange-500 hover:bg-orange-500/10 dark:text-orange-400 dark:border-orange-600/60',
  };
  const props = external
    ? { href, target: '_blank', rel: 'noopener noreferrer' }
    : { href };
  return (
    <motion.a
      {...props}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      className={`inline-flex items-center gap-2 font-semibold rounded-xl transition-all duration-300 ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </motion.a>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.12em] bg-orange-50 text-orange-600 border border-orange-200 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-800/60">
      {children}
    </span>
  );
}

function StatPill({
  label,
  value,
  suffix = '',
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-orange-50/70 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 text-center">
      <div className="text-2xl font-extrabold text-gray-900 dark:text-white">
        {value}
        <span className="text-orange-500">{suffix}</span>
      </div>
      <div className="text-[12px] text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  );
}

/* ─── TrustBadges ────────────────────────────────────────────── */

function TrustBadges() {
  const badges = [
    { icon: Shield, label: 'Secure Transactions' },
    { icon: CheckCircle, label: 'Verified Sellers' },
    { icon: Zap, label: 'Fast & Reliable' },
    { icon: Award, label: 'Trusted by 1000+' },
  ];
  return (
    <section className="py-10 bg-white dark:bg-gray-950 border-y border-gray-100 dark:border-gray-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          {badges.map((b, i) => (
            <Reveal key={b.label} variants={scaleIn} delay={0.08 * i}>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-[13px] font-medium">
                <b.icon className="w-4 h-4 text-orange-500" />
                {b.label}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── HowItWorks ────────────────────────────────────────────── */

function HowItWorks() {
  const steps = [
    { icon: UserPlus, title: 'Create Account', desc: 'Sign up in under 2 minutes – it’s free.' },
    { icon: PenTool, title: 'List or Learn', desc: 'Sell products, write blogs, or study guides.' },
    { icon: Users, title: 'Connect & Grow', desc: 'Engage with the community and grow your brand.' },
  ];
  return (
    <section className="py-16 md:py-24 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center max-w-2xl mx-auto mb-12">
          <Label>How It Works</Label>
          <h2 className="mt-4 text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white leading-tight">
            Get Started in{' '}
            <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
              3 Simple Steps
            </span>
          </h2>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <Reveal key={s.title} variants={blurUp} delay={0.1 * i}>
              <motion.div
                whileHover={{ y: -4 }}
                className="p-6 rounded-2xl bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 text-center"
              >
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-orange-400/20 mb-4">
                  {i + 1}
                </div>
                <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">{s.title}</h3>
                <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">{s.desc}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── TryProduct ────────────────────────────────────────────── */

function TryProduct() {
  return (
    <section className="py-16 md:py-24 bg-white dark:bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <Reveal>
          <Label>Try It Now</Label>
          <h2 className="mt-4 text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white leading-tight">
            Test Drive the{' '}
            <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
              AI Blog Writer
            </span>
          </h2>
          <p className="mt-4 text-[15px] text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            See how easy it is to create a professional poultry article in minutes – no experience needed.
          </p>
          <div className="mt-8">
            <Btn href={LINKS.aiWriter} size="lg">
              <PenTool className="w-[17px] h-[17px]" /> Try AI Writer Free
              <ArrowRight className="w-[17px] h-[17px]" />
            </Btn>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── StickyCTA ──────────────────────────────────────────────── */

function StickyCTA() {
  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 2, duration: 0.5 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-xl rounded-2xl bg-[#0d0f14] border border-gray-800 shadow-2xl shadow-black/50 p-3 flex items-center gap-3 backdrop-blur-xl"
    >
      <div className="sm:block w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center flex-shrink-0">
        <Bird className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-[13px] font-semibold truncate">Join Poultry Market Kenya</p>
        <p className="text-gray-400 text-[11px] truncate">Free platform for farmers &amp; buyers</p>
      </div>
      <a
        href={LINKS.register}
        className="flex-shrink-0 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[13px] font-bold hover:opacity-90 transition"
      >
        Join Now
      </a>
    </motion.div>
  );
}

/* ─── Site-wide link constants ──────────────────────────────── */

const LINKS = {
  website: 'https://www.poultrymarket.app',
  aiWriter: 'https://aiblogwriter.poultrymarket.app',
  poultryAI: 'https://poultrymarket.app/chatbot',
  whatsappCommunity: 'https://chat.whatsapp.com/HXLnMynGXW9HAd538Fi2tn',
  whatsappChannel: 'https://whatsapp.com/channel/0029VbDMjnXEVccPHlHan52g',
  instagram: 'https://www.instagram.com/poultymarketkenya?igsh=eXkwNW1maDA1ZGxp',
  facebook: 'https://www.facebook.com/share/1HHTXLYaCt/',
  threads: 'https://www.threads.com/@poultymarketkenya',
  tiktok: 'https://www.tiktok.com/@poultrymarket.app?_r=1&_t=ZS-97oGn2cijDx',
  register: '/auth/register',
  products: '/products',
  blog: '/blog',
  chatbot: '/chatbot',
  becomeBlogger: '/auth/register?role=blogger',
  bloggerEmail:
    'mailto:blog@poultrymarket.app?subject=Apply%20to%20Blog%20on%20Poultry%20Market%20Kenya',
};

const NAV_LINKS = [
  { label: 'About', href: '#about' },
  { label: 'Features', href: '#features' },
  { label: 'AI Tools', href: '#ai-blogging' },
  { label: 'Marketplace', href: '#marketplace' },
  { label: 'Community', href: '#community' },
];

const STATS = [
  { label: 'Active Farmers', value: 1200, suffix: '+' },
  { label: 'Products Listed', value: 48, suffix: '+' },
  { label: 'Articles Published', value: 100, suffix: '+' },
  { label: 'Community Members', value: 300, suffix: '+' },
];

const FEATURES: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
  tags: string[];
  accent: string;
  cta?: { label: string; href: string };
}> = [
  {
    icon: ShoppingCart,
    title: 'Poultry Marketplace',
    description:
      'Buy and sell eggs, day-old chicks, broilers, layers, feeds, and equipment. Connect directly with verified buyers and sellers across every county in Kenya.',
    tags: ['Eggs', 'Chicks', 'Broilers', 'Layers', 'Feed', 'Equipment'],
    accent: '#f97316',
  },
  {
    icon: PenTool,
    title: 'AI Blog Writer',
    description:
      'Create professional poultry articles in minutes. Publish high-quality content, build authority, grow Google traffic, and get discovered on ChatGPT.',
    tags: ['Google Ranking', 'AI Writing', 'Authority Building', 'Brand'],
    accent: '#10b981',
    cta: { label: 'Start Writing Free', href: LINKS.aiWriter },
  },
  {
    icon: Bot,
    title: 'Poultry Market AI',
    description:
      'Ask any poultry question and get instant, expert-level answers. Disease diagnosis, feed formulation, vaccination schedules — your AI farming assistant is always on.',
    tags: ['Disease Help', 'Feed Advice', 'Biosecurity', '24/7 Support'],
    accent: '#6366f1',
    cta: { label: 'Ask Poultry AI', href: LINKS.poultryAI },
  },
  {
    icon: BookOpen,
    title: 'Poultry Learning Hub',
    description:
      'Access expert farming guides, disease prevention resources, feed formulation guides, biosecurity protocols, vaccination schedules, and business growth tips.',
    tags: ['Guides', 'Disease Prevention', 'Biosecurity', 'Business'],
    accent: '#3b82f6',
  },
  {
    icon: Users,
    title: 'Vibrant Community',
    description:
      'Join thousands of poultry farmers sharing ideas, challenges, and success stories every day. Network with veterinarians, students, and industry professionals.',
    tags: ['Farmers', 'Veterinarians', 'Students', 'Experts'],
    accent: '#8b5cf6',
  },
];

const WHY_CHOOSE = [
  { icon: Shield, title: 'Trusted by Farmers', desc: 'Verified sellers and buyers for safe transactions across Kenya.' },
  { icon: Sparkles, title: 'AI-Powered Tools', desc: 'Blog writer and AI assistant built specifically for poultry.' },
  { icon: ShoppingCart, title: 'Active Marketplace', desc: 'Thousands of fresh listings from verified farmers daily.' },
  { icon: BookOpen, title: 'Expert Resources', desc: 'Guides on every aspect of modern poultry farming.' },
  { icon: Globe, title: 'Google & AI Visibility', desc: 'Rank articles and get found by buyers through AI search.' },
  { icon: Users, title: 'Professional Network', desc: 'Connect with vets, nutritionists, and industry leaders.' },
  { icon: Heart, title: 'Strong Community', desc: 'WhatsApp, Instagram, Facebook — stay connected daily.' },
  { icon: Zap, title: 'Modern Technology', desc: 'Latest tech stack built for speed, mobile, and scale.' },
  { icon: MapPin, title: 'Built for Kenya', desc: 'Locally relevant content, pricing, and county networks.' },
  { icon: Award, title: 'Expert-Verified', desc: 'All learning content reviewed by certified professionals.' },
  { icon: TrendingUp, title: 'Business Growth', desc: 'Analytics and tools to help your poultry business scale.' },
  { icon: Lightbulb, title: 'Constantly Improving', desc: 'New features released regularly based on farmer feedback.' },
];

const SOCIAL_CHANNELS = [
  {
    name: 'WhatsApp Community',
    description: 'Join 300+ farmers sharing tips, market prices, and answers every day.',
    icon: MessageCircle,
    href: LINKS.whatsappCommunity,
    btn: 'Join Community',
    bg: 'bg-green-500',
    members: '300+ members',
  },
  {
    name: 'WhatsApp Channel',
    description: 'Follow for daily poultry tips, market updates, and expert content drops.',
    icon: MessageCircle,
    href: LINKS.whatsappChannel,
    btn: 'Follow Channel',
    bg: 'bg-teal-500',
    members: 'Daily updates',
  },
  {
    name: 'Instagram',
    description: 'Farm photos, videos, reels, and farmer spotlights.',
    icon: Instagram,
    href: LINKS.instagram,
    btn: 'Follow on Instagram',
    bg: 'bg-rose-500',
    members: 'Visual content',
  },
  {
    name: 'Facebook Page',
    description: 'News, marketplace listings, blog articles, and community conversations.',
    icon: Facebook,
    href: LINKS.facebook,
    btn: 'Like on Facebook',
    bg: 'bg-blue-600',
    members: 'News & updates',
  },
  {
    name: 'Threads',
    description: 'Quick insights, farming quotes, and real-time industry commentary.',
    icon: MessageCircle,
    href: LINKS.threads,
    btn: 'Follow on Threads',
    bg: 'bg-gray-700',
    members: 'Quick insights',
  },
  {
    name: 'TikTok',
    description: 'Quick insights, farming quotes, and real-time industry commentary.',
    icon: MessageCircle,
    href: LINKS.tiktok,
    btn: 'Follow on TikTok',
    bg: 'bg-gray-700',
    members: 'Quick insights',
  },
];

/* ─── Navbar ──────────────────────────────────────────────────── */

function Navbar({ dark, toggleDark }: { dark: boolean; toggleDark: () => void }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const navBg = scrolled
    ? 'bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl shadow-sm border-b border-gray-200/60 dark:border-gray-800/60'
    : 'bg-transparent';
  const textColor = scrolled ? 'text-gray-700 dark:text-gray-300' : 'text-white/90';

  return (
    <motion.header
      initial={{ y: -72, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-400 ${navBg}`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-[68px] flex items-center justify-between">
        <a href={LINKS.website} className="flex items-center gap-2.5 group flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-md shadow-orange-400/30 group-hover:scale-110 transition-transform duration-300">
            <Bird className="w-[18px] h-[18px] text-white" />
          </div>
          <span
            className={`font-bold text-[15px] leading-snug transition-colors duration-300 ${
              scrolled ? 'text-gray-900 dark:text-white' : 'text-white'
            }`}
          >
            Poultry Market <span className="text-orange-400">Kenya</span>
          </span>
        </a>

        <ul className="hidden lg:flex items-center gap-7">
          {NAV_LINKS.map((l) => (
            <li key={l.label}>
              <a href={l.href} className={`text-[13px] font-medium transition-colors hover:text-orange-400 ${textColor}`}>
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <motion.button
            onClick={toggleDark}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label="Toggle dark mode"
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
              scrolled
                ? 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            {dark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          </motion.button>

          <div className="hidden md:flex items-center gap-2">
            <motion.a
              href={LINKS.aiWriter}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className={`px-4 py-2 text-[13px] font-semibold rounded-lg border transition-all duration-300 ${
                scrolled
                  ? 'border-orange-300 text-orange-500 hover:bg-orange-500 hover:text-white hover:border-orange-500 dark:border-orange-700 dark:text-orange-400'
                  : 'border-white/30 text-white hover:bg-white/15'
              }`}
            >
              AI Writer
            </motion.a>
            <motion.a
              href={LINKS.register}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="px-4 py-2 text-[13px] font-semibold rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-400/25 hover:shadow-orange-400/45 transition-all duration-300"
            >
              Join Platform
            </motion.a>
          </div>

          <button
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
            className={`lg:hidden w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
              scrolled ? 'text-gray-700 dark:text-gray-300' : 'text-white'
            }`}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      <div
        className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          open ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
          <div className="px-5 py-5 flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-2.5 px-3 rounded-lg text-[14px] font-medium text-gray-700 dark:text-gray-300 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-all"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-2.5">
              <a
                href={LINKS.aiWriter}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center py-3 rounded-xl border border-orange-400 text-orange-500 font-semibold text-[13px] hover:bg-orange-500 hover:text-white transition-all dark:border-orange-600 dark:text-orange-400"
              >
                Start AI Writing
              </a>
              <a
                href={LINKS.register}
                className="w-full text-center py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold text-[13px]"
              >
                Join Poultry Market
              </a>
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
}

/* ─── Hero ────────────────────────────────────────────────────── */

function Hero() {
  const chips = ['Eggs', 'Broilers', 'Layers', 'Chicks', 'Feeds', 'Equipment', 'AI Blogging', 'Marketplace'];

  return (
    <section id="hero" className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-[#0d0f14]" />
      <motion.div
        animate={{ scale: [1, 1.25, 1], opacity: [0.25, 0.45, 0.25] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/4 left-[15%] w-[420px] h-[420px] rounded-full bg-orange-500/15 blur-[80px] pointer-events-none"
      />
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        className="absolute bottom-1/4 right-[10%] w-[360px] h-[360px] rounded-full bg-amber-500/15 blur-[80px] pointer-events-none"
      />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-28 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/25 text-orange-400 text-xs font-semibold tracking-wide mb-6 sm:mb-8"
        >
          <Sparkles className="w-3 h-3" />
          Kenya&apos;s #1 Digital Poultry Platform
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-[34px] sm:text-5xl md:text-6xl lg:text-[68px] font-extrabold text-white leading-[1.09] tracking-tight mb-5"
        >
          Grow Your Poultry Business
          <br />
          <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-300 bg-clip-text text-transparent">
            with Kenya&apos;s Largest
          </span>
          <br />
          Poultry Platform
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.22 }}
          className="max-w-2xl mx-auto text-[14px] sm:text-[17px] text-gray-400 leading-relaxed mb-8 sm:mb-10"
        >
          Sell products, learn modern farming, create AI-powered blogs, chat with a poultry AI assistant,
          and grow your business online — all in one place.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.34 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10 sm:mb-14"
        >
          <Btn href={LINKS.website} size="lg">
            Join Poultry Market <ArrowRight className="w-[17px] h-[17px]" />
          </Btn>
          <Btn href={LINKS.aiWriter} size="lg" variant="ghost">
            Start AI Writing
          </Btn>
          <Btn href={LINKS.poultryAI} size="lg" variant="ghost">
            <Bot className="w-[17px] h-[17px]" /> Ask Poultry AI
          </Btn>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto"
        >
          {chips.map((chip, i) => (
            <motion.span
              key={chip}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.55 + i * 0.07 }}
              className="px-3.5 py-1.5 rounded-full text-white/75 text-xs font-medium backdrop-blur-sm border border-white/10"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              {chip}
            </motion.span>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.1 }}
          className="mt-10 sm:mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5 text-gray-500 text-[13px]"
        >
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {['JM', 'AO', 'GW', 'KO', 'FN'].map((init, i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-[10px] font-bold border-2 border-[#0d0f14]"
                >
                  {init}
                </div>
              ))}
            </div>
            <span>300+ members</span>
          </div>
          <span className="hidden sm:block w-1 h-1 rounded-full bg-gray-700" />
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
            ))}
            <span className="ml-1">Trusted by farmers across Kenya</span>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30"
      >
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ─── About ───────────────────────────────────────────────────── */

function About() {
  const pillars = [
    { icon: ShoppingCart, text: 'Sell & Buy Products' },
    { icon: BookOpen, text: 'Learn Poultry Farming' },
    { icon: PenTool, text: 'Build an Online Brand' },
    { icon: Search, text: 'Rank on Google & ChatGPT' },
    { icon: Users, text: 'Connect with Experts' },
    { icon: TrendingUp, text: 'Grow Your Business' },
  ];

  return (
    <section id="about" className="py-20 md:py-32 bg-white dark:bg-gray-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <Reveal variants={fadeLeft}>
            <Label>About Poultry Market Kenya</Label>
            <h2 className="mt-4 text-2xl sm:text-3xl md:text-[44px] font-extrabold text-gray-900 dark:text-white leading-tight tracking-tight">
              More Than a Marketplace —<br />
              <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                A Digital Ecosystem
              </span>
            </h2>
            <p className="mt-5 text-[14px] sm:text-[15px] text-gray-500 dark:text-gray-400 leading-[1.75]">
              Poultry Market Kenya is the premier digital home for everyone in the poultry industry —
              smallholder farmers, commercial producers, feed suppliers, veterinarians, students, and buyers.
              We go beyond transactions to give every farmer the tools to build a recognizable brand,
              create authoritative content, and grow sustainably.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-2.5">
              {pillars.map((p, i) => (
                <Reveal key={p.text} variants={blurUp} delay={0.06 * i}>
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/30">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center flex-shrink-0">
                      <p.icon className="w-[14px] h-[14px] text-white" />
                    </div>
                    <span className="text-[12.5px] font-semibold text-gray-800 dark:text-gray-200">
                      {p.text}
                    </span>
                  </div>
                </Reveal>
              ))}
            </div>

            <div className="mt-8">
              <Btn href={LINKS.website} variant="outline">
                Explore Platform <ArrowRight className="w-[15px] h-[15px]" />
              </Btn>
            </div>
          </Reveal>

          <Reveal variants={fadeRight} className="relative">
            <div className="rounded-3xl bg-[#0d0f14] p-6 sm:p-8 border border-gray-800 shadow-2xl">
              <div className="grid grid-cols-2 gap-4">
                {STATS.map((s, i) => (
                  <Reveal key={s.label} variants={scaleIn} delay={0.1 * i}>
                    <StatPill label={s.label} value={s.value} suffix={s.suffix} />
                  </Reveal>
                ))}
              </div>
              <div className="mt-6 p-4 rounded-2xl bg-white/5 border border-white/8">
                <p className="text-white/60 text-xs font-medium uppercase tracking-widest mb-3">
                  Platform reach
                </p>
                <div className="space-y-2.5">
                  {[
                    { label: 'All 47 Counties', pct: 100 },
                    { label: 'Mobile Users', pct: 78 },
                    { label: 'Daily Active', pct: 62 },
                  ].map((row) => (
                    <div key={row.label}>
                      <div className="flex justify-between text-white/60 text-xs mb-1">
                        <span>{row.label}</span>
                        <span>{row.pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${row.pct}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-4 -right-4 px-3.5 py-2 rounded-xl bg-white dark:bg-gray-900 shadow-xl border border-orange-100 dark:border-orange-900/40 flex items-center gap-1.5"
            >
              <Sparkles className="w-[14px] h-[14px] text-orange-500" />
              <span className="text-[12px] font-bold text-gray-900 dark:text-white">AI-Powered</span>
            </motion.div>
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              className="absolute -bottom-4 -left-4 px-3.5 py-2 rounded-xl bg-white dark:bg-gray-900 shadow-xl border border-green-100 dark:border-green-900/40 flex items-center gap-1.5"
            >
              <CheckCircle className="w-[14px] h-[14px] text-green-500" />
              <span className="text-[12px] font-bold text-gray-900 dark:text-white">Verified Sellers</span>
            </motion.div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ─── Features ────────────────────────────────────────────────── */

function Features() {
  return (
    <section id="features" className="py-20 md:py-32 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <Label>Platform Features</Label>
          <h2 className="mt-4 text-2xl sm:text-3xl md:text-[44px] font-extrabold text-gray-900 dark:text-white leading-tight tracking-tight">
            Everything You Need to{' '}
            <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
              Succeed in Poultry
            </span>
          </h2>
          <p className="mt-4 text-[14px] sm:text-[15px] text-gray-500 dark:text-gray-400 leading-relaxed">
            One platform for buying, selling, learning, and building your poultry brand in Kenya.
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} variants={blurUp} delay={0.08 * i}>
              <motion.div
                whileHover={{ y: -6 }}
                transition={{ type: 'spring', stiffness: 280, damping: 20 }}
                className="h-full p-6 sm:p-7 rounded-2xl bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 hover:border-orange-200 dark:hover:border-orange-800/60 hover:shadow-lg hover:shadow-orange-50 dark:hover:shadow-none transition-colors duration-300 flex flex-col"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 flex-shrink-0"
                  style={{ background: `${f.accent}18` }}
                >
                  <f.icon className="w-5 h-5" style={{ color: f.accent }} />
                </div>
                <h3 className="text-[15px] font-bold text-gray-900 dark:text-white mb-2.5">
                  {f.title}
                </h3>
                <p className="text-[13.5px] text-gray-500 dark:text-gray-400 leading-relaxed mb-4 flex-1">
                  {f.description}
                </p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {f.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                {f.cta && (
                  <Btn href={f.cta.href} size="sm">
                    {f.cta.label} <ArrowRight className="w-[13px] h-[13px]" />
                  </Btn>
                )}
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── AI Blogging ────────────────────────────────────────────── */

function AIBlogging() {
  const benefits = [
    'Write full poultry articles in under 5 minutes',
    'Publish professionally formatted content instantly',
    'Rank on Google for poultry-related search terms',
    "Build genuine authority in Kenya's poultry industry",
    'Get discovered on ChatGPT and AI-powered search',
    'Grow social media following organically',
    'Build a lasting digital portfolio and personal brand',
  ];

  return (
    <section id="ai-blogging" className="py-20 md:py-32 relative overflow-hidden bg-[#0d0f14]">
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.22, 0.1] }}
        transition={{ duration: 11, repeat: Infinity }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none"
      />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <Reveal variants={fadeLeft}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.12em] bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
              <PenTool className="w-[11px] h-[11px]" /> AI Blog Writer
            </span>
            <h2 className="mt-4 text-2xl sm:text-3xl md:text-[44px] font-extrabold text-white leading-tight tracking-tight">
              Imagine Googling Yourself<br />and Finding Your Own<br />
              <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                Poultry Articles
              </span>
            </h2>
            <p className="mt-5 text-[14px] sm:text-[15px] text-gray-400 leading-relaxed">
              With the Poultry Market AI Blog Writer, any farmer — regardless of writing experience —
              can create, publish, and rank professional poultry content that builds lasting authority and drives customers.
            </p>
            <ul className="mt-7 space-y-3">
              {benefits.map((b, i) => (
                <Reveal key={b} variants={fadeUp} delay={0.07 * i}>
                  <li className="flex items-start gap-3 text-[13.5px] text-gray-300">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    {b}
                  </li>
                </Reveal>
              ))}
            </ul>
            <div className="mt-9">
              <Btn href={LINKS.aiWriter} size="lg">
                <PenTool className="w-[17px] h-[17px]" /> Start Writing Free{' '}
                <ArrowRight className="w-[17px] h-[17px]" />
              </Btn>
            </div>
          </Reveal>

          <Reveal variants={fadeRight} delay={0.15}>
            <div className="rounded-2xl overflow-hidden border border-emerald-900/40 bg-gray-900 shadow-2xl shadow-emerald-900/20">
              <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-800/80 border-b border-gray-700/60">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
                <div className="ml-3 flex-1 max-w-[240px] h-5 rounded bg-gray-700 flex items-center px-2.5">
                  <span className="text-[10px] text-gray-400 truncate">
                    aiblogwriter.poultrymarket.app
                  </span>
                </div>
                <span className="ml-auto text-[10px] text-emerald-400 font-semibold bg-emerald-950/50 border border-emerald-800/50 px-2 py-0.5 rounded-full">
                  AI Active
                </span>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-[10.5px] text-gray-500 uppercase tracking-widest mb-1.5">
                    Topic / Keyword
                  </p>
                  <div className="p-3.5 rounded-xl bg-gray-800 border border-gray-700">
                    <p className="text-emerald-300 text-[13px] font-medium">
                      How to Prevent Newcastle Disease in Broilers
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-[10.5px] text-gray-500 uppercase tracking-widest mb-1.5">
                    Generated Article
                  </p>
                  <div className="p-4 rounded-xl bg-gray-800 border border-gray-700 space-y-2">
                    {[100, 88, 72, 95, 65, 80].map((w, i) => (
                      <motion.div
                        key={i}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${w}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.1 * i, ease: 'easeOut' }}
                        className="h-2 rounded-full bg-gray-600"
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/40 border border-emerald-900/40">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-[14px] h-[14px] text-emerald-500" />
                    <span className="text-[12px] text-emerald-300 font-medium">
                      SEO Score: 96/100
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-[14px] h-[14px] text-amber-400" />
                    <span className="text-[12px] text-amber-300 font-medium">
                      Ready to Publish
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <motion.div
              animate={{ y: [0, -9, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-4 -right-4 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-gray-900 shadow-xl border border-gray-200 dark:border-gray-700"
            >
              <TrendingUp className="w-[14px] h-[14px] text-emerald-500" />
              <span className="text-[12px] font-bold text-gray-900 dark:text-white">
                Google Ranked!
              </span>
            </motion.div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ─── Bloggers Wanted ───────────────────────────────────────── */

function BloggersWanted() {
  const perks = [
    {
      icon: DollarSign,
      title: 'Get Paid to Write',
      desc: 'Earn competitive income from every published article. Monetize your poultry knowledge and experience.',
    },
    {
      icon: Megaphone,
      title: 'Build Your Authority',
      desc: 'Get published on Kenya\u2019s #1 poultry platform. Build a recognized personal brand and grow your following.',
    },
    {
      icon: TrendingUp,
      title: 'Grow on Google',
      desc: 'Your articles rank on Google and get discovered on AI search. Drive real traffic to your profile and content.',
    },
    {
      icon: Users,
      title: 'Reach 1,200+ Farmers',
      desc: 'Every article is read by thousands of farmers, vets, and industry professionals across all 47 counties.',
    },
  ];

  const requirements = [
    'Passion for poultry farming \u2014 layers, broilers, kienyeji, or commercial production',
    'Solid writing skills or willingness to learn with our AI Blog Writer',
    'Ability to produce 2\u20134 articles per month on assigned topics',
    'Reliable, consistent, and responsive to editorial feedback',
  ];

  return (
    <section
      id="we-are-hiring-bloggers"
      className="py-20 md:py-32 relative overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 border-t border-white/5" // subtle divider
    >
      {/* Ambient glow */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.12, 0.22, 0.12] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/4 left-[10%] w-[420px] h-[420px] rounded-full bg-orange-500/10 blur-[90px] pointer-events-none"
      />
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.18, 0.1] }}
        transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute bottom-1/4 right-[8%] w-[360px] h-[360px] rounded-full bg-amber-500/10 blur-[90px] pointer-events-none"
      />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Hiring banner ── */}
        <Reveal className="text-center mb-14">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.14em] bg-orange-500/15 border border-orange-500/30 text-orange-400 mb-6">
            <Megaphone className="w-3.5 h-3.5" /> We&apos;re Hiring — Join Our Team
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-[1.1] tracking-tight">
            We&apos;re Looking for{' '}
            <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-300 bg-clip-text text-transparent">
              Poultry Bloggers
            </span>
          </h2>
          <p className="mt-5 text-[14px] sm:text-[16px] text-gray-400 leading-relaxed max-w-2xl mx-auto">
            Are you passionate about poultry farming? Do you love sharing knowledge, tips, and
            stories that help other farmers succeed? Poultry Market Kenya is hiring bloggers to
            write authoritative articles for Kenya&apos;s largest digital poultry platform — and we
            pay for great content.
          </p>
        </Reveal>

        {/* ── Perks grid ── */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-14">
          {perks.map((p, i) => (
            <Reveal key={p.title} variants={fadeUp} delay={0.08 * i}>
              <motion.div
                whileHover={{ y: -5 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="h-full p-6 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-orange-500/40 hover:bg-white/[0.06] transition-all duration-300 flex flex-col"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mb-4 flex-shrink-0 shadow-md shadow-orange-500/20">
                  <p.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-[14.5px] font-bold text-white mb-2">{p.title}</h3>
                <p className="text-[12.5px] text-gray-400 leading-relaxed">{p.desc}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>

        {/* ── Requirements + CTA card ── */}
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-10 items-stretch">
          {/* Left: what we're looking for */}
          <Reveal variants={fadeLeft}>
            <div className="h-full p-6 sm:p-8 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                  <FileText className="w-[17px] h-[17px] text-emerald-400" />
                </div>
                <h3 className="text-[16px] font-bold text-white">
                  What We&apos;re Looking For
                </h3>
              </div>
              <ul className="space-y-3.5">
                {requirements.map((r, i) => (
                  <li key={i} className="flex items-start gap-3 text-[13.5px] text-gray-300 leading-relaxed">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    {r}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex items-center gap-2 text-[12px] text-gray-500">
                <Calendar className="w-3.5 h-3.5" />
                <span>Remote · Part-time · Flexible hours · Kenya-wide</span>
              </div>
            </div>
          </Reveal>

          {/* Right: apply CTA */}
          <Reveal variants={fadeRight} delay={0.1}>
            <div className="h-full relative p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-orange-600 via-amber-500 to-yellow-500 overflow-hidden">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
              <div className="relative z-10 flex flex-col h-full">
                <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 backdrop-blur-sm flex items-center justify-center mb-5">
                  <UserPlus className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight mb-3">
                  Ready to Write With Us?
                </h3>
                <p className="text-[13.5px] text-white/90 leading-relaxed mb-6">
                  Apply today and become a published poultry author. Whether you&apos;re a farmer, vet,
                  student, or content creator — if you love poultry, we want your voice on the platform.
                </p>
                <div className="mt-auto flex flex-col sm:flex-row gap-3">
                  <motion.a
                    href={LINKS.becomeBlogger}
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-orange-600 font-bold text-[14px] shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <UserPlus className="w-[17px] h-[17px]" /> Apply to Blog
                  </motion.a>
                  <motion.a
                    href={LINKS.bloggerEmail}
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/15 border border-white/30 backdrop-blur-sm text-white font-bold text-[14px] hover:bg-white/25 transition-all duration-300"
                  >
                    <Mail className="w-[17px] h-[17px]" /> Email Us
                  </motion.a>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ─── Poultry AI ────────────────────────────────────────────── */

function PoultryAI() {
  const aiFeatures = [
    {
      q: 'What vaccines should I give my broilers at week 2?',
      a: 'At week 2, administer Lasota (Newcastle) via eye drop and IBD Intermediate vaccine in drinking water...',
    },
    {
      q: 'My layers have a drop in egg production. Why?',
      a: 'A sudden drop is often caused by heat stress, poor nutrition, disease pressure, or lighting issues...',
    },
    {
      q: 'How do I formulate a grower mash for kienyeji?',
      a: 'For kienyeji growers: Maize 55%, Sunflower 20%, Fishmeal 10%, Lime 2%, Premix 1%...',
    },
  ];

  return (
    <section id="poultry-ai" className="py-20 md:py-32 bg-white dark:bg-gray-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <Reveal variants={fadeLeft} className="order-2 lg:order-1 relative">
            <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 shadow-xl">
              <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-indigo-600 to-violet-600">
                <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
                  <Brain className="w-[17px] h-[17px] text-white" />
                </div>
                <div>
                  <p className="text-white text-[13px] font-bold">Poultry Market AI</p>
                  <p className="text-indigo-200 text-[11px]">Your 24/7 poultry expert</p>
                </div>
                <span className="ml-auto flex items-center gap-1 text-[10px] text-green-300 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Online
                </span>
              </div>
              <div className="p-4 space-y-4 max-h-[340px] overflow-hidden">
                {aiFeatures.map((item, i) => (
                  <Reveal key={i} variants={fadeUp} delay={0.15 * i}>
                    <div className="space-y-2">
                      <div className="flex justify-end">
                        <div className="max-w-[80%] px-3.5 py-2.5 rounded-2xl rounded-tr-sm bg-indigo-600 text-white text-[12.5px] leading-relaxed">
                          {item.q}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Bot className="w-3 h-3 text-white" />
                        </div>
                        <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-[12.5px] leading-relaxed">
                          {item.a}
                        </div>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
              <div className="px-4 pb-4">
                <div className="flex gap-2 p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <input
                    readOnly
                    value="Ask any poultry question..."
                    className="flex-1 text-[12.5px] text-gray-400 bg-transparent outline-none cursor-default"
                  />
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
                    <ArrowRight className="w-[13px] h-[13px] text-white" />
                  </div>
                </div>
              </div>
            </div>
            <motion.div
              animate={{ y: [0, -9, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -bottom-4 -right-4 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-gray-900 shadow-xl border border-indigo-100 dark:border-indigo-900/40"
            >
              <Sparkles className="w-[14px] h-[14px] text-indigo-500" />
              <span className="text-[12px] font-bold text-gray-900 dark:text-white">
                Instant answers
              </span>
            </motion.div>
          </Reveal>

          <Reveal variants={fadeRight} className="order-1 lg:order-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.12em] border bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/50 dark:border-indigo-800/60 dark:text-indigo-400">
              <Brain className="w-[11px] h-[11px]" /> Poultry Market AI
            </span>
            <h2 className="mt-4 text-2xl sm:text-3xl md:text-[44px] font-extrabold text-gray-900 dark:text-white leading-tight tracking-tight">
              Your AI Poultry Expert,<br />
              <span className="bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">
                Available 24/7
              </span>
            </h2>
            <p className="mt-5 text-[14px] sm:text-[15px] text-gray-500 dark:text-gray-400 leading-relaxed">
              Poultry Market AI is a specialized artificial intelligence assistant trained exclusively on poultry
              farming knowledge. Ask anything — from disease diagnosis to feed formulation — and get expert-level
              answers in seconds.
            </p>

            <div className="mt-7 space-y-3">
              {[
                { icon: Zap, text: 'Instant disease diagnosis and treatment guidance' },
                { icon: BookOpen, text: 'Custom feed formulas for your specific flock' },
                { icon: Shield, text: 'Biosecurity protocols and vaccination calendars' },
                { icon: TrendingUp, text: 'Business and profitability advice for your farm' },
              ].map((item, i) => (
                <Reveal key={item.text} variants={fadeUp} delay={0.08 * i}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-[14px] h-[14px] text-indigo-500" />
                    </div>
                    <p className="text-[13.5px] text-gray-600 dark:text-gray-400 leading-relaxed pt-1">
                      {item.text}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>

            <div className="mt-9 flex flex-wrap gap-3">
              <Btn
                href={LINKS.poultryAI}
                size="lg"
                className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-400/20 hover:shadow-indigo-400/35 hover:from-indigo-700 hover:to-violet-700 border-0"
              >
                <Bot className="w-[17px] h-[17px]" /> Ask Poultry AI Free{' '}
                <ArrowRight className="w-[17px] h-[17px]" />
              </Btn>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ─── Marketplace ────────────────────────────────────────────── */

function Marketplace() {
  const categories = [
    { label: 'Eggs', desc: 'Fresh table eggs, fertilized eggs, hatching eggs.' },
    { label: 'Day-Old Chicks', desc: 'Broiler, layer, and kienyeji day-old chicks.' },
    { label: 'Broilers', desc: 'Live and dressed broilers from verified farmers.' },
    { label: 'Layer Hens', desc: 'Productive layers at peak and point-of-lay.' },
    { label: 'Poultry Feeds', desc: 'Starter, grower, layer, and broiler feeds.' },
    { label: 'Equipment', desc: 'Drinkers, feeders, incubators, and cages.' },
  ];

  return (
    <section id="marketplace" className="py-20 md:py-32 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <Reveal variants={fadeLeft} className="order-2 lg:order-1">
            <div className="grid grid-cols-2 gap-3">
              {categories.map((cat, i) => (
                <Reveal key={cat.label} variants={scaleIn} delay={0.07 * i}>
                  <motion.div
                    whileHover={{ y: -4, scale: 1.02 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                    className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 hover:border-orange-200 dark:hover:border-orange-800/50 hover:shadow-md transition-colors duration-300 cursor-default"
                  >
                    <p className="text-[13.5px] font-bold text-gray-900 dark:text-white mb-1">
                      {cat.label}
                    </p>
                    <p className="text-[11.5px] sm:text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed">
                      {cat.desc}
                    </p>
                  </motion.div>
                </Reveal>
              ))}
            </div>
          </Reveal>

          <Reveal variants={fadeRight} className="order-1 lg:order-2">
            <Label>Poultry Marketplace</Label>
            <h2 className="mt-4 text-2xl sm:text-3xl md:text-[44px] font-extrabold text-gray-900 dark:text-white leading-tight tracking-tight">
              Kenya&apos;s Most Active<br />
              <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                Poultry Marketplace
              </span>
            </h2>
            <p className="mt-5 text-[14px] sm:text-[15px] text-gray-500 dark:text-gray-400 leading-relaxed">
              List your products and reach thousands of verified buyers across Kenya —
              without brokers eating into your profits. Compare prices and connect directly with sellers in your county.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3">
              {STATS.map((s, i) => (
                <Reveal key={s.label} variants={fadeUp} delay={0.08 * i}>
                  <StatPill label={s.label} value={s.value} suffix={s.suffix} />
                </Reveal>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Btn href={LINKS.products} size="md" external={false}>
                Browse Marketplace <ArrowRight className="w-[15px] h-[15px]" />
              </Btn>
              <Btn href={LINKS.products} size="md" variant="outline" external={false}>
                List a Product
              </Btn>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ─── Why Choose ─────────────────────────────────────────────── */

function WhyChoose() {
  return (
    <section className="py-20 md:py-32 bg-white dark:bg-gray-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center max-w-2xl mx-auto mb-12 sm:mb-14">
          <Label>Why Us</Label>
          <h2 className="mt-4 text-2xl sm:text-3xl md:text-[44px] font-extrabold text-gray-900 dark:text-white leading-tight tracking-tight">
            Why Choose{' '}
            <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
              Poultry Market Kenya
            </span>
          </h2>
          <p className="mt-4 text-[14px] sm:text-[15px] text-gray-500 dark:text-gray-400">
            Built for Kenya&apos;s poultry industry with the tools, community, and technology every farmer deserves.
          </p>
        </Reveal>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {WHY_CHOOSE.map((item, i) => (
            <Reveal key={item.title} variants={blurUp} delay={0.05 * i}>
              <motion.div
                whileHover={{ y: -4 }}
                className="p-4 sm:p-5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-orange-200 dark:hover:border-orange-800/50 hover:shadow-sm transition-all duration-300 group"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mb-3.5 group-hover:scale-110 transition-transform duration-300">
                  <item.icon className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-[13px] font-bold text-gray-900 dark:text-white mb-1.5">
                  {item.title}
                </h3>
                <p className="text-[11.5px] sm:text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  {item.desc}
                </p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Community ──────────────────────────────────────────────── */

function Community() {
  return (
    <section id="community" className="py-20 md:py-32 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center max-w-2xl mx-auto mb-12 sm:mb-14">
          <Label>Community</Label>
          <h2 className="mt-4 text-2xl sm:text-3xl md:text-[44px] font-extrabold text-gray-900 dark:text-white leading-tight tracking-tight">
            Join the Conversation{' '}
            <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
              Everywhere
            </span>
          </h2>
          <p className="mt-4 text-[14px] sm:text-[15px] text-gray-500 dark:text-gray-400">
            Connect with thousands of poultry farmers, vets, and experts across all your favourite platforms.
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SOCIAL_CHANNELS.map((ch, i) => (
            <Reveal key={ch.name} variants={blurUp} delay={0.08 * i}>
              <motion.div
                whileHover={{ y: -6 }}
                transition={{ type: 'spring', stiffness: 280, damping: 20 }}
                className="group p-6 rounded-2xl bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 hover:border-orange-200 dark:hover:border-orange-800/50 hover:shadow-lg transition-all duration-300 flex flex-col"
              >
                <div
                  className={`w-11 h-11 rounded-xl ${ch.bg} flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-transform duration-300`}
                >
                  <ch.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-[14px] font-bold text-gray-900 dark:text-white mb-2">
                  {ch.name}
                </h3>
                <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed mb-3 flex-1">
                  {ch.description}
                </p>
                <span className="text-[11px] font-semibold text-orange-500 bg-orange-50 dark:bg-orange-950/40 border border-orange-100 dark:border-orange-900/30 px-2.5 py-0.5 rounded-full mb-4 self-start">
                  {ch.members}
                </span>
                <motion.a
                  href={ch.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[12.5px] font-semibold ${ch.bg} hover:opacity-90 transition-opacity`}
                >
                  {ch.btn} <ArrowRight className="w-[13px] h-[13px]" />
                </motion.a>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA Banner ─────────────────────────────────────────────── */

function CTA() {
  return (
    <section className="py-20 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-orange-600 via-amber-500 to-yellow-500" />
      <motion.div
        animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 9, repeat: Infinity }}
        className="absolute top-0 left-1/3 w-80 h-80 rounded-full bg-white/15 blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }}
        transition={{ duration: 11, repeat: Infinity, delay: 2 }}
        className="absolute bottom-0 right-1/4 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none"
      />

      <Reveal className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-widest bg-white/20 text-white border border-white/30 mb-6">
          <Zap className="w-[11px] h-[11px]" /> Get Started Today &mdash; It&apos;s Free
        </span>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight tracking-tight mb-5">
          Ready to Grow Your<br />Poultry Business?
        </h2>
        <p className="text-[14px] sm:text-[17px] text-white/80 leading-relaxed max-w-xl mx-auto mb-10">
          Join thousands of poultry farmers already selling products, blogging with AI, and
          building thriving businesses on Poultry Market Kenya.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 flex-wrap">
          <motion.a
            href={LINKS.website}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05, y: -3 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white text-orange-600 font-bold text-[14px] shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Bird className="w-[17px] h-[17px]" /> Join Poultry Market
          </motion.a>
          <motion.a
            href={LINKS.aiWriter}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05, y: -3 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white/15 border border-white/30 backdrop-blur-sm text-white font-bold text-[14px] hover:bg-white/25 transition-all duration-300"
          >
            <PenTool className="w-[17px] h-[17px]" /> Start AI Blogging
          </motion.a>
          <motion.a
            href={LINKS.whatsappCommunity}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05, y: -3 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-[14px] shadow-md transition-all duration-300"
          >
            <MessageCircle className="w-[17px] h-[17px]" /> Join WhatsApp
          </motion.a>
        </div>
      </Reveal>
    </section>
  );
}

/* ─── Footer ──────────────────────────────────────────────────── */

function Footer() {
  const year = new Date().getFullYear();

  const cols = {
    Platform: [
      { label: 'About', href: '#about' },
      { label: 'Marketplace', href: '#marketplace' },
      { label: 'AI Blog Writer', href: LINKS.aiWriter },
      { label: 'Poultry AI', href: LINKS.poultryAI },
      { label: 'Community', href: '#community' },
    ],
    Resources: [
      { label: 'Poultry Guides', href: LINKS.blog },
      { label: 'Disease Prevention', href: LINKS.blog },
      { label: 'Feed Formulation', href: LINKS.blog },
      { label: 'Vaccination Schedules', href: LINKS.blog },
      { label: 'Business Tips', href: LINKS.blog },
    ],
    Legal: [{ label: 'Terms of Service', href: '/terms' }],
  };

  return (
    <footer className="bg-[#0d0f14] border-t border-gray-800/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 sm:gap-10 mb-12">
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <a href={LINKS.website} className="inline-flex items-center gap-2.5 mb-4 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-md shadow-orange-400/30 group-hover:scale-110 transition-transform">
                <Bird className="w-[17px] h-[17px] text-white" />
              </div>
              <span className="font-bold text-[15px] text-white">
                Poultry Market <span className="text-orange-400">Kenya</span>
              </span>
            </a>
            <p className="text-[13px] text-gray-500 leading-relaxed max-w-[260px] mb-5">
              The Digital Home of Poultry Farming in Kenya. Connecting farmers, buyers, suppliers, and
              professionals nationwide.
            </p>
            <div className="flex items-center gap-2">
              {[
                { Icon: MessageCircle, href: LINKS.whatsappCommunity, label: 'WhatsApp' },
                { Icon: Instagram, href: LINKS.instagram, label: 'Instagram' },
                { Icon: Facebook, href: LINKS.facebook, label: 'Facebook' },
                { Icon: Globe, href: LINKS.website, label: 'Website' },
              ].map(({ Icon, href, label }) => (
                <motion.a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  whileHover={{ scale: 1.15, y: -2 }}
                  className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-orange-500 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300"
                >
                  <Icon className="w-[15px] h-[15px]" />
                </motion.a>
              ))}
            </div>
          </div>

          {Object.entries(cols).map(([group, links]) => (
            <div key={group}>
              <h4 className="text-white text-[12px] font-semibold uppercase tracking-widest mb-4">
                {group}
              </h4>
              <ul className="space-y-2.5">
                {links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      target={l.href.startsWith('http') ? '_blank' : undefined}
                      rel={l.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="text-[13px] text-gray-500 hover:text-orange-400 transition-colors"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-800/60 pt-8 mb-8">
          <div className="max-w-md">
            <h4 className="text-white text-[13px] font-semibold mb-1.5">Subscribe to Poultry Tips</h4>
            <p className="text-[12.5px] text-gray-500 mb-3.5">
              Weekly poultry tips, market prices, and platform updates.
            </p>
            <form onSubmit={(e) => e.preventDefault()} className="flex gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 min-w-0 px-4 py-2.5 text-[13px] rounded-xl bg-gray-900 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition-colors"
              />
              <motion.button
                type="submit"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[13px] font-semibold hover:from-orange-600 hover:to-amber-600 transition-all flex-shrink-0"
              >
                Subscribe
              </motion.button>
            </form>
          </div>
        </div>

        <div className="border-t border-gray-800/60 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12.5px] text-gray-600">
          <p>&copy; {year} Poultry Market Kenya. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            Made with <Heart className="w-3 h-3 fill-red-500 text-red-500" /> for Kenya&apos;s Poultry Farmers
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ─── Root Page ──────────────────────────────────────────────── */

export default function Page() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('pmk-dark');
    if (stored === 'true') setDark(true);
  }, []);

  const toggleDark = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      localStorage.setItem('pmk-dark', String(next));
      return next;
    });
  }, []);

  return (
    <div className={dark ? 'dark' : ''} style={{ colorScheme: dark ? 'dark' : 'light' }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        .dark body, .dark { background-color: #030712; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
        <Navbar dark={dark} toggleDark={toggleDark} />
        <Hero />
        <TrustBadges />
        <HowItWorks />
        <About />
        <Features />
        <TryProduct />
        <AIBlogging />
        <BloggersWanted />
        <PoultryAI />
        <Marketplace />
        <WhyChoose />
        <Community />
        <CTA />
        <Footer />
        <StickyCTA />
      </div>
    </div>
  );
}