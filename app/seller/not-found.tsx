import ContextualNotFound from '@/components/ui/contextual-not-found';

export default function NotFound() {
  return (
    <ContextualNotFound
      contextLabel="Seller"
      title="Seller page missing"
      description="The seller tool you tried to open isn't available. Choose another workspace link to keep managing your storefront."
      primaryAction={{ href: '/seller', label: 'Open seller dashboard' }}
      secondaryAction={{ href: '/seller/products', label: 'Manage catalog' }}
      helpfulLinks={[
        { href: '/seller/orders', label: 'Order fulfillment', description: 'Confirm shipments and resolve issues.' },
        { href: '/seller/payouts', label: 'View payouts', description: 'Track settlements and invoices.' },
        { href: '/contact', label: 'Seller success desk', description: 'Request merchandising or logistics help.' },
        { href: '/blog/submit', label: 'Share expertise', description: 'Publish insights that boost your brand.' },
      ]}
    />
  );
}
