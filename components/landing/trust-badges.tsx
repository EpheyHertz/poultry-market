'use client';

import { motion } from 'framer-motion';
import { Shield, Verified, Lock, BadgeCheck, Truck, HeadphonesIcon, RefreshCw, WalletCards } from 'lucide-react';
import { Reveal, blurUp } from './shared';

const TRUST_ITEMS = [
  {
    icon: BadgeCheck,
    title: 'Verified Sellers',
    desc: 'Every seller is verified before listing products on our platform.',
  },
  {
    icon: Lock,
    title: 'Secure Payments',
    desc: 'End-to-end encrypted payments via Intasend and M-Pesa for safe transactions.',
  },
  {
    icon: Shield,
    title: 'Protected Transactions',
    desc: 'Buyer protection with order tracking and payment release upon delivery confirmation.',
  },
  {
    icon: Truck,
    title: 'Delivery Tracking',
    desc: 'Real-time delivery tracking with photo proof at every stage.',
  },
  {
    icon: HeadphonesIcon,
    title: '24/7 Support',
    desc: 'Live chat, WhatsApp community, and phone support whenever you need help.',
  },
  {
    icon: RefreshCw,
    title: 'No Broker Fees',
    desc: 'Farmers sell directly to buyers with no middlemen eating into profits.',
  },
  {
    icon: WalletCards,
    title: 'Mobile Wallet',
    desc: 'Built-in digital wallet with instant deposits, withdrawals, and transaction history.',
  },
  {
    icon: Verified,
    title: 'Trusted Platform',
    desc: '1000+ active farmers across 47 counties in Kenya trust us daily.',
  },
];

export function TrustBadges() {
  return (
    <section className="py-20 md:py-28 bg-white dark:bg-gray-950 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(circle at 25px 25px, currentColor 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
        }}
      />
      
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.12em] border
            bg-green-50 border-green-200 text-green-600
            dark:bg-green-950/50 dark:border-green-800/60 dark:text-green-400">
            <Shield className="w-3 h-3" /> Trust & Security
          </span>
          <h2 className="mt-4 text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white leading-tight">
            Built for{' '}
            <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
              Trust & Reliability
            </span>
          </h2>
          <p className="mt-3 text-[14px] text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            Every feature is designed to protect farmers and buyers. We earn your trust through transparency and security.
          </p>
        </Reveal>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {TRUST_ITEMS.map((item, i) => (
            <Reveal key={item.title} variants={blurUp} delay={0.05 * i}>
              <motion.div
                whileHover={{ y: -3 }}
                className="group p-4 sm:p-5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-green-200 dark:hover:border-green-800/50 hover:shadow-md hover:shadow-green-50 dark:hover:shadow-none transition-all duration-300 h-full"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 shadow-sm shadow-green-400/20">
                  <item.icon className="w-4.5 h-4.5 text-white" style={{ width: 16, height: 16 }} />
                </div>
                <h3 className="text-[12.5px] sm:text-[13px] font-bold text-gray-900 dark:text-white mb-1">{item.title}</h3>
                <p className="text-[11px] sm:text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed">{item.desc}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>

        {/* Trust bar */}
        <Reveal delay={0.5} className="mt-10">
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-100 dark:border-amber-900/30">
            <div className="flex items-center gap-2 text-[12px] sm:text-[13px] text-gray-600 dark:text-gray-400">
              <Verified className="w-4 h-4 text-green-500" />
              <span><strong className="text-gray-900 dark:text-white">1200+</strong> Active Farmers</span>
            </div>
            <div className="hidden sm:block w-px h-5 bg-amber-200 dark:bg-amber-800" />
            <div className="flex items-center gap-2 text-[12px] sm:text-[13px] text-gray-600 dark:text-gray-400">
              <Verified className="w-4 h-4 text-green-500" />
              <span><strong className="text-gray-900 dark:text-white">47</strong> Counties Covered</span>
            </div>
            <div className="hidden sm:block w-px h-5 bg-amber-200 dark:bg-amber-800" />
            <div className="flex items-center gap-2 text-[12px] sm:text-[13px] text-gray-600 dark:text-gray-400">
              <Verified className="w-4 h-4 text-green-500" />
              <span><strong className="text-gray-900 dark:text-white">100%</strong> M-Pesa Secured Payments</span>
            </div>
            <div className="hidden sm:block w-px h-5 bg-amber-200 dark:bg-amber-800" />
            <div className="flex items-center gap-2 text-[12px] sm:text-[13px] text-gray-600 dark:text-gray-400">
              <Verified className="w-4 h-4 text-green-500" />
              <span><strong className="text-gray-900 dark:text-white">24/7</strong> Support Available</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
