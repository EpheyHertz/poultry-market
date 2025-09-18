import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog - Poultry Market KE | Farming Tips & Industry Insights',
  description: 'Discover expert poultry farming tips, industry insights, and success stories from Kenya\'s leading poultry marketplace. Stay updated with the latest trends and best practices.',
  keywords: [
    'poultry farming',
    'chicken farming',
    'poultry tips',
    'farming advice',
    'Kenya agriculture',
    'poultry business',
    'chicken care',
    'poultry feed',
    'farming techniques',
    'poultry industry'
  ],
  authors: [{ name: 'Poultry Market KE' }],
  creator: 'Poultry Market KE',
  publisher: 'Poultry Market KE',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: 'Blog - Poultry Market KE | Farming Tips & Industry Insights',
    description: 'Discover expert poultry farming tips, industry insights, and success stories from Kenya\'s leading poultry marketplace.',
    url: 'https://poultrymarket.co.ke/blog',
    siteName: 'Poultry Market KE',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/images/blog-og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Poultry Market KE Blog - Expert Farming Tips',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog - Poultry Market KE | Farming Tips & Industry Insights',
    description: 'Discover expert poultry farming tips, industry insights, and success stories from Kenya\'s leading poultry marketplace.',
    images: ['/images/blog-og-image.jpg'],
    creator: '@PoultryMarketKE',
  },
  alternates: {
    canonical: 'https://poultrymarket.co.ke/blog',
  },
  category: 'Agriculture',
};