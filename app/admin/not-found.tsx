import ContextualNotFound from '@/components/ui/contextual-not-found';

export default function NotFound() {
  return (
    <ContextualNotFound
      contextLabel="Admin"
      title="We couldn't find that admin resource"
      description="The page you attempted to open isn't available or may have been moved. Choose another destination to keep working."
      primaryAction={{ href: '/admin', label: 'Return to admin home' }}
      secondaryAction={{ href: '/admin/dashboard', label: 'View analytics dashboard' }}
      helpfulLinks={[
        { href: '/admin/orders', label: 'Manage orders', description: 'Track fulfillment status and approvals.' },
        { href: '/admin/blog', label: 'Review blog submissions', description: 'Approve drafts and monitor content health.' },
        { href: '/admin/users', label: 'User management', description: 'Update roles, reset passwords, or deactivate accounts.' },
        { href: '/contact', label: 'Open support center', description: 'Escalate an issue with the ops team.' },
      ]}
    />
  );
}
