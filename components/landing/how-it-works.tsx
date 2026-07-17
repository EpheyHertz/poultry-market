'use client';

import { motion } from 'framer-motion';
import { UserPlus, ShoppingCart, MessageCircle, Wallet, Eye, TrendingUp } from 'lucide-react';
import { Reveal, blurUp } from './shared';

const STEPS = [
  {
    step: 1,
    icon: UserPlus,
    title: 'Create Free Account',
    desc: 'Sign up in under 30 seconds. No fees, no commitment. Start as a buyer, seller, or blogger.',
    link: '/auth/register',
  },
  {
    step: 2,
    icon: Eye,
    title: 'Browse or List Products',
    desc: 'Explore 48+ products from verified farmers across Kenya, or list your own poultry products.',
    link: '/products',
  },
  {
    step: 3,
    icon: MessageCircle,
    title: 'Connect & Chat',
    desc: 'Message sellers directly, ask questions, negotiate prices, and Agree on delivery terms.',
    link: '/chats',
  },
  {
    step: 4,
    icon: ShoppingCart,
    title: 'Order & Pay Securely',
    desc: 'Place orders with M-Pesa or mobile wallet payments. Track your order in real time.',
    link: '/checkout',
  },
  {
    step: 5,
    icon: Wallet,
    title: 'Receive & Confirm',
    desc: 'Get delivery with photo proof. Confirm receipt to release payment to the seller.',
    link: '/customer/orders',
  },
  {
    step: 6,
    icon: TrendingUp,
    title: 'Grow Your Business',
    desc: 'Use AI blog writer, analytics, and community features to scale your poultry brand.',
    link: '/blog',
  },
];

export function HowItWorks() {
  return (
    <section className="py-20 md:py-28 bg-white dark:bg-gray-950 relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-14">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.12em] border
            bg-amber-50 border-amber-200 text-amber-600
            dark:bg-amber-950/50 dark:border-amber-800/60 dark:text-amber-400">
            <TrendingUp className="w-3 h-3" /> How It Works
          </span>
          <h2 className="mt-4 text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white leading-tight">
            Start in{' '}
            <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
              3 Simple Steps
            </span>
          </h2>
          <p className="mt-3 text-[14px] text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            From sign-up to your first sale or purchase — the entire process takes minutes, not days.
          </p>
        </Reveal>

        {/* Steps grid: 2 cols on mobile, 3 on desktop */}
        <div className="relative">
          {/* Connecting line (desktop) */}
          <div className="hidden lg:block absolute top-[88px] left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-0.5 bg-gradient-to-r from-orange-200 via-amber-200 to-orange-200 dark:from-orange-900 dark:via-amber-900 dark:to-orange-900" />

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {STEPS.map((item, i) => (
              <Reveal key={item.step} variants={blurUp} delay={0.08 * i}>
                <motion.a
                  href={item.link}
                  whileHover={{ y: -5 }}
                  className="group relative block p-5 sm:p-6 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-orange-200 dark:hover:border-orange-800/50 hover:shadow-lg hover:shadow-orange-50 dark:hover:shadow-none transition-all duration-300 h-full"
                >
                  {/* Step number */}
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white">{item.step}</span>
                  </div>

                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mb-3.5 group-hover:scale-110 transition-transform duration-300">
                    <item.icon className="w-5 h-5 text-white" />
                  </div>
                  
                  <h3 className="text-[13px] sm:text-[14px] font-bold text-gray-900 dark:text-white mb-2">{item.title}</h3>
                  <p className="text-[11.5px] sm:text-[12.5px] text-gray-500 dark:text-gray-400 leading-relaxed">{item.desc}</p>
                </motion.a>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Quick start CTA */}
        <Reveal delay={0.6} className="mt-10">
          <div className="text-center p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 shadow-xl shadow-orange-400/25">
            <p className="text-white text-[15px] sm:text-[16px] font-semibold mb-3">
              Ready to get started? It takes less than 30 seconds.
            </p>
            <motion.a
              href="/auth/register"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-orange-600 font-bold text-[13px] shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <UserPlus className="w-4 h-4" />
              Create Free Account
            </motion.a>
            <p className="text-white/70 text-[12px] mt-2">No credit card required. No hidden fees.</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
