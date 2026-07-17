'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart, Bot, PenTool, Search, ArrowRight, Sparkles,
  Eye, Smartphone, Laptop, CheckCircle
} from 'lucide-react';
import { Reveal, fadeUp, Btn } from './shared';

const DEMO_STEPS = [
  {
    id: 'browse',
    icon: ShoppingCart,
    title: 'Browse Marketplace',
    desc: 'Explore fresh poultry products listed by verified farmers in your county.',
    color: 'from-orange-500 to-amber-500',
    link: '/products',
    linkLabel: 'Browse Products',
  },
  {
    id: 'ask-ai',
    icon: Bot,
    title: 'Ask Poultry AI',
    desc: 'Get instant expert answers about diseases, feed, vaccination, and more.',
    color: 'from-indigo-600 to-violet-600',
    link: '/chatbot',
    linkLabel: 'Try AI Chat',
  },
  {
    id: 'write',
    icon: PenTool,
    title: 'Write with AI Blog',
    desc: 'Generate professional poultry articles in seconds with our AI writer.',
    color: 'from-emerald-500 to-teal-500',
    link: 'https://aiblogwriter.poultrymarket.app',
    linkLabel: 'Start Writing',
  },
  {
    id: 'search',
    icon: Search,
    title: 'Search Articles',
    desc: 'Find expert guides on disease prevention, feed formulation, and business growth.',
    color: 'from-blue-500 to-cyan-500',
    link: '/blog',
    linkLabel: 'Browse Blog',
  },
];

export function TryProduct() {
  const [activeStep, setActiveStep] = useState(DEMO_STEPS[0].id);

  const current = DEMO_STEPS.find(s => s.id === activeStep)!;

  return (
    <section className="py-20 md:py-28 bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.12em] border
            bg-blue-50 border-blue-200 text-blue-600
            dark:bg-blue-950/50 dark:border-blue-800/60 dark:text-blue-400">
            <Eye className="w-3 h-3" /> Try It Now
          </span>
          <h2 className="mt-4 text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white leading-tight">
            See the Platform in{' '}
            <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
              Action
            </span>
          </h2>
          <p className="mt-3 text-[14px] text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            No sign-up required. Try each feature right now and see what Poultry Market Kenya can do for you.
          </p>
        </Reveal>

        {/* Mobile-friendly step selector - horizontal scroll on small screens */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-8 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:justify-center">
          {DEMO_STEPS.map((step) => (
            <button
              key={step.id}
              onClick={() => setActiveStep(step.id)}
              className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] sm:text-[13px] font-semibold transition-all duration-300 border ${
                activeStep === step.id
                  ? 'bg-white dark:bg-gray-800 border-orange-300 dark:border-orange-600 shadow-md text-gray-900 dark:text-white'
                  : 'bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-orange-200 dark:hover:border-orange-700'
              }`}
            >
              <step.icon className="w-4 h-4" />
              <span className="whitespace-nowrap">{step.title}</span>
            </button>
          ))}
        </div>

        {/* Active demo card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
          >
            <div className="grid lg:grid-cols-5 gap-6 items-center">
              {/* Left: explanation */}
              <div className="lg:col-span-2">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-gradient-to-r ${current.color} text-white mb-4`}>
                  <Sparkles className="w-3 h-3" />
                  Live Feature
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white mb-3">{current.title}</h3>
                <p className="text-[14px] text-gray-500 dark:text-gray-400 leading-relaxed mb-6">{current.desc}</p>
                
                <ul className="space-y-2.5 mb-6">
                  {[
                    'No registration needed',
                    'Works on mobile & desktop',
                    'Real data, live results',
                  ].map((ben) => (
                    <li key={ben} className="flex items-start gap-2.5 text-[13px] text-gray-600 dark:text-gray-400">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {ben}
                    </li>
                  ))}
                </ul>

                <Btn
                  href={current.link}
                  variant={activeStep === 'ask-ai' ? 'primary' : 'outline'}
                  external={current.id === 'write'}
                >
                  {current.linkLabel} <ArrowRight className="w-4 h-4" />
                </Btn>
              </div>

              {/* Right: phone mockup */}
              <div className="lg:col-span-3">
                <div className="relative mx-auto max-w-[320px] sm:max-w-[380px]">
                  {/* Phone frame */}
                  <div className="relative rounded-[2.5rem] border-[3px] border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 shadow-2xl overflow-hidden">
                    {/* Notch */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[28px] bg-gray-300 dark:bg-gray-600 rounded-b-2xl z-10" />
                    
                    {/* Content */}
                    <div className="pt-10 pb-4 px-4">
                      {activeStep === 'browse' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-[14px] font-bold text-gray-900 dark:text-white">Fresh Listings</h4>
                            <span className="text-[11px] text-orange-500 font-semibold">12 new</span>
                          </div>
                          {[
                            { name: 'Farm Fresh Eggs', price: 'KSh 450', loc: 'Nairobi', badge: 'Today' },
                            { name: 'Day-Old Chicks', price: 'KSh 120', loc: 'Kisumu', badge: 'Verified' },
                            { name: 'Broiler Feed 50kg', price: 'KSh 2,800', loc: 'Eldoret', badge: 'Promoted' },
                          ].map((item) => (
                            <div key={item.name} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                              <div>
                                <p className="text-[12px] font-semibold text-gray-900 dark:text-white">{item.name}</p>
                                <p className="text-[11px] text-gray-500">{item.loc}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[12px] font-bold text-orange-500">{item.price}</p>
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 font-semibold">
                                  {item.badge}
                                </span>
                              </div>
                            </div>
                          ))}
                          <div className="pt-2 text-center">
                            <span className="text-[11px] text-orange-500 font-semibold">View all 48+ products →</span>
                          </div>
                        </div>
                      )}

                      {activeStep === 'ask-ai' && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-800">
                            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                              <Bot className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-[12px] font-bold text-gray-900 dark:text-white">Poultry AI</span>
                            <span className="ml-auto flex items-center gap-1 text-[9px] text-green-500">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                              Online
                            </span>
                          </div>
                          <div className="flex justify-end">
                            <div className="max-w-[85%] p-2.5 rounded-2xl rounded-tr-sm bg-indigo-600 text-white text-[11.5px] leading-relaxed">
                              My broilers have diarrhea. What should I do?
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Bot className="w-2.5 h-2.5 text-white" />
                            </div>
                            <div className="max-w-[85%] p-2.5 rounded-2xl rounded-tl-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[11.5px] leading-relaxed">
                              Diarrhea in broilers can be caused by coccidiosis, bacterial infections, or poor feed quality. Check for bloody droppings...
                            </div>
                          </div>
                          <div className="pt-2">
                            <input
                              readOnly
                              value="Ask anything about poultry..."
                              className="w-full p-2.5 text-[11.5px] rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-400 cursor-default"
                            />
                          </div>
                        </div>
                      )}

                      {activeStep === 'write' && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-800">
                            <PenTool className="w-4 h-4 text-emerald-500" />
                            <span className="text-[12px] font-bold text-gray-900 dark:text-white">AI Blog Writer</span>
                            <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 font-semibold">AI Active</span>
                          </div>
                          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Topic</p>
                            <p className="text-[12px] font-medium text-emerald-600 dark:text-emerald-400">
                              How to Start a Profitable Layer Farm in Kenya
                            </p>
                          </div>
                          <div className="space-y-1.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                            {[90, 78, 85, 92, 70, 88].map((w, i) => (
                              <div key={i} className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700" style={{ width: `${w}%` }} />
                            ))}
                          </div>
                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30">
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">SEO Score: 94/100</span>
                            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">Ready to Publish</span>
                          </div>
                        </div>
                      )}

                      {activeStep === 'search' && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                            <Search className="w-4 h-4 text-gray-400" />
                            <span className="text-[12px] text-gray-400">Search poultry guides...</span>
                          </div>
                          {[
                            { title: 'Newcastle Disease Prevention Guide', views: '2.3k', tag: 'Disease' },
                            { title: 'Layer Feed Formulation 101', views: '1.8k', tag: 'Feed' },
                            { title: 'Bio-Security for Small Farms', views: '1.2k', tag: 'Management' },
                          ].map((a) => (
                            <div key={a.title} className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                              <p className="text-[11.5px] font-semibold text-gray-900 dark:text-white mb-0.5">{a.title}</p>
                              <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                <span className="px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-medium">{a.tag}</span>
                                <span>{a.views} views</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Home bar */}
                    <div className="pb-3 flex justify-center">
                      <div className="w-[36%] h-[5px] rounded-full bg-gray-300 dark:bg-gray-600" />
                    </div>
                  </div>

                  {/* Floating device label */}
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md text-[10px] text-gray-500 whitespace-nowrap">
                    <Smartphone className="w-3 h-3" />
                    Mobile Preview
                    <Laptop className="w-3 h-3 ml-1" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
