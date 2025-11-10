'use client';

import { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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
  Plus,
  User,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

interface BlogSubmissionData {
  title: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  images: string[];
  category: string;
  tags: string[];
  submissionNotes?: string;
}

interface BlogSubmissionFormProps {
  onSubmit: (data: BlogSubmissionData) => Promise<void>;
  loading?: boolean;
  currentUser?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
}

const BLOG_CATEGORIES = {
  FARMING_TIPS: { name: 'Farming Tips', icon: '🌱', description: 'Tips and tricks for successful farming' },
  POULTRY_HEALTH: { name: 'Poultry Health', icon: '🏥', description: 'Health management and disease prevention' },
  FEED_NUTRITION: { name: 'Feed & Nutrition', icon: '🌾', description: 'Feeding strategies and nutrition advice' },
  EQUIPMENT_GUIDES: { name: 'Equipment Guides', icon: '🔧', description: 'Equipment reviews and usage guides' },
  MARKET_TRENDS: { name: 'Market Trends', icon: '📈', description: 'Market analysis and price trends' },
  SUCCESS_STORIES: { name: 'Success Stories', icon: '🏆', description: 'Inspiring farmer success stories' },
  INDUSTRY_NEWS: { name: 'Industry News', icon: '📰', description: 'Latest industry news and updates' },
  SEASONAL_ADVICE: { name: 'Seasonal Advice', icon: '🌤️', description: 'Season-specific farming advice' },
  BEGINNER_GUIDES: { name: 'Beginner Guides', icon: '📚', description: 'Guides for new farmers' },
  ADVANCED_TECHNIQUES: { name: 'Advanced Techniques', icon: '🎯', description: 'Advanced farming techniques' }
};

export default function BlogSubmissionForm({ onSubmit, loading = false, currentUser }: BlogSubmissionFormProps) {
  const [formData, setFormData] = useState<BlogSubmissionData>({
    title: '',
    content: '',
    excerpt: '',
    featuredImage: '',
    images: [],
    category: '',
    tags: [],
    submissionNotes: '',
  });

  const [newTag, setNewTag] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [contentPreview, setContentPreview] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<{ url: string; name: string; size: number }[]>([]);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle form field changes
  const handleChange = (field: keyof BlogSubmissionData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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

  // Compress image (client-side) - similar to product upload
  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve) => {
      // Skip compression for non-image files
      if (!file.type.match('image.*')) {
        resolve(file);
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Set maximum dimensions
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          }, 'image/jpeg', 0.7);
        };
      };
    });
  };

  // Handle image upload using Cloudinary
  const handleImageUpload = async (file: File) => {
    try {
      setImageUploading(true);
      
      // Check file size (max 10MB)
      const MAX_FILE_SIZE = 10 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`Image ${file.name} is too large (max 10MB)`);
        return null;
      }

      // Compress image (client-side)
      const compressedFile = await compressImage(file);
      
      const formDataUpload = new FormData();
      formDataUpload.append('file', compressedFile);

      const response = await fetch('/api/upload/cloudinary', {
        method: 'POST',
        body: formDataUpload
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
    }
  };

  // Handle additional images upload
  const handleAdditionalImagesUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    if (formData.images.length + files.length > 3) {
      toast.error('Maximum 3 additional images allowed');
      return;
    }

    setImageUploading(true);

    try {
      const uploadedUrls: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const url = await handleImageUpload(file);
        
        if (url) {
          uploadedUrls.push(url);
        }
      }

      if (uploadedUrls.length > 0) {
        handleChange('images', [...formData.images, ...uploadedUrls]);
        toast.success(`Successfully uploaded ${uploadedUrls.length} image(s)`);
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Failed to upload some images');
    } finally {
      setImageUploading(false);
      // Clear the input
      event.target.value = '';
    }
  };

  // Remove additional image
  const removeImage = (index: number) => {
    const newImages = [...formData.images];
    newImages.splice(index, 1);
    handleChange('images', newImages);

    const newPreviews = [...imagePreviews];
    newPreviews.splice(index, 1);
    setImagePreviews(newPreviews);
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

  // Handle form submission
  const handleSubmit = async () => {
    if (!currentUser?.email) {
      toast.error('Please log in to submit a blog post.');
      return;
    }

    if (!currentUser?.name) {
      toast.error('Please update your profile with your name before submitting.');
      return;
    }

    // Validation
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

    // Content length validation
    if (formData.content.trim().length < 300) {
      toast.error('Content must be at least 300 characters long');
      return;
    }

    const payload: BlogSubmissionData = {
      ...formData,
      featuredImage: formData.featuredImage?.trim() ? formData.featuredImage.trim() : undefined,
      excerpt: formData.excerpt?.trim() ? formData.excerpt.trim() : undefined,
      submissionNotes: formData.submissionNotes?.trim() ? formData.submissionNotes.trim() : undefined,
    };

    await onSubmit(payload);
  };

  const contributorName = currentUser?.name?.trim() || 'Name not set';
  const contributorEmail = currentUser?.email?.trim() || 'Email not set';
  const contributorPhone = currentUser?.phone?.trim() || 'Phone not provided';
  const profileIncomplete = !currentUser?.name || !currentUser?.email;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Contributor profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            Contributor Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your PoultryMarket profile identifies you as the author. Update your account details to change what appears
            here.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="author-name">Author name</Label>
              <Input id="author-name" value={contributorName} readOnly disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="author-email">Author email</Label>
              <Input id="author-email" value={contributorEmail} readOnly disabled />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="author-phone">Phone (optional)</Label>
              <Input id="author-phone" value={contributorPhone} readOnly disabled />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              {profileIncomplete ? (
                <div className="p-3 rounded-md border border-yellow-200 bg-yellow-50 text-sm text-yellow-800">
                  Complete your profile with your name and a verified email so we can credit your submission properly.
                </div>
              ) : (
                <div className="p-3 rounded-md border border-emerald-200 bg-emerald-50 text-sm text-emerald-700 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Profile ready for submission
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Blog Content */}
      <Card>
        <CardHeader>
          <CardTitle>Blog Content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title */}
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Enter your blog post title..."
              className="text-lg font-semibold mt-1"
            />
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="category">Category *</Label>
            <Select value={formData.category} onValueChange={(value) => handleChange('category', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(BLOG_CATEGORIES).map(([key, category]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center space-x-2">
                      <span>{category.icon}</span>
                      <div>
                        <div className="font-medium">{category.name}</div>
                        <div className="text-xs text-gray-500">{category.description}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Excerpt */}
          <div>
            <Label htmlFor="excerpt">Brief Summary</Label>
            <Textarea
              id="excerpt"
              value={formData.excerpt}
              onChange={(e) => handleChange('excerpt', e.target.value)}
              placeholder="Write a brief summary of your blog post (this will appear in previews)..."
              rows={3}
              className="mt-1"
            />
          </div>

          {/* Content Editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="content">Content * (minimum 300 characters)</Label>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  {formData.content.length} characters
                </span>
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
                <Separator orientation="vertical" className="h-6" />
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
                <Separator orientation="vertical" className="h-6" />
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
                <Separator orientation="vertical" className="h-6" />
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
              </div>
            )}

            {/* Content Area */}
            {contentPreview ? (
              <div className="min-h-[300px] p-4 border border-gray-200 rounded-b-md bg-white prose max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {formData.content}
                </ReactMarkdown>
              </div>
            ) : (
              <Textarea
                ref={contentRef}
                id="content"
                value={formData.content}
                onChange={(e) => handleChange('content', e.target.value)}
                placeholder="Write your blog content here... Use the toolbar above for formatting."
                rows={15}
                className="border-t-0 rounded-t-none focus:ring-0 focus:border-gray-200"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Images */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-green-600" />
            Images
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Featured Image */}
          <div>
            <Label>Featured Image (Optional)</Label>
            <div className="mt-2">
              {formData.featuredImage ? (
                <div className="relative inline-block">
                  <Image
                    src={formData.featuredImage}
                    alt="Featured image"
                    width={200}
                    height={120}
                    className="rounded-lg object-cover"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleChange('featuredImage', '')}
                    className="absolute -top-2 -right-2 h-6 w-6 p-0 bg-red-500 hover:bg-red-600 text-white rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFeaturedImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={imageUploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {imageUploading ? 'Uploading...' : 'Upload Featured Image'}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Additional Images */}
          <div>
            <Label>Additional Images (Maximum 3)</Label>
            <div className="mt-2 space-y-3">
              {formData.images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {formData.images.map((url, index) => (
                    <div key={index} className="relative">
                      <Image
                        src={url}
                        alt={`Additional image ${index + 1}`}
                        width={150}
                        height={100}
                        className="rounded-lg object-cover w-full h-24"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 h-6 w-6 p-0 bg-red-500 hover:bg-red-600 text-white rounded-full"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              {formData.images.length < 3 && (
                <div>
                  <input
                    type="file"
                    onChange={handleAdditionalImagesUpload}
                    accept="image/*"
                    multiple
                    className="hidden"
                    id="additional-images"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('additional-images')?.click()}
                    disabled={imageUploading}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {imageUploading ? 'Uploading...' : 'Add Images'}
                  </Button>
                  <p className="text-xs text-gray-500 mt-1">
                    {3 - formData.images.length} more images can be added
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tags and Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tags */}
          <div>
            <Label>Tags (Optional)</Label>
            <div className="mt-2 space-y-2">
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-sm">
                      {tag}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTag(tag)}
                        className="ml-1 h-4 w-4 p-0 hover:bg-transparent"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
              
              <div className="flex space-x-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <Button type="button" onClick={addTag} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Submission Notes */}
          <div>
            <Label htmlFor="submissionNotes">Additional Notes (Optional)</Label>
            <Textarea
              id="submissionNotes"
              value={formData.submissionNotes}
              onChange={(e) => handleChange('submissionNotes', e.target.value)}
              placeholder="Any additional notes for our editorial team..."
              rows={3}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleSubmit}
          disabled={loading}
          size="lg"
          className="bg-emerald-600 hover:bg-emerald-700 px-8"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Submitting...
            </>
          ) : (
            'Submit Blog Post'
          )}
        </Button>
      </div>
    </div>
  );
}