"use client";

import React from "react";
import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowRight, Loader2, Search, Bot, ChevronDown, ChevronRight, Database, Globe, Mail, MessageSquare, User, RotateCcw, AlertCircle, Copy, Send, Plus, X, Download, Eye, Sun, Moon, Leaf } from "lucide-react";


type EventMsg = {
  type: "status" | "tool_start" | "tool_result" | "final" | "error" | "info" | "image_uploaded" | "image_error" | "vision_analysis" | "validation_error" | "image_linked" | "completion" | "skeleton";
  message?: string;
  name?: string;
  args?: any;
  output?: any;
  thread_id?: string;
  final?: boolean;
  filename?: string;
  url?: string;
  index?: number;
  images?: string[];
  analysis?: string;
  vision_analysis?: boolean;
  uploaded_images?: string[];
  images_processed?: number;
  code?: string;
  upload_endpoint?: string;
};

type ConnectionErrorDetails = {
  kind?: "timeout" | "network" | "parse" | "backend" | "close";
  backendMessage?: string;
  closeEvent?: CloseEvent;
  status?: number;
  error?: unknown;
};

type SendOptions = {
  reuseAssistantId?: string;
  suppressUserMessage?: boolean;
  forcedImageUrls?: string[];
};

type UploadReadyResponse = {
  success: boolean;
  ready_for_analysis: boolean;
  upload_batch_id: string;
  uploaded_images?: Array<{
    filename?: string;
    url?: string;
    public_id?: string;
    bytes?: number;
    width?: number;
    height?: number;
  }>;
  failed_images?: Array<{
    filename?: string;
    error?: string;
  }>;
  upload_info?: any;
  frontend_event?: string;
  next_step?: any;
};

type UploadReadyResult = {
  urls: string[];
  uploadedCount: number;
  failedCount: number;
};

type ChatMessage = {
  id: string;
  type: "user" | "assistant" | "error";
  content: string;
  tools?: ToolExecution[];
  isStreaming?: boolean;
  timestamp: Date;
  canRetry?: boolean;
  originalUserMessage?: string;
  images?: string[]; // Add images to chat messages
  retryCount?: number; // Track how many times this message has been retried
  originalMessageId?: string; // Link to the original message this is a retry of
  retryHistory?: {
    attempt: number;
    timestamp: Date;
    tools?: ToolExecution[];
    images?: string[];
  }[]; // Track history of retry attempts
};

type ToolExecution = {
  name: string;
  args: any;
  result?: any;
  isRunning?: boolean;
  expanded?: boolean;
  retryAttempt?: number; // Which retry attempt this tool execution is from
  metadata?: {
    search_id?: number;
    processing_time?: number;
    relevance_score?: number;
    results_count?: number;
  };
};

type ConversationHistory = {
  thread_id: string;
  title?: string;
  summary?: string;
  message_count?: number;
  last_activity?: string;
  topics?: string[];
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: string;
    metadata?: any;
    images?: Array<{
      id: string;
      url: string;
      filename: string;
      size?: number;
      mime_type?: string;
      width?: number;
      height?: number;
      cloudinary_public_id?: string;
      upload_folder?: string;
      analysis?: any;
      created_at?: string;
      is_processed?: boolean;
    }>;
    search_links?: Array<{
      id: string;
      search_type: "web_search" | "rag_search";
      query: string;
      results: any;
      relevance_score?: number;
      search_influence?: any;
      created_at?: string;
      metadata?: any;
    }>;
  }>;
  search_history?: Array<{
    id: string;
    search_type: "web_search" | "rag_search";
    query: string;
    results: any;
    result_count?: number;
    relevance_score?: number;
    created_at?: string;
    metadata?: any;
  }>;
  thread_context?: Array<{
    id: string;
    context_type: string;
    content: string;
    relevance_score?: number;
    metadata?: any;
    created_at?: string;
    last_used?: string;
    expires_at?: string;
  }>;
};

interface SelectedImage {
  file: File | null;
  preview: string;
  id: string;
  isRetry?: boolean; // Flag to indicate this is a retry image
  uploadStatus?: "pending" | "uploading" | "uploaded" | "failed";
  uploadedUrl?: string;
  uploadError?: string;
  uploadAttempts?: number;
}

export default function ChatPage() {
  const [message, setMessage] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [threadId, setThreadId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [hideHeader, setHideHeader] = useState(false);
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const currentToolsRef = useRef<ToolExecution[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const removedImageIdsRef = useRef<Set<string>>(new Set());
  const autoRetryCountRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedTheme = window.localStorage.getItem("chat_theme");
    if (savedTheme === "light") {
      setIsDarkMode(false);
      return;
    }
    if (savedTheme === "dark") {
      setIsDarkMode(true);
      return;
    }
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDarkMode(prefersDark);
  }, []);
  

  useEffect(() => {
    // Add global CSS for hiding scrollbars and enhanced tool display
    const style = document.createElement('style');
    style.textContent = `
      .hide-scrollbar {
        -ms-overflow-style: none;  /* Internet Explorer 10+ */
        scrollbar-width: none;  /* Firefox */
      }
      .hide-scrollbar::-webkit-scrollbar {
        display: none;  /* Safari and Chrome */
      }
      .line-clamp-3 {
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      @keyframes shimmer {
        0% { background-position: -200px 0; }
        100% { background-position: calc(200px + 100%) 0; }
      }
      .tool-shimmer {
        background: linear-gradient(
          90deg,
          transparent,
          rgba(255, 255, 255, 0.1),
          transparent
        );
        background-size: 200px 100%;
        animation: shimmer 2s infinite;
      }
      .chat-shell {
        position: relative;
      }
      .chat-shell::before {
        content: "";
        position: absolute;
        inset: 0;
        background-image: url('/images/chatbot_image.png');
        background-size: cover;
        background-position: center;
        opacity: 0.08;
        pointer-events: none;
      }
      .chat-shell::after {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: radial-gradient(circle at 15% 20%, rgba(59, 89, 59, 0.22), transparent 42%),
                    radial-gradient(circle at 85% 80%, rgba(88, 120, 88, 0.2), transparent 48%);
      }
      .chat-shell.chat-dark {
        background: linear-gradient(155deg, #0f1412 0%, #151f19 45%, #1d2a22 100%);
      }
      .chat-shell.chat-light {
        background: linear-gradient(155deg, #f7f3ea 0%, #f0ebdd 55%, #e6e1d2 100%);
        color: #2f3a2f;
      }
      .chat-header,
      .chat-input-shell {
        backdrop-filter: blur(18px) saturate(140%);
        -webkit-backdrop-filter: blur(18px) saturate(140%);
      }
      .chat-header {
        box-shadow:
          0 8px 18px rgba(8, 12, 10, 0.18),
          inset 0 1px 0 rgba(255, 255, 255, 0.05);
      }
      .chat-dark .chat-header,
      .chat-dark .chat-input-shell {
        background: rgba(14, 20, 16, 0.72);
        border-color: rgba(108, 130, 112, 0.28);
      }
      .chat-light .chat-header,
      .chat-light .chat-input-shell {
        background: rgba(252, 250, 244, 0.86);
        border-color: rgba(122, 132, 113, 0.2);
      }
      .chat-dark .chat-title {
        color: #e8efe8;
      }
      .chat-light .chat-title {
        color: #263127;
      }
      .chat-dark .chat-subtitle {
        color: rgba(214, 226, 214, 0.72);
      }
      .chat-light .chat-subtitle {
        color: rgba(48, 60, 48, 0.72);
      }
      .chat-theme-btn,
      .chat-cta-btn {
        border: 1px solid transparent;
      }
      .chat-dark .chat-theme-btn,
      .chat-dark .chat-cta-btn {
        background: rgba(36, 48, 39, 0.72);
        border-color: rgba(121, 143, 124, 0.42);
        color: #d8e6d8;
      }
      .chat-light .chat-theme-btn,
      .chat-light .chat-cta-btn {
        background: rgba(255, 255, 255, 0.78);
        border-color: rgba(130, 140, 120, 0.35);
        color: #2e3a2f;
      }
      .chat-dark .assistant-surface {
        background: transparent;
        border: 1px solid transparent;
        color: #e6eee6;
      }
      .chat-light .assistant-surface {
        background: transparent;
        border: 1px solid transparent;
        color: #263126;
      }
      .chat-light .assistant-surface,
      .chat-light .assistant-surface * {
        color: #2f392f !important;
      }
      .chat-light .assistant-surface a {
        color: #2f6b3e !important;
      }
      .chat-light .assistant-surface code {
        color: #1f2b22 !important;
      }
      .chat-dark .user-surface {
        background: linear-gradient(135deg, #3a6242 0%, #4a744f 100%);
      }
      .chat-light .user-surface {
        background: linear-gradient(135deg, #446a48 0%, #57805c 100%);
      }
      .chat-dark .tool-card,
      .chat-dark .tool-body,
      .chat-dark .tool-panel {
        background: rgba(20, 27, 23, 0.66) !important;
        border-color: rgba(110, 124, 110, 0.2) !important;
      }
      .chat-light .tool-card,
      .chat-light .tool-body,
      .chat-light .tool-panel {
        background: rgba(255, 255, 255, 0.82) !important;
        border-color: rgba(124, 132, 112, 0.14) !important;
      }
      .chat-light .tool-card {
        box-shadow: none !important;
      }
      .chat-dark .tool-text {
        color: #cddacb !important;
      }
      .chat-light .tool-text {
        color: #1f2a1f !important;
      }
      .chat-light .tool-card,
      .chat-light .tool-body,
      .chat-light .tool-panel {
        color: #2f392f !important;
      }
      .chat-light .tool-body svg,
      .chat-light .tool-panel svg {
        color: #2a332a !important;
      }
      .chat-light .tool-body .text-white\/65,
      .chat-light .tool-body .text-white\/70 {
        color: rgba(47, 57, 47, 0.72) !important;
      }
      .chat-light .tool-panel .text-white\/90 {
        color: rgba(47, 57, 47, 0.88) !important;
      }
      .chat-light .tool-panel .text-white\/80 {
        color: rgba(47, 57, 47, 0.82) !important;
      }
      .chat-light .tool-panel .text-white\/70 {
        color: rgba(47, 57, 47, 0.72) !important;
      }
      .chat-light .tool-panel .text-white\/60 {
        color: rgba(47, 57, 47, 0.62) !important;
      }
      .chat-light .tool-panel .text-white\/55 {
        color: rgba(47, 57, 47, 0.55) !important;
      }
      .chat-light .tool-panel .text-white\/50 {
        color: rgba(47, 57, 47, 0.5) !important;
      }
      .chat-light .tool-panel {
        background: rgba(248, 245, 236, 0.92) !important;
      }
      .chat-light .tool-panel,
      .chat-light .tool-panel * {
        color: #1f2a1f !important;
      }
      .chat-light .tool-panel a {
        color: #2f6b3e !important;
      }
      .chat-light .tool-panel .text-emerald-200,
      .chat-light .tool-panel .text-emerald-200\/90,
      .chat-light .tool-panel .text-emerald-300,
      .chat-light .tool-panel .text-stone-200,
      .chat-light .tool-panel .text-orange-300,
      .chat-light .tool-panel .text-amber-200,
      .chat-light .tool-panel .text-amber-300 {
        color: #2f392f !important;
      }
      .chat-dark .chat-input-field {
        background: rgba(13, 18, 15, 0.55);
        border-color: rgba(110, 126, 110, 0.28);
      }
      .chat-light .chat-input-field {
        background: rgba(255, 255, 255, 0.92);
        border-color: rgba(120, 130, 112, 0.26);
      }
      .chat-dark .chat-input-btn {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(120, 130, 112, 0.28);
        color: rgba(238, 244, 236, 0.8);
      }
      .chat-light .chat-input-btn {
        background: rgba(233, 237, 226, 0.9);
        border-color: rgba(120, 130, 112, 0.25);
        color: #2c362f;
      }
      .chat-light .chat-send-btn {
        background: #356646;
        color: #fefcf8;
      }
      .chat-light .chat-send-btn svg {
        color: #fefcf8;
      }
      .chat-light .chat-send-btn:disabled {
        background: rgba(120, 130, 112, 0.25);
        color: rgba(47, 57, 47, 0.45);
      }
      .chat-dark .chat-input-text {
        color: #eef3ee;
      }
      .chat-light .chat-input-text {
        color: #2c362f;
      }
      .chat-light .chat-input-text::placeholder {
        color: rgba(47, 57, 47, 0.55);
      }
      .chat-light .retain-white,
      .chat-light .retain-white * {
        color: #fefcf8 !important;
      }
      .chat-light .text-white,
      .chat-light .text-white\/90,
      .chat-light .text-white\/80,
      .chat-light .text-white\/70,
      .chat-light .text-white\/65,
      .chat-light .text-white\/60,
      .chat-light .text-white\/55,
      .chat-light .text-white\/50,
      .chat-light .text-white\/45,
      .chat-light .text-white\/40 {
        color: #2f392f !important;
      }
      .chat-light .border-white\/10,
      .chat-light .border-white\/20,
      .chat-light .border-white\/30 {
        border-color: rgba(120, 132, 112, 0.28) !important;
      }
      @media (max-width: 640px) {
        .chat-header {
          margin-top: 6px;
          padding-top: 6px;
          padding-bottom: 6px;
          border-radius: 999px;
        }
        .chat-header .chat-title {
          font-size: 11px;
          letter-spacing: 0.03em;
        }
      }
    `;
    document.head.appendChild(style);
    
    // Cleanup image previews on unmount
    return () => {
      document.head.removeChild(style);
      selectedImages.forEach(img => {
        if (img.preview.startsWith("blob:")) {
          URL.revokeObjectURL(img.preview);
        }
      });
    };
  }, [selectedImages]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Get thread_id from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const urlThreadId = urlParams.get('thread_id');
    
    // Get saved thread_id from localStorage
    const savedThreadId = window.localStorage.getItem("thread_id");
    
    // Prefer URL thread_id over saved one
    const finalThreadId = urlThreadId || savedThreadId;
    
    if (finalThreadId && typeof finalThreadId === 'string') {
      setThreadId(finalThreadId);
      loadConversationHistory(finalThreadId);
      
      // Update localStorage and URL
      window.localStorage.setItem("thread_id", finalThreadId);
      if (!urlThreadId) {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('thread_id', finalThreadId);
        window.history.replaceState({}, '', newUrl.toString());
      }
    }
  }, []);

  // Image handling functions

  const fileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const isRemoteUrl = (value: string): boolean => /^https?:\/\//i.test(value);
  const isDataImageUrl = (value: string): boolean => /^data:image\//i.test(value);

  const dataUrlToFile = async (dataUrl: string, filenameBase: string): Promise<File> => {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const extension = (blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
    return new File([blob], `${filenameBase}.${extension}`, { type: blob.type || "image/jpeg" });
  };

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const updateSelectedImage = (id: string, patch: Partial<SelectedImage>) => {
    setSelectedImages((prev) => prev.map((img) => (img.id === id ? { ...img, ...patch } : img)));
  };

  const uploadSingleImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("files", file, file.name);
    formData.append("folder", "poultry_websocket");

    const response = await fetch("/api/proxy?path=/upload/images/ready", {
      method: "POST",
      body: formData,
    });

    const data: UploadReadyResponse = await response.json();
    if (!response.ok) {
      const detail = (data as any)?.detail || (data as any)?.error || "Upload request failed";
      throw new Error(String(detail));
    }

    const url = data.uploaded_images?.[0]?.url;
    if (!data.ready_for_analysis || !url) {
      const failed = (data.failed_images || [])
        .map((f) => `${f.filename || "file"}: ${f.error || "failed"}`)
        .join("; ");
      throw new Error(failed || "Image is not ready for analysis");
    }

    return url;
  };

  const uploadImageWithRetry = async (imageId: string, file: File, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      if (removedImageIdsRef.current.has(imageId)) {
        return;
      }

      try {
        updateSelectedImage(imageId, {
          uploadStatus: "uploading",
          uploadAttempts: attempt,
          uploadError: undefined,
        });

        const uploadedUrl = await uploadSingleImage(file);
        if (removedImageIdsRef.current.has(imageId)) {
          return;
        }

        updateSelectedImage(imageId, {
          uploadStatus: "uploaded",
          uploadedUrl,
          uploadError: undefined,
        });
        return;
      } catch (error: any) {
        if (attempt >= maxRetries) {
          updateSelectedImage(imageId, {
            uploadStatus: "failed",
            uploadError: error?.message || "Upload failed",
            uploadAttempts: attempt,
          });
          return;
        }

        const backoffMs = Math.min(400 * (2 ** (attempt - 1)), 2000);
        await delay(backoffMs);
      }
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter((file: File) => file.type.startsWith('image/'));

    Promise.all(
      imageFiles.map(async (file: File) => {
        const dataURL = await fileToDataURL(file);
        const id = crypto.randomUUID();
        return {
          file,
          preview: dataURL,
          id,
          uploadStatus: "pending" as const,
          uploadAttempts: 0,
        };
      })
    )
      .then((newImages: SelectedImage[]) => {
        setSelectedImages((prev) => [...prev, ...newImages]);
        newImages.forEach((img) => {
          if (img.file) {
            void uploadImageWithRetry(img.id, img.file, 3);
          }
        });
      })
      .catch((error) => {
        console.error("Error processing images:", error);
      });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Helper function to clean image URLs from message content
  const cleanImageUrlsFromContent = (content: string): string => {
    if (!content) return content;
    
    let cleaned = content;
    
    // Remove cloudinary URLs
    cleaned = cleaned.replace(/https:\/\/res\.cloudinary\.com\/[^\s]+/g, '').trim();
    
    // Remove "Image X URL:" patterns
    cleaned = cleaned.replace(/Image \d+ URL:\s*/g, '');
    
    // Remove "Please analyze these images" patterns that might include URLs
    cleaned = cleaned.replace(/Please analyze these images in the context of poultry farming:\s*/g, '');
    
    // Remove standalone URLs that might be image references
    cleaned = cleaned.replace(/^https?:\/\/[^\s]+$/gm, '');
    
    // Clean up extra whitespace
    cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
    
    return cleaned;
  };

  const extractImageUrlsFromContent = (content: string): string[] => {
    if (!content) return [];
    const urls = new Set<string>();

    const labeledMatches: string[] = content.match(/Image\s+\d+\s+URL:\s*(https?:\/\/\S+)/gi) || [];
    labeledMatches.forEach((match) => {
      const urlMatch = match.match(/https?:\/\/\S+/i);
      if (urlMatch?.[0]) {
        urls.add(urlMatch[0].replace(/[)\],.]+$/, ""));
      }
    });

    const genericMatches: string[] = content.match(/https?:\/\/\S+/gi) || [];
    genericMatches.forEach((url) => {
      const cleaned = url.replace(/[)\],.]+$/, "");
      if (cleaned.includes("cloudinary") || /\.(png|jpe?g|webp|gif)$/i.test(cleaned)) {
        urls.add(cleaned);
      }
    });

    return Array.from(urls);
  };

  const removeImage = (id: string) => {
    removedImageIdsRef.current.add(id);
    setSelectedImages(prev => prev.filter(i => i.id !== id));
  };

  const retryImageUpload = (id: string) => {
    const target = selectedImages.find((img) => img.id === id);
    if (!target?.file) {
      return;
    }
    removedImageIdsRef.current.delete(id);
    void uploadImageWithRetry(id, target.file, 3);
  };

  useEffect(() => {
    const hasUploading = selectedImages.some((img) => img.uploadStatus === "uploading" || img.uploadStatus === "pending");
    setIsUploadingImages(hasUploading);
  }, [selectedImages]);

  const loadConversationHistory = async (thread_id: string) => {
    if (!thread_id) return;
    
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`/api/proxy?path=/conversation/${encodeURIComponent(thread_id)}/history`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        // console.log('📋 Conversation History Response:', data);
        
        // Support both backend response formats:
        // 1) { status: "success", data: {...} }
        // 2) { success: true, conversation: {...} }
        const conversationData = data?.data || data?.conversation || null;
        // console.log('📋 Parsed Conversation Data:', conversationData);
        
        // Check if we have the messages array (new backend structure)
        if (conversationData && conversationData.messages && Array.isArray(conversationData.messages)) {
          const historyMessages: ChatMessage[] = conversationData.messages.map((msg: any, index: number) => {
            // Create tools array from search links if present
            const tools: ToolExecution[] = [];
            
            // For assistant messages, also check the previous user message for search links
            let searchLinksToProcess = msg.search_links || [];
            
            // If this is an assistant message, check if the previous message (user) has search links
            if (msg.role === "assistant" && index > 0) {
              const previousMsg = conversationData.messages[index - 1];
              if (previousMsg && previousMsg.role === "user" && previousMsg.search_links && Array.isArray(previousMsg.search_links)) {
                // Add the search links from the previous user message to this assistant message
                searchLinksToProcess = [...searchLinksToProcess, ...previousMsg.search_links];
                // console.log(`🔄 Moving search links from user message ${previousMsg.id} to assistant message ${msg.id}`);
              }
            }
            
            if (searchLinksToProcess && Array.isArray(searchLinksToProcess) && searchLinksToProcess.length > 0) {
              // console.log(`🔍 Processing search links for message ${msg.id} (${msg.role}):`, searchLinksToProcess);
              searchLinksToProcess.forEach((searchLink: any) => {
                // Support both web_search and rag_search
                const toolName = searchLink.search_type === "web_search" ? "web_search" : 
                                searchLink.search_type === "rag_search" ? "rag_search" : "document_search";
                // Use results_data field from backend, fallback to results for compatibility
                const searchResults = searchLink.results_data || searchLink.results;
                // console.log(`🔍 Adding tool: ${toolName} with ${searchResults?.length || 0} results`);
                tools.push({
                  name: toolName,
                  args: { query: searchLink.query },
                  result: searchResults,
                  isRunning: false,
                  expanded: false,
                  metadata: {
                    search_id: searchLink.id,
                    processing_time: searchLink.processing_time,
                    relevance_score: searchLink.relevance_score,
                    results_count: searchLink.results_count
                  }
                });
              });
            }

            // Also include explicitly persisted tool executions from message metadata.
            const metadataToolExecutions = msg?.metadata?.tool_executions;
            if (Array.isArray(metadataToolExecutions) && metadataToolExecutions.length > 0) {
              metadataToolExecutions.forEach((toolExec: any) => {
                if (!toolExec || !toolExec.name) {
                  return;
                }

                const alreadyExists = tools.some((t) =>
                  t.name === toolExec.name &&
                  JSON.stringify(t.args || {}) === JSON.stringify(toolExec.args || {})
                );

                if (!alreadyExists) {
                  tools.push({
                    name: String(toolExec.name),
                    args: toolExec.args || {},
                    result: toolExec.result,
                    isRunning: false,
                    expanded: false,
                  });
                }
              });
            }
            
            // Clean image URLs from content since they should be displayed as images, not text
            let cleanContent = cleanImageUrlsFromContent(msg.content || "");
            
            // Debug: Log image data for this message
            // if (msg.images && msg.images.length > 0) {
            //   console.log(`📸 Message ${msg.id} has ${msg.images.length} images:`, msg.images);
            // }
            
            const processedImages = msg.images?.map((img: any) => {
              // Handle both URL string and image object formats
              if (typeof img === 'string') {
                // console.log('📸 Processing string image:', img);
                return img; // Already a URL
              } else if (img && img.url) {
                // console.log('📸 Processing image object:', img);
                return img.url; // Image object with URL property
              } else {
                // console.log('📸 Invalid image data:', img);
                return null; // Invalid image data
              }
            }).filter(Boolean) || []; // Remove null values

            const extractedImages = extractImageUrlsFromContent(msg.content || "");
            const toolImageUrls = (metadataToolExecutions || []).flatMap((toolExec: any) => {
              const urls: string[] = [];
              const toolUrl = toolExec?.args?.image_url;
              if (typeof toolUrl === "string" && toolUrl.length > 0) {
                urls.push(toolUrl);
              }
              if (typeof toolExec?.result === "string") {
                urls.push(...extractImageUrlsFromContent(toolExec.result));
              }
              return urls;
            });

            const mergedImages = Array.from(new Set([
              ...processedImages,
              ...extractedImages,
              ...toolImageUrls,
            ].filter(Boolean)));
            
            // console.log(`📸 Final processed images for message ${msg.id}:`, processedImages);
            
            return {
              id: msg.id || `history-${index}-${Date.now()}`,
              type: msg.role === "user" ? "user" : "assistant",
              content: cleanContent,
              timestamp: new Date(msg.timestamp || Date.now()),
              tools: tools,
              isStreaming: false,
              images: mergedImages,
            };
          });
          
          // console.log('📋 Converted History Messages:', historyMessages);
          setMessages(historyMessages);
          
          // Log additional conversation metadata
          if (conversationData.summary) {
            // console.log('📋 Conversation Summary:', conversationData.summary);
          }
          if (conversationData.topics) {
            // console.log('📋 Recent Topics:', conversationData.topics);
          }
          if (conversationData.search_history) {
            // console.log('📋 Search History:', conversationData.search_history);
          }
          if (conversationData.thread_context) {
            // console.log('📋 Thread Context:', conversationData.thread_context);
          }
        } else {
          // console.warn('📋 No messages found in conversation history');
          setMessages([]);
        }
      } else {
        console.warn('Failed to load conversation history:', response.status);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
      setMessages([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const doNewConversation = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setMessages([]);
    setThreadId(undefined);
    setIsThinking(false);
    currentToolsRef.current = [];
    
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("thread_id");
      // Update URL to remove thread_id
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('thread_id');
      window.history.replaceState({}, '', newUrl.toString());
    }
  };

  const sendMessage = async (messageText?: string, retryContext?: {
    isRetry: boolean;
    retryCount: number;
    originalMessageId: string;
    originalImages: string[];
  }, sendOptions?: SendOptions) => {
    let rawText: string;
    if (typeof messageText === 'string') {
      rawText = messageText;
    } else if (messageText && typeof messageText === 'object' && 'target' in messageText) {
      rawText = message.trim();
    } else {
      rawText = message.trim();
    }
    
    const textToSend = typeof rawText === 'string' ? rawText : String(rawText);
    
    // console.log('📤 Sending message:', textToSend);
    // console.log('📤 Current thread ID:', threadId);
    // console.log('📤 Selected images:', selectedImages.length);
    
    const forcedImageUrls = sendOptions?.forcedImageUrls?.filter(Boolean) || [];
    const hasForcedImages = forcedImageUrls.length > 0;

    // Snapshot selected images for this send operation.
    const selectedImagesSnapshot = hasForcedImages ? [] : [...selectedImages];
    const hasSelectedImages = selectedImagesSnapshot.length > 0;

    if ((!textToSend && !hasSelectedImages && !hasForcedImages) || isThinking || isUploadingImages) {
      return;
    }

    const displayText = textToSend;

    if (selectedImagesSnapshot.length > 10) {
      alert("Maximum 10 images are allowed per request.");
      return;
    }

    const selectedImagePreviews = hasForcedImages
      ? forcedImageUrls
      : selectedImagesSnapshot.map((img) => img.uploadedUrl || img.preview);

    if (!hasForcedImages) {
      const notReadyImages = selectedImagesSnapshot.filter((img) => img.uploadStatus === "uploading" || img.uploadStatus === "pending");
      if (notReadyImages.length > 0) {
        return;
      }

      const failedImages = selectedImagesSnapshot.filter((img) => img.uploadStatus === "failed");
      if (failedImages.length > 0) {
        alert("Some images failed to upload. Retry or remove failed images before sending.");
        return;
      }
    }

    let retryImageUrls: string[] = [];
    let uploadedImageUrls: string[] = [];

    if (hasForcedImages) {
      retryImageUrls = forcedImageUrls;
    } else if (selectedImagesSnapshot.length > 0) {
      retryImageUrls = selectedImagesSnapshot
        .filter((img) => img.isRetry && isRemoteUrl(img.preview))
        .map((img) => img.preview);

      uploadedImageUrls = selectedImagesSnapshot
        .filter((img) => Boolean(img.uploadedUrl))
        .map((img) => img.uploadedUrl as string);
    }
    
    const shouldCreateUserMessage = !sendOptions?.suppressUserMessage;
    let userMessageId: string | undefined;
    if (shouldCreateUserMessage) {
      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        type: "user",
        content: displayText,
        timestamp: new Date(),
        images: selectedImagePreviews,
        retryCount: retryContext?.retryCount || 0,
        originalMessageId: retryContext?.originalMessageId || undefined,
      };

      // Log retry information
      if (retryContext?.isRetry) {
        console.log(`🔄 Creating retry message (attempt ${retryContext.retryCount}) with ${selectedImages.length} images`);
      }

      userMessageId = userMsg.id;
      setMessages(prev => [...prev, userMsg]);
    }
    
    // Clear input but keep the data URLs - they don't need cleanup
    if (shouldCreateUserMessage) {
      setMessage("");
      setSelectedImages([]);
    }
    setIsThinking(true);
    currentToolsRef.current = [];

    // Start assistant response
    const assistantId = sendOptions?.reuseAssistantId || (Date.now() + 1).toString();
    // console.log('🤖 Creating assistant message with ID:', assistantId);
    if (sendOptions?.reuseAssistantId) {
      setMessages(prev => prev.map(msg =>
        msg.id === assistantId
          ? { ...msg, type: "assistant", content: "", tools: [], isStreaming: true, timestamp: new Date() }
          : msg
      ));
    } else {
      setMessages(prev => [...prev, {
        id: assistantId,
        type: "assistant",
        content: "",
        tools: [],
        isStreaming: true,
        timestamp: new Date(),
      }]);
    }

    // Keep user message images synced with backend-ready URLs for reliable retries.
    const allImageUrlsForAnalysis = Array.from(new Set([...uploadedImageUrls, ...retryImageUrls]));
    if (allImageUrlsForAnalysis.length > 0 && userMessageId) {
      setMessages(prev => prev.map(msg =>
        msg.id === userMessageId
          ? { ...msg, images: allImageUrlsForAnalysis }
          : msg
      ));
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // console.log('🔌 Closing existing WebSocket connection');
      try { wsRef.current.close(); } catch {}
    }

    try {
      const qp = new URLSearchParams();
      if (threadId) qp.set("thread_id", threadId);
      // console.log('🔗 Fetching WebSocket URL with params:', qp.toString());
      const res = await fetch(`/api/soocket?${qp.toString()}`);
      let wsUrl = "";
      if (res.ok) {
        const data = await res.json();
        wsUrl = data?.url || "";
        // console.log('🔗 WebSocket URL resolved:', wsUrl);
      }

      if (!wsUrl) {
        throw new Error("Could not resolve WebSocket URL");
      }

      // console.log('🔌 Creating new WebSocket connection...');
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      let hasReceivedResponse = false;
      const responseTimeout = setTimeout(() => {
        if (!hasReceivedResponse) {
          ws.close();
          handleConnectionError(assistantId, textToSend, selectedImagePreviews, { kind: "timeout" });
        }
      }, 30000);

      ws.onopen = () => {
        const payload: any = { 
          message: typeof textToSend === 'string' ? textToSend : String(textToSend), 
          thread_id: typeof threadId === 'string' ? threadId : undefined
        };

        const allImageUrls = Array.from(new Set([...uploadedImageUrls, ...retryImageUrls]));
        
        if (allImageUrls.length > 0) {
          payload.existing_image_urls = allImageUrls;
          console.log('🔄 Retry payload with existing images:', {
            message: payload.message,
            existing_image_urls: allImageUrls,
            total_retry_images: allImageUrls.length
          });
        }
        
        // console.log('🔌 WebSocket Connected - Sending payload:', payload);
        ws.send(JSON.stringify(payload));
      };

      ws.onmessage = (ev) => {
        hasReceivedResponse = true;
        clearTimeout(responseTimeout);
        
        // console.log('📨 Raw WebSocket Message:', ev.data);
        
        try {
          const data: EventMsg = JSON.parse(ev.data);
          // console.log('📨 Parsed WebSocket Data:', data);
          // console.log('📨 Message Type:', data.type);
          
          if (data.thread_id && !threadId) {
            const cleanThreadId = typeof data.thread_id === 'string' ? data.thread_id : String(data.thread_id);
            // console.log('🆔 New Thread ID received:', cleanThreadId);
            setThreadId(cleanThreadId);
            if (typeof window !== "undefined") {
              window.localStorage.setItem("thread_id", cleanThreadId);
              // Update URL with new thread_id
              const newUrl = new URL(window.location.href);
              newUrl.searchParams.set('thread_id', cleanThreadId);
              window.history.replaceState({}, '', newUrl.toString());
            }
          }

          if (data.type === "status" && data.message) {
            // console.log('💬 Status Message:', data.message);
            // Enhanced streaming: handle real-time astream content updates
            const cleanedMessage = cleanImageUrlsFromContent(data.message || "");
            setMessages(prev => prev.map(msg => 
              msg.id === assistantId 
                ? { 
                    ...msg, 
                    content: cleanedMessage, 
                    isStreaming: true,
                    // Update timestamp to show activity
                    timestamp: new Date()
                  }
                : msg
            ));
          }

          if (data.type === "skeleton" && data.message) {
            const cleanedSkeleton = cleanImageUrlsFromContent(data.message || "");
            setMessages(prev => prev.map(msg =>
              msg.id === assistantId
                ? {
                    ...msg,
                    content: cleanedSkeleton,
                    isStreaming: true,
                    timestamp: new Date()
                  }
                : msg
            ));
          }

          if (data.type === "tool_start") {
            // console.log('🔧 Tool Start:', { name: data.name, args: data.args });
            const newTool: ToolExecution = {
              name: data.name || "Unknown Tool",
              args: data.args,
              isRunning: true,
              expanded: false,
            };
            currentToolsRef.current.push(newTool);
            setMessages(prev => prev.map(msg => 
              msg.id === assistantId 
                ? { ...msg, tools: [...currentToolsRef.current] }
                : msg
            ));
          }

          if (data.type === "tool_result") {
            // console.log('🔧 Tool Result:', { name: data.name, output: data.output });
            const toolIndex = currentToolsRef.current.findIndex(t => t.name === data.name && t.isRunning);
            if (toolIndex >= 0) {
              currentToolsRef.current[toolIndex] = {
                ...currentToolsRef.current[toolIndex],
                result: data.output,
                isRunning: false,
              };
              setMessages(prev => prev.map(msg => 
                msg.id === assistantId 
                  ? { ...msg, tools: [...currentToolsRef.current] }
                  : msg
              ));
            }
          }

          if (data.type === "final") {
            const finalContent = typeof data.message === 'string' ? data.message : String(data.message || "");
            const cleanedContent = cleanImageUrlsFromContent(finalContent);
            // console.log('✅ Final Message:', cleanedContent);
            setMessages(prev => prev.map(msg => 
              msg.id === assistantId 
                ? { ...msg, content: cleanedContent, isStreaming: false }
                : msg
            ));
            setIsThinking(false);
          }

          if (data.type === "image_uploaded") {
            // console.log('🖼️ Image uploaded:', data);
            setMessages(prev => prev.map(msg => 
              msg.id === assistantId 
                ? { 
                    ...msg, 
                    content: msg.content + `\n\n📸 Image uploaded: ${data.filename}`,
                    isStreaming: true 
                  }
                : msg
            ));
          }

          if (data.type === "image_linked") {
            setMessages(prev => prev.map(msg =>
              msg.id === assistantId
                ? {
                    ...msg,
                    content: `${msg.content}\n\n🔗 Image ready: ${data.filename || `image ${typeof data.index === "number" ? data.index + 1 : ""}`}`.trim(),
                    isStreaming: true,
                    timestamp: new Date()
                  }
                : msg
            ));
          }

          if (data.type === "vision_analysis") {
            // console.log('👁️ Vision analysis received:', data);
            setMessages(prev => prev.map(msg => 
              msg.id === assistantId 
                ? { 
                    ...msg, 
                    content: msg.content + `\n\n🔍 **Vision Analysis:**\n${data.analysis || data.message}`,
                    isStreaming: true 
                  }
                : msg
            ));
          }

          if (data.type === "error") {
            // console.error('❌ WebSocket Error Message:', data);
            handleConnectionError(assistantId, textToSend, selectedImagePreviews, {
              kind: "backend",
              backendMessage: typeof data.message === "string" ? data.message : undefined
            });
          }

          if (data.type === "validation_error") {
            const validationMessage = data.message || "Request validation failed.";
            setIsThinking(false);
            setMessages(prev => prev.map(msg =>
              msg.id === assistantId
                ? {
                    ...msg,
                    type: "error" as const,
                    content: validationMessage,
                    isStreaming: false,
                    canRetry: true,
                    originalUserMessage: textToSend,
                    images: selectedImagePreviews,
                    timestamp: new Date()
                  }
                : msg
            ));
          }

          if (data.type === "completion") {
            setIsThinking(false);
            setMessages(prev => prev.map(msg =>
              msg.id === assistantId && msg.isStreaming
                ? { ...msg, isStreaming: false, timestamp: new Date() }
                : msg
            ));
          }
        } catch (err) {
          // console.error("WebSocket message parsing error:", err);
          // console.error("Raw message that failed to parse:", ev.data);
          handleConnectionError(assistantId, textToSend, selectedImagePreviews, { kind: "parse", error: err });
        }
      };

      ws.onclose = (event) => {
        // console.log('🔌 WebSocket Closed:', { code: event.code, reason: event.reason });
        clearTimeout(responseTimeout);
        
        if (!hasReceivedResponse && event.code !== 1000) {
          // console.log('❌ WebSocket closed unexpectedly, handling as error');
          handleConnectionError(assistantId, textToSend, selectedImagePreviews, { kind: "close", closeEvent: event });
        } else {
          // console.log('✅ WebSocket closed normally');
          setIsThinking(false);
          setMessages(prev => prev.map(msg => 
            msg.id === assistantId && msg.isStreaming
              ? { ...msg, isStreaming: false }
              : msg
          ));
        }
      };

      ws.onerror = (error) => {
        // console.error('❌ WebSocket Error:', error);
        clearTimeout(responseTimeout);
        handleConnectionError(assistantId, textToSend, selectedImagePreviews, { kind: "network", error });
      };
    } catch (error) {
      handleConnectionError(assistantId, textToSend, selectedImagePreviews, { kind: "network", error });
    }
  };

  const buildErrorMessage = (details?: ConnectionErrorDetails): string => {
    const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;
    if (isOffline) {
      return "Offline detected. Restore connectivity, then retry.";
    }

    if (details?.backendMessage) {
      return `Server error: ${details.backendMessage}`;
    }

    if (details?.kind === "timeout") {
      return "Request timed out. Retry the request.";
    }

    if (details?.kind === "parse") {
      return "Invalid response received. Retry the request.";
    }

    if (details?.closeEvent) {
      const code = details.closeEvent.code;
      if (code === 1006) return "Connection interrupted. Retry the request.";
      if (code === 1011) return "Server error while processing the request. Retry the request.";
      if (code === 1001) return "Server closed the connection. Retry the request.";
      return `Connection closed (code ${code}). Retry the request.`;
    }

    if (details?.kind === "network") {
      return "Network error while contacting the service. Retry the request.";
    }

    return "Request could not be completed. Retry the request.";
  };

  const handleConnectionError = (
    assistantId: string,
    originalMessage: string,
    originalImages?: string[],
    details?: ConnectionErrorDetails
  ) => {
    // console.error('🚨 Handling connection error for assistant:', assistantId);
    const errorMessage = buildErrorMessage(details);
    const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;
    const retryCount = autoRetryCountRef.current[assistantId] || 0;

    const shouldAutoRetry = !isOffline && (
      details?.kind === "timeout" ||
      details?.kind === "network" ||
      (details?.kind === "close" && [1006, 1011, 1001].includes(details.closeEvent?.code || 0))
    );

    if (shouldAutoRetry && retryCount < 1) {
      autoRetryCountRef.current[assistantId] = retryCount + 1;
      setMessages(prev => prev.map(msg =>
        msg.id === assistantId
          ? { ...msg, type: "assistant", content: "Connection issue detected. Retrying once...", isStreaming: true, timestamp: new Date() }
          : msg
      ));

      setTimeout(() => {
        sendMessage(originalMessage, undefined, {
          reuseAssistantId: assistantId,
          suppressUserMessage: true,
          forcedImageUrls: originalImages
        });
      }, 800);
      return;
    }

    setIsThinking(false);
    setMessages(prev => prev.map(msg => {
      if (msg.id === assistantId) {
        return {
          ...msg,
          type: "error" as const,
          content: errorMessage,
          isStreaming: false,
          canRetry: true,
          originalUserMessage: originalMessage,
          images: originalImages, // Store original images for retry
          timestamp: new Date()
        };
      }
      return msg;
    }));
  };

  const retryMessage = useCallback(async (originalMessage: string, originalImages?: string[]) => {
    // console.log('🔄 retryMessage called with:', {
    //   message: originalMessage,
    //   originalImages: originalImages,
    //   imageCount: originalImages?.length || 0
    // });
    
    // Find if this is a retry of an existing message
    const existingMessageIndex = messages.findIndex(m => 
      m.type === "user" && m.content === originalMessage
    );
    
    let retryCount = 0;
    let originalMessageId = "";
    
    if (existingMessageIndex !== -1) {
      const existingMessage = messages[existingMessageIndex];
      retryCount = (existingMessage.retryCount || 0) + 1;
      originalMessageId = existingMessage.originalMessageId || existingMessage.id;
      
      // Update the existing message's retry count
      setMessages(prev => prev.map((msg, index) => 
        index === existingMessageIndex 
          ? { 
              ...msg, 
              retryCount,
              originalMessageId,
              timestamp: new Date() // Update timestamp for retry
            }
          : msg
      ));
      
      // console.log(`🔄 Retrying message (attempt ${retryCount}) - Original ID: ${originalMessageId}`);
    }
    
    // Set the message text first
    setMessage(originalMessage);
    
    // If we have original images, we need to populate selectedImages with them
    if (originalImages && originalImages.length > 0) {
      // Convert image refs into a backend-compatible retry payload:
      // - HTTP(S) URLs are reused as existing_image_urls
      // - data:image URLs are converted back to File so they can be re-uploaded first
      const retryImages: SelectedImage[] = await Promise.all(originalImages.map(async (url, index) => {
        const id = `retry-${Date.now()}-${index}`;

        if (isRemoteUrl(url)) {
          return {
            id,
            file: null,
            preview: url,
            isRetry: true
          };
        }

        if (isDataImageUrl(url)) {
          try {
            const file = await dataUrlToFile(url, `retry_image_${index + 1}`);
            return {
              id,
              file,
              preview: url,
              isRetry: false
            };
          } catch {
            return {
              id,
              file: null,
              preview: url,
              isRetry: true
            };
          }
        }

        return {
          id,
          file: null,
          preview: url,
          isRetry: true
        };
      }));
      setSelectedImages(retryImages);
      // console.log(`🖼️ Restored ${retryImages.length} images for retry`);
    } else {
      setSelectedImages([]);
    }
    
    // Store retry context for use in sendMessage
    const retryContext = {
      isRetry: true,
      retryCount,
      originalMessageId,
      originalImages: originalImages || []
    };
    
    // Use setTimeout to ensure state is updated before sending
    setTimeout(() => {
      sendMessage(undefined, retryContext);
    }, 10);
  }, [messages]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const toggleToolExpansion = (messageId: string, toolIndex: number) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId && msg.tools) {
        const newTools = [...msg.tools];
        newTools[toolIndex] = { ...newTools[toolIndex], expanded: !newTools[toolIndex].expanded };
        return { ...msg, tools: newTools };
      }
      return msg;
    }));
  };

  return (
    <div className={`chat-shell ${isDarkMode ? "chat-dark" : "chat-light"} min-h-screen relative overflow-hidden`}>
      <div className="relative z-10 flex flex-col h-screen">
        <div className={`chat-header sticky top-3 z-20 mt-3 border px-3 py-2 sm:px-4 sm:py-2.5 rounded-full w-[min(100%-1.5rem,48rem)] mx-auto transition-all duration-300 ${hideHeader ? "-translate-y-6 opacity-0 pointer-events-none" : "translate-y-0 opacity-100"}`}>
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="rounded-md p-1 sm:p-1.5 border border-white/20 bg-white/10 hidden sm:flex">
                <Leaf className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h1 className="chat-title text-sm font-semibold tracking-wide truncate">
                  <span className="hidden sm:inline">Poultry Market AI Assistant</span>
                  <span className="sm:hidden">Poultry AI</span>
                </h1>
                <div className="chat-subtitle text-[11px] truncate hidden sm:inline-flex items-center gap-2">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Ready
                  </span>
                  <span className="opacity-60">|</span>
                  <span className="truncate">{threadId ? `Thread: ${threadId.slice(0, 10)}...` : "New session"}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const next = !isDarkMode;
                  setIsDarkMode(next);
                  if (typeof window !== "undefined") {
                    window.localStorage.setItem("chat_theme", next ? "dark" : "light");
                  }
                }}
                className="chat-theme-btn px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-md text-[11px] sm:text-xs font-medium transition-colors"
                title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                <span className="inline-flex items-center gap-1.5">
                  {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                </span>
              </button>
              <button
                onClick={doNewConversation}
                className="chat-cta-btn px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-md text-[11px] sm:text-xs font-medium transition-colors"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">New Chat</span>
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Chat area - Full screen with floating input */}
        <div className="flex-1 overflow-hidden relative">
          <ChatArea 
            messages={messages} 
            onToggleTool={toggleToolExpansion} 
            isThinking={isThinking} 
            onRetry={retryMessage} 
            onCopy={copyToClipboard}
            isLoadingHistory={isLoadingHistory}
            onHeaderScrollDirection={(direction) => {
              if (direction === "up") {
                setHideHeader(true);
              } else {
                setHideHeader(false);
              }
            }}
          />
          
          {/* Floating input area - positioned absolutely */}
          <div className="absolute bottom-0 left-0 right-0 p-3 pointer-events-none">
            <div className="max-w-4xl mx-auto pointer-events-auto">
              <div className="chat-input-shell rounded-2xl border shadow-xl p-3">
                <ChatInput 
                  value={message} 
                  onChange={setMessage} 
                  onSend={sendMessage} 
                  disabled={isThinking}
                  isThinking={isThinking}
                  isUploadingImages={isUploadingImages}
                  selectedImages={selectedImages}
                  onImageSelect={handleFileSelect}
                  onImageRemove={removeImage}
                  onRetryImageUpload={retryImageUpload}
                  fileInputRef={fileInputRef}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatArea({ 
  messages, 
  onToggleTool, 
  isThinking, 
  onRetry, 
  onCopy,
  isLoadingHistory,
  onHeaderScrollDirection
}: { 
  messages: ChatMessage[]; 
  onToggleTool: (messageId: string, toolIndex: number) => void;
  isThinking: boolean;
  onRetry: (originalMessage: string, originalImages?: string[]) => void;
  onCopy: (text: string) => Promise<void>;
  isLoadingHistory: boolean;
  onHeaderScrollDirection?: (direction: "up" | "down") => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const lastScrollTopRef = useRef(0);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Check if user has scrolled up to show scroll-to-bottom button
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
      setShowScrollToBottom(!isNearBottom && messages.length > 0);

      const lastTop = lastScrollTopRef.current;
      if (scrollTop < lastTop - 6) {
        onHeaderScrollDirection?.("up");
      } else if (scrollTop > lastTop + 6) {
        onHeaderScrollDirection?.("down");
      }
      lastScrollTopRef.current = scrollTop;
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  if (isLoadingHistory) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-white/70">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading conversation...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <div 
        ref={scrollRef} 
        className="h-full overflow-y-auto hide-scrollbar pb-28"
        onScroll={handleScroll}
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="mb-8">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/40 to-stone-500/30 rounded-full blur-xl opacity-30"></div>
                <div className="relative bg-white/10 backdrop-blur-sm rounded-full p-6 border border-white/20">
                  <Bot className="w-10 h-10 text-white" />
                </div>
              </div>
            </div>
            <h2 className="text-3xl font-semibold text-white mb-4">How can I help you today?</h2>
            <p className="text-white/60 max-w-lg leading-relaxed text-lg">Ask me anything about poultry farming, market trends, disease management, or subscription services.</p>
          </div>
        )}

        <div className="px-4 py-3">
          {messages.map((msg) => (
            <div key={msg.id}>
              <MessageBubble 
                message={msg} 
                onToggleTool={(toolIndex) => onToggleTool(msg.id, toolIndex)}
                onRetry={onRetry}
                onCopy={onCopy}
              />
            </div>
          ))}

          {isThinking && (
            <div className="py-3 flex justify-start">
              {/* <div className="flex items-start gap-4 max-w-[80%]">
                <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 pt-1">
                  <div className="flex items-center gap-3 text-white/60">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-sm">AI thinking ...</span>
                  </div>
                </div>
              </div> */}
            </div>
          )}
        </div>
      </div>

      {/* Floating scroll to bottom button */}
      {showScrollToBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-36 right-5 w-10 h-10 bg-black/20 backdrop-blur-md border border-white/20 rounded-full shadow-lg hover:bg-black/30 transition-all duration-300 flex items-center justify-center group z-10"
          title="Scroll to bottom"
        >
          <ChevronDown className="w-5 h-5 text-white/80 relative z-10" />
        </button>
      )}
    </div>
  );
}

function MessageBubble({ message, onToggleTool, onRetry, onCopy }: { 
  message: ChatMessage; 
  onToggleTool: (toolIndex: number) => void;
  onRetry: (originalMessage: string, originalImages?: string[]) => void;
  onCopy: (text: string) => Promise<void>;
}) {
  const [displayedContent, setDisplayedContent] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const isUser = message.type === "user";
  const isError = message.type === "error";
  const hasTools = message.tools && message.tools.length > 0;
  
  // Debug logging for tools
  if (message.tools && message.tools.length > 0) {
    console.log(`🔧 Message ${message.id} (${message.type}) has ${message.tools.length} tools:`, message.tools);
  }

  // Enhanced streaming text effect for assistant messages - optimized for astream
  useEffect(() => {
    if (!isUser && message.content && message.isStreaming) {
      // For streaming messages, check if content has significantly changed
      const contentChanged = displayedContent !== message.content;
      
      if (contentChanged) {
        // If the content is much longer than displayed (astream chunk received)
        if (message.content.length > displayedContent.length + 5) {
          // Fast catch-up for large chunks from astream
          setIsTyping(true);
          let index = displayedContent.length;
          const interval = setInterval(() => {
            if (index < message.content.length) {
              // Faster streaming for astream chunks
              const chunkSize = Math.min(3, message.content.length - index);
              setDisplayedContent(message.content.slice(0, index + chunkSize));
              index += chunkSize;
            } else {
              setIsTyping(false);
              clearInterval(interval);
            }
          }, 15); // Faster for astream
          
          return () => clearInterval(interval);
        } else if (message.content.length > displayedContent.length) {
          // Normal character-by-character for small updates
          setIsTyping(true);
          let index = displayedContent.length;
          const interval = setInterval(() => {
            if (index < message.content.length) {
              setDisplayedContent(message.content.slice(0, index + 1));
              index++;
            } else {
              setIsTyping(false);
              clearInterval(interval);
            }
          }, 20); // Normal speed for character updates
          
          return () => clearInterval(interval);
        }
      }
    } else {
      // Non-streaming or user messages
      setDisplayedContent(message.content);
      setIsTyping(false);
    }
  }, [message.content, message.isStreaming, isUser, displayedContent]);

  return (
    <div className={`py-2.5 group ${isUser ? 'flex justify-end' : 'flex justify-start'}`}>
      <div className={`flex items-start gap-3 max-w-[76%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser 
            ? 'user-surface text-white shadow-md' 
            : isError 
              ? 'bg-red-500/20 backdrop-blur-sm border border-red-500/30' 
              : 'assistant-surface'
        }`}>
          {isUser ? (
            <User className="w-4 h-4" />
          ) : isError ? (
            <AlertCircle className="w-4 h-4 text-red-400" />
          ) : (
            <Bot className="w-4 h-4 text-white" />
          )}
        </div>

        {/* Content */}
        <div className={`flex-1 min-w-0 ${isUser ? 'text-right' : 'text-left'}`}>
          {/* Images (if any) */}
          {message.images && message.images.length > 0 && (
            <div className={`mb-3 ${isUser ? 'flex flex-wrap gap-3 justify-end' : 'flex flex-wrap gap-3'}`}>
              {message.images.map((imageUrl, idx) => (
                isUser ? (
                  <UserImagePreview 
                    key={`user-img-${idx}`}
                    imageUrl={imageUrl} 
                    alt={`Image ${idx + 1}`}
                    index={idx + 1}
                  />
                ) : (
                  <ImagePreview 
                    key={`ai-img-${idx}`}
                    imageUrl={imageUrl} 
                    alt={`Image ${idx + 1}`}
                    index={idx + 1}
                  />
                )
              ))}
            </div>
          )}

          {/* Message content with different styling for user vs bot */}
          {(displayedContent || message.content) && (
            <div className={`leading-relaxed ${
              isUser 
                ? 'user-surface text-white rounded-2xl rounded-tr-md px-3.5 py-2.5 shadow-md text-sm' 
                : 'assistant-surface text-sm'
            }`}>
              {isUser ? (
                // User messages: simple text without markdown
                <div className="text-white">{message.content}</div>
              ) : (
                // Bot messages: full markdown with streaming effect
                <ReactMarkdown
                  components={{
                    // Clean, no-container rendering for bot messages
                    p: ({ children }) => <p className="mb-3 last:mb-0 text-white/90 leading-relaxed">{children}</p>,
                    h1: ({ children }) => <h1 className="text-xl font-semibold mb-3 text-white">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-lg font-semibold mb-2 text-white">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-base font-semibold mb-2 text-white">{children}</h3>,
                    ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1 text-white/90">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1 text-white/90">{children}</ol>,
                    li: ({ children }) => <li className="text-white/90">{children}</li>,
                    code: ({ children, node, ...props }) => 
                      (node && (node as any).inline)
                        ? <code className="bg-white/10 px-2 py-1 rounded text-sm font-mono text-emerald-200 backdrop-blur-sm" {...props}>{children}</code>
                        : <code className="block bg-white/5 p-4 rounded-lg text-sm font-mono text-white/90 overflow-x-auto backdrop-blur-sm border border-white/10 mb-4" {...props}>{children}</code>,
                    pre: ({ children }) => <pre className="bg-white/5 p-4 rounded-lg overflow-x-auto mb-4 backdrop-blur-sm border border-white/10">{children}</pre>,
                    blockquote: ({ children }) => <blockquote className="border-l-4 border-emerald-500/40 pl-4 italic text-white/70 mb-4 backdrop-blur-sm">{children}</blockquote>,
                    strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                    em: ({ children }) => <em className="italic text-white/90">{children}</em>,
                    a: ({ children, href }) => (
                      <a 
                        href={href} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-emerald-300 hover:text-emerald-200 underline transition-colors"
                      >
                        {children}
                      </a>
                    ),
                  }}
                >
                  {message.isStreaming ? displayedContent : message.content}
                </ReactMarkdown>
              )}
              {/* Typing cursor for streaming (only for bot messages) */}
              {!isUser && isTyping && <span className="inline-block w-2 h-5 bg-white/70 ml-1 animate-pulse"></span>}
            </div>
          )}

          {/* Enhanced streaming indicator for empty content (only for bot messages) */}
          {!isUser && message.isStreaming && !displayedContent && !message.content && (
            <div className="flex items-center gap-2 text-white/60 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-emerald-400/60 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-stone-400/70 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-emerald-300/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="text-sm">Sending...</span>
            </div>
          )}

          {/* Tools (only for bot messages) */}
          {!isUser && hasTools && (
            <div className="mt-4 space-y-3">
              {/* Group tools by retry attempt if message has retries */}
              {(() => {
                // Check if any tools have retry attempt info
                const hasRetryInfo = message.tools?.some(tool => tool.retryAttempt !== undefined);
                
                if (hasRetryInfo) {
                  // Group tools by retry attempt
                  const groupedTools = message.tools!.reduce((groups, tool, index) => {
                    const attempt = tool.retryAttempt || 1;
                    if (!groups[attempt]) groups[attempt] = [];
                    groups[attempt].push({ tool, index });
                    return groups;
                  }, {} as Record<number, { tool: ToolExecution; index: number }[]>);
                  
                  return Object.entries(groupedTools)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([attempt, toolsGroup]) => (
                      <div key={`attempt-${attempt}`} className="space-y-2">
                        {Number(attempt) > 1 && (
                          <div className="text-xs text-white/50 border-t border-white/10 pt-2">
                            Retry attempt #{attempt}
                          </div>
                        )}
                        {toolsGroup.map(({ tool, index }) => (
                          <div key={`${tool.name}-${index}-${attempt}`}>
                            <ToolCallDisplay 
                              tool={tool}
                              onToggle={() => onToggleTool(index)}
                              retryAttempt={Number(attempt)}
                            />
                          </div>
                        ))}
                      </div>
                    ));
                } else {
                  // Regular display without retry grouping
                  return message.tools!.map((tool, index) => (
                    <div key={`${tool.name}-${index}`}>
                      <ToolCallDisplay 
                        tool={tool}
                        onToggle={() => onToggleTool(index)}
                        retryAttempt={message.retryCount || 1}
                      />
                    </div>
                  ));
                }
              })()}
            </div>
          )}

          {/* Retry button for error messages */}
          {isError && message.canRetry && message.originalUserMessage !== undefined && (
            <div className="mt-3">
              <button
                onClick={() => {
                  // Use the images stored in the error message, or fall back to finding the original
                  const imagesToRetry = message.images || [];
                  console.log(`🔄 Retrying error message with ${imagesToRetry.length} images`);
                  onRetry(message.originalUserMessage || "", imagesToRetry);
                }}
                className="inline-flex items-center gap-2 text-xs text-amber-100/80 hover:text-amber-100 underline decoration-amber-200/40 underline-offset-4 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Retry request</span>
              </button>
            </div>
          )}

          {/* Action buttons for both user and bot messages */}
          <div className={`flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity ${isUser ? 'justify-end' : 'justify-start'}`}>
            {isUser ? (
              // Resend button for user messages
              <button
                onClick={() => onRetry(message.content, message.images)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs text-white/55 hover:text-white/70 hover:bg-white/5 rounded transition-all backdrop-blur-sm"
                title="Send again"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Send again</span>
              </button>
            ) : (
              // Copy button for bot messages
              !isError && (displayedContent || message.content) && (
                <button
                  onClick={() => onCopy(message.content)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs text-white/50 hover:text-white/70 hover:bg-white/5 rounded transition-all backdrop-blur-sm"
                  title="Copy message"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function UserImagePreview({ imageUrl, alt, index, ...props }: { 
  imageUrl: string; 
  alt: string;
  index: number;
} & React.HTMLAttributes<HTMLDivElement>) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleImageLoad = () => {
    setIsImageLoading(false);
  };

  const handleImageError = () => {
    setIsImageLoading(false);
    setHasError(true);
  };

  const handleSaveImage = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `my-image-${index}-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to save image:', error);
    }
  };

  if (hasError) {
    return (
      <div className="relative group">
        <div className="w-[140px] h-[140px] bg-emerald-500/10 backdrop-blur-sm border border-emerald-500/30 rounded-2xl flex items-center justify-center">
          <div className="text-center text-emerald-200/70">
            <AlertCircle className="w-5 h-5 mx-auto mb-1" />
            <span className="text-xs">Failed to load</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative group cursor-pointer" onClick={() => setIsModalOpen(true)}>
        {/* User image styling with blue theme to match user message bubble */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/25 to-stone-600/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-all duration-300 -inset-1"></div>
        
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600/20 to-stone-600/20 backdrop-blur-sm border border-emerald-500/30 group-hover:border-emerald-400/50 transition-all duration-300 shadow-lg">
          {/* Loading state */}
          {isImageLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/10">
              <Loader2 className="w-5 h-5 text-emerald-300 animate-spin" />
            </div>
          )}
          
          <img
            src={imageUrl}
            alt={alt}
            onLoad={handleImageLoad}
            onError={handleImageError}
            className="w-[140px] h-[140px] object-cover group-hover:scale-105 transition-transform duration-300"
            crossOrigin="anonymous"
          />
          
          {/* Overlay with preview hint - blue theme */}
          <div className="absolute inset-0 bg-emerald-950/35 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="text-white text-xs font-medium bg-emerald-600/30 backdrop-blur-sm px-2 py-1 rounded-lg border border-emerald-300/40">
              Click to view
            </div>
          </div>
        </div>
      </div>

      {/* Modal for full-size image - same as regular ImagePreview */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="relative max-w-4xl max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute -top-12 right-0 w-10 h-10 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white hover:bg-white/20 transition-all duration-200 flex items-center justify-center z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Save button */}
            <button
              onClick={handleSaveImage}
              className="absolute -top-12 right-12 w-10 h-10 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white hover:bg-white/20 transition-all duration-200 flex items-center justify-center z-10"
              title="Save image"
            >
              <Download className="w-5 h-5" />
            </button>

            {/* Full size image */}
            <div className="relative bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden shadow-2xl">
              <img
                src={imageUrl}
                alt={alt}
                className="max-w-full max-h-[80vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ImagePreview({ imageUrl, alt, index, ...props }: { 
  imageUrl: string; 
  alt: string;
  index: number;
} & React.HTMLAttributes<HTMLDivElement>) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleImageLoad = () => {
    setIsImageLoading(false);
  };

  const handleImageError = () => {
    setIsImageLoading(false);
    setHasError(true);
  };

  const handleSaveImage = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `image-${index}-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to save image:', error);
    }
  };

  if (hasError) {
    return (
      <div className="relative group">
        <div className="w-[150px] h-[150px] bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl flex items-center justify-center">
          <div className="text-center text-white/50">
            <AlertCircle className="w-6 h-6 mx-auto mb-2" />
            <span className="text-xs">Failed to load</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative group cursor-pointer" onClick={() => setIsModalOpen(true)}>
        {/* Hover glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-stone-600/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-all duration-300 -inset-1"></div>
        
        <div className="relative overflow-hidden rounded-xl bg-white/5 backdrop-blur-sm border border-white/20 group-hover:border-white/40 transition-all duration-300">
          {/* Loading state */}
          {isImageLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/5">
              <Loader2 className="w-6 h-6 text-white/50 animate-spin" />
            </div>
          )}
          
          <img
            src={imageUrl}
            alt={alt}
            onLoad={handleImageLoad}
            onError={handleImageError}
            className="w-[150px] h-[150px] object-cover group-hover:scale-105 transition-transform duration-300"
          />
          
          {/* Overlay with preview hint */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="text-white text-sm font-medium bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg border border-white/30">
              Click to view
            </div>
          </div>
        </div>
      </div>

      {/* Modal for full-size image */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="relative max-w-4xl max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute -top-12 right-0 w-10 h-10 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white hover:bg-white/20 transition-all duration-200 flex items-center justify-center z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Save button */}
            <button
              onClick={handleSaveImage}
              className="absolute -top-12 right-12 w-10 h-10 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white hover:bg-white/20 transition-all duration-200 flex items-center justify-center z-10"
              title="Save image"
            >
              <Download className="w-5 h-5" />
            </button>

            {/* Full size image */}
            <div className="relative bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden shadow-2xl">
              <img
                src={imageUrl}
                alt={alt}
                className="max-w-full max-h-[80vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ToolCallDisplay({ tool, onToggle, retryAttempt }: { 
  tool: ToolExecution; 
  onToggle: () => void;
  retryAttempt?: number;
}) {
  const getToolIcon = (name: string) => {
    if (name.includes("vision") || name.includes("image")) return Eye; // Use Eye icon for vision analysis
    if (name.includes("web_search") || name.includes("web")) return Globe;
    if (name.includes("rag_search") || name.includes("document")) return Database;
    if (name.includes("email") || name.includes("subscription")) return Mail;
    return Search;
  };

  const Icon = getToolIcon(tool.name);

  // Enhanced parsing for structured tool results
  const parseToolResult = (result: any) => {
    // Check if it's already an array of search results
    if (Array.isArray(result) && result.length > 0 && result[0].title && result[0].content) {
      return { type: 'search_results', content: result };
    }
    
    if (typeof result === 'string') {
      // Try to parse structured search results
      if (result.includes('Title:') && result.includes('URL:') && result.includes('Score:')) {
        return parseSearchResults(result);
      }
      return { type: 'text', content: result };
    }
    if (typeof result === 'object') {
      return { type: 'json', content: result };
    }
    return { type: 'text', content: String(result) };
  };

  const parseSearchResults = (resultString: string) => {
    const sections = resultString.split('---').filter(section => section.trim());
    const results = sections.map(section => {
      const lines = section.trim().split('\n');
      let title = '', url = '', content = '', score = '';
      
      for (const line of lines) {
        if (line.startsWith('Title: ')) title = line.replace('Title: ', '').trim();
        else if (line.startsWith('URL: ')) url = line.replace('URL: ', '').trim();
        else if (line.startsWith('Content: ')) content = line.replace('Content: ', '').trim();
        else if (line.startsWith('Score: ')) score = line.replace('Score: ', '').trim();
      }
      
      return { title, url, content, score: parseFloat(score) || 0 };
    });
    
    return { type: 'search_results', content: results };
  };

  const formatScore = (score: number) => {
    const percentage = Math.round(score * 100);
    let color = 'text-red-300';
    if (percentage >= 95) color = 'text-green-300';
    else if (percentage >= 80) color = 'text-emerald-300';
    else if (percentage >= 60) color = 'text-yellow-300';
    else if (percentage >= 40) color = 'text-orange-300';
    
    return { percentage, color };
  };

  const parsedResult = tool.result ? parseToolResult(tool.result) : null;

  return (
    <div className="relative group tool-card rounded-lg overflow-hidden">
      <div className="relative border rounded-lg overflow-hidden shadow-sm tool-card">
        <button
          onClick={onToggle}
          className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-white/[0.04] transition-all duration-200 tool-body"
        >
          <div className="flex items-center gap-3">
            <div className={`relative p-3 rounded-xl backdrop-blur-sm ${
              tool.isRunning 
                ? "bg-amber-500/10 border border-amber-500/25" 
                : "bg-emerald-600/10 border border-emerald-600/20"
            }`}>
              <div className="relative tool-text">
                {tool.isRunning ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-200" />
                ) : (
                  <Icon className="w-4 h-4 text-white/70" />
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium tool-text capitalize">
                  {tool.name === 'vision_analysis' ? 'AI Vision Analysis' : tool.name.replace(/_/g, ' ')}
                </span>
                
                {/* Search type badge */}
                {(tool.name === 'web_search' || tool.name === 'rag_search') && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    tool.name === 'web_search' 
                      ? 'bg-emerald-600/10 text-emerald-200/90 border border-emerald-600/20'
                      : 'bg-stone-700/15 text-stone-200/90 border border-stone-600/30'
                  }`}>
                    {tool.name === 'web_search' ? '🌐 Web' : '📚 Documents'}
                  </span>
                )}
                
                {/* Retry attempt badge */}
                {retryAttempt && retryAttempt > 1 && (
                  <span className="px-2 py-1 bg-orange-500/20 text-orange-300 border border-orange-400/30 rounded-full text-xs font-medium">
                    Retry #{retryAttempt}
                  </span>
                )}
              </div>
              
              {tool.isRunning ? (
                <div className="text-xs text-amber-200 mt-1 flex items-center gap-2">
                  <span>{tool.name === 'vision_analysis' ? 'Analyzing images...' : 'Running...'}</span>
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-amber-300 rounded-full animate-pulse"></div>
                    <div className="w-1 h-1 bg-amber-300 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1 h-1 bg-amber-300 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-white/65 mt-1">
                  <span>{tool.name === 'vision_analysis' ? 'Analysis complete' : 'Completed'}</span>
                  {/* Show metadata if available */}
                  {tool.metadata && (
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-white/55">
                      {tool.metadata.processing_time && (
                        <span>⏱️ {tool.metadata.processing_time.toFixed(2)}s</span>
                      )}
                      {tool.metadata.results_count && (
                        <span>📊 {tool.metadata.results_count} results</span>
                      )}
                      {tool.metadata.relevance_score && (
                        <span>🎯 {Math.round(tool.metadata.relevance_score * 100)}% relevance</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          {tool.expanded ? (
            <ChevronDown className="w-4 h-4 text-white/60" />
          ) : (
            <ChevronRight className="w-4 h-4 text-white/60" />
          )}
        </button>

        {tool.expanded && (
          <div className="border-t border-white/10 tool-panel">
            {/* Parameters Section */}
            {tool.args && (
              <div className="p-4 border-b border-white/10">
                <div className="text-xs font-semibold text-white/70 mb-2 flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Parameters
                </div>
                <div className="tool-body rounded-md p-3 border border-white/10">
                  {Object.entries(tool.args).map(([key, value]) => (
                    <div key={key} className="flex items-start gap-3 py-2">
                      <span className="text-white/70 font-medium text-sm min-w-0 capitalize">
                        {key.replace(/_/g, ' ')}:
                      </span>
                      <span className="text-white/80 text-sm flex-1">
                        {typeof value === 'string' ? value : JSON.stringify(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Results Section */}
            {parsedResult && (
              <div className="p-4">
                <div className="text-xs font-semibold text-white/70 mb-3 flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Results
                </div>
                
                {parsedResult.type === 'search_results' ? (
                  <div className="space-y-4">
                    {/* Search summary header */}
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-white/70" />
                        <span className="text-white/80 text-sm">
                          Found {parsedResult.content.length} result{parsedResult.content.length !== 1 ? 's' : ''}
                        </span>
                        {tool.args?.query && (
                          <span className="text-white/60 text-xs">
                            for &quot;{tool.args.query}&quot;
                          </span>
                        )}
                      </div>
                      <div className="text-white/50 text-xs">
                        {parsedResult.content.filter((r: any) => r.score >= 0.8).length} high relevance
                      </div>
                    </div>
                    
                    {parsedResult.content.map((result: any, index: number) => {
                      const { percentage, color } = formatScore(result.score);
                      return (
                        <div key={index} className="relative group/result">
                          {/* Individual result liquid glass container */}
                          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-stone-500/10 rounded-lg blur opacity-0 group-hover/result:opacity-100 transition-opacity duration-300"></div>
                          <div className="relative bg-white/[0.04] backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:bg-white/[0.06] transition-all duration-300">
                            {/* Header with title and score */}
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  {/* Special icon for AI Answer */}
                                  {result.title === "AI Answer" && (
                                    <div className="w-4 h-4 bg-gradient-to-r from-emerald-500 to-stone-500 rounded-full flex items-center justify-center">
                                      <Bot className="w-2.5 h-2.5 text-white" />
                                    </div>
                                  )}
                                  <h4 className="text-white/90 font-medium text-sm leading-snug">
                                    {result.title || 'Untitled'}
                                  </h4>
                                </div>
                                
                                {result.url && result.url.trim() !== '' && (
                                  <a 
                                    href={result.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-emerald-200 hover:text-emerald-100 text-xs mt-1 inline-flex items-center gap-1 transition-colors group/link"
                                  >
                                    <Globe className="w-3 h-3" />
                                    <span className="truncate max-w-xs">
                                      {result.url.replace(/^https?:\/\//, '').replace(/^www\./, '')}
                                    </span>
                                  </a>
                                )}
                                
                                {/* Show source type if no URL */}
                                {(!result.url || result.url.trim() === '') && result.title === "AI Answer" && (
                                  <div className="text-stone-300 text-xs mt-1 inline-flex items-center gap-1">
                                    <Bot className="w-3 h-3" />
                                    <span>AI Generated Summary</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Score badge */}
                              <div className="flex-shrink-0 ml-4">
                                <div className="relative">
                                  <div className={`absolute inset-0 ${color.replace('text-', 'bg-').replace('-300', '-500/20')} rounded-full blur`}></div>
                                  <div className="relative bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1">
                                    <span className={`${color} text-xs font-medium`}>
                                      {percentage}%
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Content preview */}
                            {result.content && (
                              <div className="text-white/70 text-xs leading-relaxed bg-white/[0.04] rounded-md p-3 border border-white/10">
                                {(() => {
                                  let content = result.content;
                                  
                                  // Try to parse and format JSON content nicely
                                  if (typeof content === 'string' && content.trim().startsWith('{')) {
                                    try {
                                      const parsed = JSON.parse(content);
                                      
                                      // Special formatting for weather API data
                                      if (parsed.location && parsed.current) {
                                        return (
                                          <div className="space-y-2">
                                            <div className="text-white/90 font-medium">
                                              📍 {parsed.location.name}, {parsed.location.region}, {parsed.location.country}
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                              <div>🌡️ Temperature: {parsed.current.temp_c}°C ({parsed.current.temp_f}°F)</div>
                                              <div>☁️ Condition: {parsed.current.condition?.text}</div>
                                              <div>💨 Wind: {parsed.current.wind_kph} km/h {parsed.current.wind_dir}</div>
                                              <div>💧 Humidity: {parsed.current.humidity}%</div>
                                              <div>👁️ Visibility: {parsed.current.vis_km} km</div>
                                              <div>🌡️ Feels like: {parsed.current.feelslike_c}°C</div>
                                            </div>
                                            <div className="text-white/60 text-xs">
                                              Last updated: {parsed.current.last_updated}
                                            </div>
                                          </div>
                                        );
                                      }
                                      
                                      // General JSON formatting for other types
                                      return (
                                        <div className="space-y-1">
                                          {Object.entries(parsed).slice(0, 5).map(([key, value]: [string, any]) => (
                                            <div key={key} className="flex gap-2">
                                              <span className="text-white/70 font-medium capitalize min-w-0">
                                                {key.replace(/_/g, ' ')}:
                                              </span>
                                              <span className="text-white/80 flex-1">
                                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                              </span>
                                            </div>
                                          ))}
                                          {Object.keys(parsed).length > 5 && (
                                            <div className="text-white/50 text-xs italic">
                                              ... and {Object.keys(parsed).length - 5} more fields
                                            </div>
                                          )}
                                        </div>
                                      );
                                    } catch (e) {
                                      // If JSON parsing fails, fall back to regular text
                                      content = content;
                                    }
                                  }
                                  
                                  // Regular text content with better formatting
                                  return (
                                    <div className="line-clamp-4 break-words">
                                      {/* Handle very long content */}
                                      {content.length > 300 ? (
                                        <div>
                                          <p className="whitespace-pre-wrap">
                                            {content.substring(0, 300)}...
                                          </p>
                                          <button 
                                            className="mt-2 text-emerald-200 hover:text-emerald-100 text-xs underline"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              // Toggle full content display
                                              const element = e.currentTarget.previousElementSibling as HTMLElement;
                                              if (element) {
                                                if (element.textContent?.includes('...')) {
                                                  element.textContent = content;
                                                  e.currentTarget.textContent = 'Show less';
                                                } else {
                                                  element.textContent = content.substring(0, 300) + '...';
                                                  e.currentTarget.textContent = 'Show more';
                                                }
                                              }
                                            }}
                                          >
                                            Show more
                                          </button>
                                        </div>
                                      ) : (
                                        <p className="whitespace-pre-wrap">{content}</p>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : tool.name === 'vision_analysis' ? (
                  // Special styling for vision analysis results with markdown support
                  <div className="bg-gradient-to-r from-emerald-600/10 to-stone-600/10 backdrop-blur-sm rounded-lg p-4 border border-emerald-600/20 max-h-96 overflow-y-auto">
                    <div className="flex items-center gap-2 mb-3">
                      <Eye className="w-4 h-4 text-emerald-300" />
                      <span className="text-emerald-200 text-sm font-medium">Vision Analysis Results</span>
                    </div>
                    <div className="prose prose-sm prose-invert max-w-none">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-3 last:mb-0 text-white/90 leading-relaxed text-sm">{children}</p>,
                          h1: ({ children }) => <h1 className="text-lg font-semibold mb-3 text-emerald-200">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-base font-semibold mb-2 text-emerald-200">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-semibold mb-2 text-emerald-200">{children}</h3>,
                          ul: ({ children }) => <ul className="list-disc pl-4 mb-3 space-y-1 text-white/90">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-4 mb-3 space-y-1 text-white/90">{children}</ol>,
                          li: ({ children }) => <li className="text-white/90 text-sm">{children}</li>,
                          code: ({ children, node, ...props }) => 
                            (node && (node as any).inline)
                                ? <code className="bg-emerald-600/20 px-1 py-0.5 rounded text-xs font-mono text-emerald-200" {...props}>{children}</code>
                                : <code className="block bg-emerald-600/10 p-3 rounded text-xs font-mono text-white/90 overflow-x-auto mb-3" {...props}>{children}</code>,
                              pre: ({ children }) => <pre className="bg-emerald-600/10 p-3 rounded overflow-x-auto mb-3">{children}</pre>,
                              blockquote: ({ children }) => <blockquote className="border-l-4 border-emerald-500/50 pl-3 italic text-white/70 mb-3">{children}</blockquote>,
                              strong: ({ children }) => <strong className="font-semibold text-emerald-200">{children}</strong>,
                          em: ({ children }) => <em className="italic text-white/90">{children}</em>,
                        }}
                      >
                        {parsedResult.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                ) : parsedResult.type === 'json' ? (
                  <div className="bg-white/[0.04] backdrop-blur-sm rounded-lg p-4 border border-white/10 max-h-64 overflow-y-auto">
                    <pre className="text-white/80 text-xs font-mono leading-relaxed">
                      {JSON.stringify(parsedResult.content, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="bg-white/[0.04] backdrop-blur-sm rounded-lg p-4 border border-white/10 max-h-64 overflow-y-auto">
                    <div className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">
                      {parsedResult.content}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ChatInput({ 
  value, 
  onChange, 
  onSend, 
  disabled, 
  isThinking,
  isUploadingImages,
  selectedImages,
  onImageSelect,
  onImageRemove,
  onRetryImageUpload,
  fileInputRef
}: { 
  value: string; 
  onChange: (value: string) => void; 
  onSend: () => void; 
  disabled: boolean;
  isThinking: boolean;
  isUploadingImages: boolean;
  selectedImages: SelectedImage[];
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageRemove: (id: string) => void;
  onRetryImageUpload: (id: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const canSend = !disabled && !isUploadingImages && (value.trim().length > 0 || selectedImages.length > 0);
    if (e.key === 'Enter' && !e.shiftKey && canSend) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="relative">
      {/* Image previews */}
      {selectedImages.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {selectedImages.map((img) => (
            <div key={img.id} className="relative group">
              <img
                src={img.preview}
                alt="Selected"
                className="w-16 h-16 object-cover rounded-xl border border-white/20 bg-white/5"
              />
              {img.uploadStatus === "uploading" && (
                <div className="absolute inset-0 rounded-xl bg-black/55 flex flex-col items-center justify-center text-[10px] text-white">
                  <Loader2 className="w-3 h-3 animate-spin mb-1" />
                  <span>Uploading</span>
                  <span>Try {img.uploadAttempts || 1}/3</span>
                </div>
              )}
              {img.uploadStatus === "failed" && (
                <div className="absolute inset-0 rounded-xl bg-red-900/65 flex flex-col items-center justify-center text-[10px] text-red-100 px-1 text-center">
                  <span>Upload failed</span>
                  <button
                    onClick={() => onRetryImageUpload(img.id)}
                    className="mt-1 px-1.5 py-0.5 rounded bg-red-500/50 hover:bg-red-500/70 text-[10px]"
                    type="button"
                  >
                    Retry
                  </button>
                </div>
              )}
              {img.uploadStatus === "uploaded" && (
                <div className="absolute bottom-0 left-0 right-0 rounded-b-xl bg-emerald-700/75 text-[10px] text-emerald-100 text-center py-0.5">
                  Uploaded
                </div>
              )}
              <button
                onClick={() => onImageRemove(img.id)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                type="button"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="chat-input-field relative flex items-end gap-2.5 backdrop-blur-xl border rounded-2xl shadow-lg focus-within:border-emerald-500/35 transition-all duration-200">
        
        <textarea
          ref={textareaRef}
          className="chat-input-text flex-1 resize-none border-0 bg-transparent px-3 py-2.5 text-white placeholder:text-white/45 focus:ring-0 focus:outline-none text-sm leading-relaxed"
          placeholder={isUploadingImages ? "Uploading images..." : isThinking ? "AI is responding..." : "Message Poultry Market AI..."}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          style={{ minHeight: '44px', maxHeight: '120px' }}
        />
        
        {/* Image upload button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploadingImages}
          className="chat-input-btn flex-shrink-0 p-2 m-1.5 backdrop-blur-sm rounded-lg border hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
          title="Add images"
          type="button"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={onImageSelect}
          className="hidden"
        />
        
        <button
          onClick={onSend}
          disabled={disabled || isUploadingImages || (!value.trim() && selectedImages.length === 0)}
          className="chat-send-btn retain-white flex-shrink-0 p-2 m-1.5 bg-emerald-700 rounded-lg hover:bg-emerald-600 disabled:bg-white/10 disabled:text-white/30 disabled:cursor-not-allowed transition-all duration-200 shadow"
          title="Send message"
        >
          {(disabled || isUploadingImages) ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ArrowRight className="w-4 h-4" />
          )}
        </button>
      </div>
      
      <div className="mt-1.5 text-[11px] text-white/45 text-center">
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  );
}
