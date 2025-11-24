import ContextualNotFound from '@/components/ui/contextual-not-found';

export default function NotFound() {
  return (
    <ContextualNotFound
      contextLabel="Company"
      title="We can't find that company page"
      description="The resource you're after may be archived or restricted. Navigate to one of the company quick links below."
      primaryAction={{ href: '/company', label: 'Company overview' }}
      secondaryAction={{ href: '/contact', label: 'Reach our team' }}
      helpfulLinks={[
        { href: '/company/about', label: 'About Poultry Market', description: 'Learn about our mission and leadership.' },
        { href: '/company/careers', label: 'Careers', description: 'See current openings and hiring updates.' },
        { href: '/company/press', label: 'Press kit', description: 'Download brand assets and media resources.' },
        { href: '/store', label: 'Visit the store', description: 'Head back to the marketplace experience.' },
      ]}
    />
  );
}
