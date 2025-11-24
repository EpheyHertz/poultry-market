import ContextualNotFound from '@/components/ui/contextual-not-found';

export default function NotFound() {
  return (
    <ContextualNotFound
      contextLabel="Customer"
      title="This page wandered off"
      description="We can't locate this customer page right now. Let's get you back to helpful tools and keep shopping hassle-free."
      primaryAction={{ href: '/customer', label: 'Back to customer hub' }}
      secondaryAction={{ href: '/store', label: 'Go to marketplace' }}
      helpfulLinks={[
        { href: '/customer/orders', label: 'Track my orders', description: 'Follow deliveries and download receipts.' },
        { href: '/customer/profile', label: 'Update profile', description: 'Manage saved addresses and preferences.' },
        { href: '/store', label: 'Browse featured products', description: 'Discover feeds, chicks, and equipment.' },
        { href: '/contact', label: 'Talk to support', description: 'Reach us if you need hands-on assistance.' },
      ]}
    />
  );
}
