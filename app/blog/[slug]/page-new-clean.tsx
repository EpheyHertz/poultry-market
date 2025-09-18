import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PublicNavbar from '@/components/layout/public-navbar';
import MobileBlogPost from './mobile-blog-post';

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

async function getBlogPost(slug: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/blog/${slug}`, {
      cache: 'no-store'
    });
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return data.post;
  } catch (error) {
    console.error('Error fetching blog post:', error);
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const post = await getBlogPost(resolvedParams.slug);

  if (!post) {
    return {
      title: 'Post Not Found - Poultry Blog',
      description: 'The blog post you are looking for could not be found.'
    };
  }

  return {
    title: `${post.title} - Poultry Blog`,
    description: post.excerpt || post.title,
    openGraph: {
      title: post.title,
      description: post.excerpt || post.title,
      images: post.featuredImage ? [post.featuredImage] : [],
      type: 'article',
      publishedTime: post.publishedAt,
      authors: [post.author.name],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt || post.title,
      images: post.featuredImage ? [post.featuredImage] : [],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const resolvedParams = await params;
  const post = await getBlogPost(resolvedParams.slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />
      <MobileBlogPost params={params} />
    </div>
  );
}
