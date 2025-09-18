'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import BlogImageUpload from '@/components/blog/blog-image-upload';
import { 
  Bold, 
  Italic, 
  Underline,
  List,
  ListOrdered,
  Link,
  Image as ImageIcon,
  Code,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Eye,
  X,
  Upload,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

interface BlogPostData {
  title: string;
  content: string;
  excerpt: string;
  featuredImage: string;
  images: string[]; // Array of image URLs (max 3)
  category: string;
  tags: string[];
  status: 'DRAFT' | 'PUBLISHED';
  featured: boolean;
  metaDescription: string;
  metaKeywords: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  publishedAt?: string;
  scheduledAt?: string;
}

interface BlogEditorProps {
  initialData?: Partial<BlogPostData>;
  onSave: (data: BlogPostData) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
  loading?: boolean;
}

const BLOG_CATEGORIES = {
  FARMING_TIPS: { name: 'Farming Tips', icon: '🌱' },
  POULTRY_HEALTH: { name: 'Poultry Health', icon: '🏥' },
  FEED_NUTRITION: { name: 'Feed & Nutrition', icon: '🌾' },
  EQUIPMENT_GUIDES: { name: 'Equipment Guides', icon: '🔧' },
  MARKET_TRENDS: { name: 'Market Trends', icon: '📈' },
  SUCCESS_STORIES: { name: 'Success Stories', icon: '🏆' },
  INDUSTRY_NEWS: { name: 'Industry News', icon: '📰' },
  SEASONAL_ADVICE: { name: 'Seasonal Advice', icon: '🌤️' },
  BEGINNER_GUIDES: { name: 'Beginner Guides', icon: '📚' },
  ADVANCED_TECHNIQUES: { name: 'Advanced Techniques', icon: '🎯' }
};

export default function BlogEditor({ 
  initialData, 
  onSave, 
  onCancel, 
  isEditing = false,
  loading = false 
}: BlogEditorProps) {
  const [formData, setFormData] = useState<BlogPostData>({
    title: '',
    content: '',
    excerpt: '',
    featuredImage: '',
    images: [],
    category: 'FARMING_TIPS',
    tags: [],
    status: 'DRAFT',
    featured: false,
    metaDescription: '',
    metaKeywords: '',
    ogTitle: '',
    ogDescription: '',
    ogImage: '',
    twitterTitle: '',
    twitterDescription: '',
    twitterImage: '',
    ...initialData
  });

  const [showSeoFields, setShowSeoFields] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [contentPreview, setContentPreview] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<{ url: string; name: string; size: number }[]>([]);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize image previews from existing data
  useEffect(() => {
    if (initialData?.images && initialData.images.length > 0) {
      const previews = initialData.images.map((url, index) => ({
        url,
        name: `Image ${index + 1}`,
        size: 0 // Size unknown for existing images
      }));
      setImagePreviews(previews);
    }
  }, [initialData]);

  // Handle form field changes
  const handleChange = (field: keyof BlogPostData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-generate SEO fields if they're empty
    if (field === 'title' && !formData.ogTitle) {
      setFormData(prev => ({ ...prev, ogTitle: value }));
    }
    if (field === 'title' && !formData.twitterTitle) {
      setFormData(prev => ({ ...prev, twitterTitle: value }));
    }
    if (field === 'excerpt' && !formData.metaDescription) {
      setFormData(prev => ({ ...prev, metaDescription: value.substring(0, 160) }));
    }
    if (field === 'excerpt' && !formData.ogDescription) {
      setFormData(prev => ({ ...prev, ogDescription: value }));
    }
    if (field === 'excerpt' && !formData.twitterDescription) {
      setFormData(prev => ({ ...prev, twitterDescription: value }));
    }
  };

  // Add tag
  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      handleChange('tags', [...formData.tags, newTag.trim()]);
      setNewTag('');
    }
  };

  // Remove tag
  const removeTag = (tagToRemove: string) => {
    handleChange('tags', formData.tags.filter(tag => tag !== tagToRemove));
  };

  // Handle image upload
  const handleImageUpload = async (file: File) => {
    try {
      setImageUploading(true);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'blog');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');

      const { url } = await response.json();
      return url;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
      return null;
    } finally {
      setImageUploading(false);
    }
  };

  // Handle featured image upload
  const handleFeaturedImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const url = await handleImageUpload(file);
    if (url) {
      handleChange('featuredImage', url);
      handleChange('ogImage', url);
      handleChange('twitterImage', url);
    }
  };

  // Insert text formatting
  const insertFormatting = (format: string) => {
    const textarea = contentRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);

    let newText = '';
    let newCursorPos = start;

    switch (format) {
      case 'bold':
        newText = `**${selectedText || 'bold text'}**`;
        newCursorPos = start + (selectedText ? newText.length : 2);
        break;
      case 'italic':
        newText = `*${selectedText || 'italic text'}*`;
        newCursorPos = start + (selectedText ? newText.length : 1);
        break;
      case 'heading1':
        newText = `# ${selectedText || 'Heading 1'}`;
        newCursorPos = start + (selectedText ? newText.length : 2);
        break;
      case 'heading2':
        newText = `## ${selectedText || 'Heading 2'}`;
        newCursorPos = start + (selectedText ? newText.length : 3);
        break;
      case 'heading3':
        newText = `### ${selectedText || 'Heading 3'}`;
        newCursorPos = start + (selectedText ? newText.length : 4);
        break;
      case 'list':
        newText = `- ${selectedText || 'List item'}`;
        newCursorPos = start + (selectedText ? newText.length : 2);
        break;
      case 'orderedList':
        newText = `1. ${selectedText || 'List item'}`;
        newCursorPos = start + (selectedText ? newText.length : 3);
        break;
      case 'quote':
        newText = `> ${selectedText || 'Quote text'}`;
        newCursorPos = start + (selectedText ? newText.length : 2);
        break;
      case 'code':
        newText = `\`${selectedText || 'code'}\``;
        newCursorPos = start + (selectedText ? newText.length : 1);
        break;
      case 'link':
        newText = `[${selectedText || 'link text'}](url)`;
        newCursorPos = start + newText.length - 4;
        break;
      case 'image':
        newText = `![${selectedText || 'alt text'}](image-url)`;
        newCursorPos = start + newText.length - 11;
        break;
      default:
        return;
    }

    const fullText = before + newText + after;
    handleChange('content', fullText);

    // Set cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Render content preview
  const renderPreview = () => {
    return formData.content
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/`(.*)`/gim, '<code>$1</code>')
      .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
      .replace(/\n/gim, '<br>');
  };

  // Handle save
  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!formData.content.trim()) {
      toast.error('Content is required');
      return;
    }
    if (!formData.category) {
      toast.error('Category is required');
      return;
    }

    await onSave(formData);
  };

  // Handle publish
  const handlePublish = async () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!formData.content.trim()) {
      toast.error('Content is required');
      return;
    }
    if (!formData.category) {
      toast.error('Category is required');
      return;
    }

    // Set status to PUBLISHED before saving
    const publishData = { ...formData, status: 'PUBLISHED' as const };
    await onSave(publishData);
  };

  // Handle save draft
  const handleSaveDraft = async () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!formData.content.trim()) {
      toast.error('Content is required');
      return;
    }
    if (!formData.category) {
      toast.error('Category is required');
      return;
    }

    // Set status to DRAFT before saving
    const draftData = { ...formData, status: 'DRAFT' as const };
    await onSave(draftData);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">
          {isEditing ? 'Edit Post' : 'Create New Post'}
        </h1>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveDraft}
            disabled={loading}
            variant="outline"
          >
            Save Draft
          </Button>
          <Button 
            onClick={handlePublish}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {formData.status === 'PUBLISHED' ? 'Update & Publish' : 'Publish'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Post Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title */}
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Enter post title..."
                  className="text-lg font-semibold"
                />
              </div>

              {/* Excerpt */}
              <div>
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  value={formData.excerpt}
                  onChange={(e) => handleChange('excerpt', e.target.value)}
                  placeholder="Brief summary of the post..."
                  rows={3}
                />
              </div>

              {/* Content Editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="content">Content *</Label>
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setContentPreview(!contentPreview)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {contentPreview ? 'Edit' : 'Preview'}
                    </Button>
                  </div>
                </div>

                {/* Formatting Toolbar */}
                {!contentPreview && (
                  <div className="flex flex-wrap gap-1 p-2 border border-gray-200 rounded-t-md bg-gray-50">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => insertFormatting('bold')}
                    >
                      <Bold className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => insertFormatting('italic')}
                    >
                      <Italic className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => insertFormatting('heading1')}
                    >
                      <Heading1 className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => insertFormatting('heading2')}
                    >
                      <Heading2 className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => insertFormatting('heading3')}
                    >
                      <Heading3 className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => insertFormatting('list')}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => insertFormatting('orderedList')}
                    >
                      <ListOrdered className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => insertFormatting('quote')}
                    >
                      <Quote className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => insertFormatting('code')}
                    >
                      <Code className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => insertFormatting('link')}
                    >
                      <Link className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => insertFormatting('image')}
                    >
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Content Area */}
                {contentPreview ? (
                  <div 
                    className="min-h-[400px] p-4 border border-gray-200 rounded-b-md bg-white prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: renderPreview() }}
                  />
                ) : (
                  <Textarea
                    ref={contentRef}
                    id="content"
                    value={formData.content}
                    onChange={(e) => handleChange('content', e.target.value)}
                    placeholder="Start writing your blog post... Use Markdown for formatting."
                    rows={20}
                    className="rounded-t-none border-t-0"
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Blog Post Images */}
          <Card>
            <CardHeader>
              <CardTitle>Blog Post Images</CardTitle>
              <p className="text-sm text-gray-600">
                Add up to 3 images to enhance your blog post content
              </p>
            </CardHeader>
            <CardContent>
              <BlogImageUpload
                images={imagePreviews}
                onImagesChange={(newImages) => {
                  setImagePreviews(newImages);
                  handleChange('images', newImages.map(img => img.url));
                }}
                maxImages={3}
                maxFileSize={10 * 1024 * 1024} // 10MB
              />
            </CardContent>
          </Card>

          {/* SEO Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>SEO & Social Media</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSeoFields(!showSeoFields)}
                >
                  {showSeoFields ? 'Hide' : 'Show'} SEO Fields
                </Button>
              </div>
            </CardHeader>
            {showSeoFields && (
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="metaDescription">Meta Description</Label>
                  <Textarea
                    id="metaDescription"
                    value={formData.metaDescription}
                    onChange={(e) => handleChange('metaDescription', e.target.value)}
                    placeholder="SEO meta description (160 characters max)"
                    rows={2}
                    maxLength={160}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.metaDescription.length}/160 characters
                  </p>
                </div>

                <div>
                  <Label htmlFor="metaKeywords">Meta Keywords</Label>
                  <Input
                    id="metaKeywords"
                    value={formData.metaKeywords}
                    onChange={(e) => handleChange('metaKeywords', e.target.value)}
                    placeholder="SEO keywords (comma separated)"
                  />
                </div>

                <Separator />

                {/* Open Graph */}
                <div className="space-y-3">
                  <h4 className="font-semibold">Open Graph (Facebook)</h4>
                  <div>
                    <Label htmlFor="ogTitle">OG Title</Label>
                    <Input
                      id="ogTitle"
                      value={formData.ogTitle}
                      onChange={(e) => handleChange('ogTitle', e.target.value)}
                      placeholder="Facebook share title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ogDescription">OG Description</Label>
                    <Textarea
                      id="ogDescription"
                      value={formData.ogDescription}
                      onChange={(e) => handleChange('ogDescription', e.target.value)}
                      placeholder="Facebook share description"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="ogImage">OG Image URL</Label>
                    <Input
                      id="ogImage"
                      value={formData.ogImage}
                      onChange={(e) => handleChange('ogImage', e.target.value)}
                      placeholder="Facebook share image URL"
                    />
                  </div>
                </div>

                <Separator />

                {/* Twitter Cards */}
                <div className="space-y-3">
                  <h4 className="font-semibold">Twitter Cards</h4>
                  <div>
                    <Label htmlFor="twitterTitle">Twitter Title</Label>
                    <Input
                      id="twitterTitle"
                      value={formData.twitterTitle}
                      onChange={(e) => handleChange('twitterTitle', e.target.value)}
                      placeholder="Twitter share title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="twitterDescription">Twitter Description</Label>
                    <Textarea
                      id="twitterDescription"
                      value={formData.twitterDescription}
                      onChange={(e) => handleChange('twitterDescription', e.target.value)}
                      placeholder="Twitter share description"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="twitterImage">Twitter Image URL</Label>
                    <Input
                      id="twitterImage"
                      value={formData.twitterImage}
                      onChange={(e) => handleChange('twitterImage', e.target.value)}
                      placeholder="Twitter share image URL"
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Publish Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Publish Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value: 'DRAFT' | 'PUBLISHED') => handleChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PUBLISHED">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="featured"
                  checked={formData.featured}
                  onCheckedChange={(checked) => handleChange('featured', checked)}
                />
                <Label htmlFor="featured">Featured Post</Label>
              </div>
            </CardContent>
          </Card>

          {/* Category & Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Category & Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category} onValueChange={(value) => handleChange('category', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(BLOG_CATEGORIES).map(([key, category]) => (
                      <SelectItem key={key} value={key}>
                        {category.icon} {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tags */}
              <div>
                <Label htmlFor="tags">Tags</Label>
                <div className="flex space-x-2 mb-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" onClick={addTag} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Featured Image */}
          <Card>
            <CardHeader>
              <CardTitle>Featured Image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.featuredImage ? (
                <div className="relative">
                  <Image
                    src={formData.featuredImage}
                    alt="Featured image"
                    width={300}
                    height={200}
                    className="w-full h-40 object-cover rounded-md"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => handleChange('featuredImage', '')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
                  <ImageIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-2">Upload featured image</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={imageUploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {imageUploading ? 'Uploading...' : 'Choose Image'}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFeaturedImageUpload}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="featuredImageUrl">Or enter image URL</Label>
                <Input
                  id="featuredImageUrl"
                  value={formData.featuredImage}
                  onChange={(e) => handleChange('featuredImage', e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}