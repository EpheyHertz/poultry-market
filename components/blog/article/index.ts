/**
 * Editorial article components (§28).
 *
 * Single entry point so the page composes named pieces instead of one huge
 * component. Markdown parsing/rendering stays isolated in `markdown-renderer`.
 */

export { ArticleAnalyticsProvider, useArticleAnalytics } from './article-analytics';
export type { ArticleAnalyticsContextValue, ArticleAnalyticsProviderProps } from './article-analytics';

export { ArticleContent } from './article-content';
export { ArticleHeader } from './article-header';
export { ArticleImage } from './article-image';
export { ArticleShell } from './article-shell';
export { ArticleSidebar } from './article-sidebar';
export { CodeBlock } from './code-block';
export { FacebookEmbed } from './facebook-embed';
export { LinkPreview } from './link-preview';
export { MarkdownRenderer } from './markdown-renderer';
export type { MarkdownRendererProps } from './markdown-renderer';
export { ReadingProgress } from './reading-progress';
export { RecommendedPostCard } from './recommended-post-card';
export type { RecommendedCardVariant } from './recommended-post-card';
export { RecommendedPosts, filterRecommendations } from './recommended-posts';
export { ShareButtons } from './share-buttons';
export { TableOfContents } from './table-of-contents';
export { YouTubeEmbed } from './youtube-embed';
