import ContextualNotFound from '@/components/ui/contextual-not-found';

export default function NotFound() {
  return (
    <ContextualNotFound
      contextLabel="Blog"
      title="We couldn't load that story"
      description="The article you're looking for might be private or has been moved. Explore fresh stories below."
      primaryAction={{ href: '/blog', label: 'Back to blog home' }}
      secondaryAction={{ href: '/blog/submit', label: 'Share a story' }}
      helpfulLinks={[
        { href: '/blog', label: 'Explore latest stories', description: 'See trending guides and market updates.' },
        { href: '/my-blogs', label: 'Manage my drafts', description: 'Review submissions waiting for approval.' },
        { href: '/blog/submit', label: 'Pitch a new article', description: 'Publish insights for the community.' },
        { href: '/contact', label: 'Need editorial help?', description: 'Talk to the content team about your publication.' },
      ]}
    />
  );
}
