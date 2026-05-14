"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import {
  Bot, User, Plus, ArrowRight, Loader2, RotateCcw,
  AlertCircle, Copy, Send, X, Download, Eye, Sun, Moon,
  Search, Globe, Database, Mail, ChevronDown, ChevronRight
} from "lucide-react";
import Image from "next/image";

// ────────────────────── TYPES (unchanged) ──────────────────────
type EventMsg = {
  type?: string;
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
  images?: string[];
  retryCount?: number;
  originalMessageId?: string;
  retryHistory?: {
    attempt: number;
    timestamp: Date;
    tools?: ToolExecution[];
    images?: string[];
  }[];
};

type ToolExecution = {
  name: string;
  args: any;
  result?: any;
  isRunning?: boolean;
  expanded?: boolean;
  retryAttempt?: number;
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
  isRetry?: boolean;
  uploadStatus?: "pending" | "uploading" | "uploaded" | "failed";
  uploadedUrl?: string;
  uploadError?: string;
  uploadAttempts?: number;
}

// ────────────────────── MAIN COMPONENT ──────────────────────
export default function ChatPage() {
  const [message, setMessage] = useState("");
  const [threadId, setThreadId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const wsRef = useRef<WebSocket | null>(null);
  const currentToolsRef = useRef<ToolExecution[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const removedImageIdsRef = useRef<Set<string>>(new Set());
  const autoRetryCountRef = useRef<Record<string, number>>({});

  // Theme handling
  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedTheme = window.localStorage.getItem("pm_theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      setTheme(storedTheme);
      return;
    }
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(prefersDark ? "dark" : "light");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("pm_theme", theme);
  }, [theme]);

  // Dynamic styles with agri theme + chicken background
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600&family=Source+Sans+3:wght@400;500;600&display=swap');
      .theme-light {
        --bg: #f7f4ee;
        --bg-2: #efe8db;
        --surface-rgb: 255 255 255;
        --surface-2-rgb: 245 242 234;
        --border-rgb: 208 200 186;
        --text: #1f1b14;
        --muted: #6b6254;
        --accent: #7f8f5a;
        --accent-2: #c2a05a;
        --accent-rgb: 127 143 90;
        --accent-2-rgb: 194 160 90;
        --user-bubble-rgb: 52 61 46;
        --user-text: #f7f4ee;
        --assistant-bubble-rgb: 255 255 255;
        --error: #b85c4a;
        --error-rgb: 184 92 74;
      }
      .theme-dark {
        --bg: #1c1e19;
        --bg-2: #232620;
        --surface-rgb: 36 40 33;
        --surface-2-rgb: 45 50 40;
        --border-rgb: 78 82 69;
        --text: #f2eee4;
        --muted: #b2ab9a;
        --accent: #9cab6b;
        --accent-2: #d1b06a;
        --accent-rgb: 156 171 107;
        --accent-2-rgb: 209 176 106;
        --user-bubble-rgb: 60 70 50;
        --user-text: #f6f2e8;
        --assistant-bubble-rgb: 36 40 33;
        --error: #c36a58;
        --error-rgb: 195 106 88;
      }
      .agri-ui {
        font-family: "Source Sans 3", ui-sans-serif, system-ui, -apple-system, Segoe UI, Arial, sans-serif;
        color: var(--text);
      }
      .agri-heading {
        font-family: "Fraunces", Georgia, "Times New Roman", serif;
        letter-spacing: 0.2px;
      }
      .agri-glass {
        background: rgb(var(--surface-rgb) / 0.78);
        border: 1px solid rgb(var(--border-rgb) / 0.7);
        box-shadow: 0 14px 32px rgb(0 0 0 / 0.12);
        backdrop-filter: blur(18px);
      }
      .agri-panel {
        background: rgb(var(--surface-2-rgb) / 0.6);
        border: 1px solid rgb(var(--border-rgb) / 0.55);
      }
      .agri-button {
        background: rgb(var(--surface-2-rgb) / 0.75);
        border: 1px solid rgb(var(--border-rgb) / 0.7);
        color: var(--text);
      }
      .agri-button:hover {
        background: rgb(var(--surface-2-rgb) / 0.95);
      }
      .agri-primary {
        background: linear-gradient(135deg, var(--accent), var(--accent-2));
        color: #1b1a14;
      }
      .agri-muted {
        color: var(--muted);
      }
      .agri-error-chip {
        background: rgb(var(--error-rgb) / 0.18);
        border: 1px solid rgb(var(--error-rgb) / 0.4);
        color: var(--error);
      }
      .agri-atmosphere {
        background: radial-gradient(900px 460px at 10% -10%, rgb(var(--accent-rgb) / 0.25), transparent 60%),
          radial-gradient(800px 420px at 90% 0%, rgb(var(--accent-2-rgb) / 0.2), transparent 60%),
          linear-gradient(180deg, var(--bg), var(--bg-2));
      }
      .agri-grain {
        background-image: radial-gradient(rgb(0 0 0 / 0.08) 1px, transparent 1px);
        background-size: 3px 3px;
        mix-blend-mode: soft-light;
        opacity: 0.3;
      }
      .chicken-bg {
        background-image: url('/public/images/chatbot_image.png');
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        opacity: 0.18;
        filter: blur(2px);
      }
      .hide-scrollbar {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
      .hide-scrollbar::-webkit-scrollbar {
        display: none;
      }
      .line-clamp-3 {
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
      selectedImages.forEach(img => {
        if (img.preview.startsWith("blob:")) {
          URL.revokeObjectURL(img.preview);
        }
      });
    };
  }, [selectedImages]);

  // Thread ID and history loading
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const urlThreadId = urlParams.get('thread_id');
    const savedThreadId = window.localStorage.getItem("thread_id");
    const finalThreadId = urlThreadId || savedThreadId;
    if (finalThreadId && typeof finalThreadId === 'string') {
      setThreadId(finalThreadId);
      loadConversationHistory(finalThreadId);
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
      if (removedImageIdsRef.current.has(imageId)) return;
      try {
        updateSelectedImage(imageId, { uploadStatus: "uploading", uploadAttempts: attempt, uploadError: undefined });
        const uploadedUrl = await uploadSingleImage(file);
        if (removedImageIdsRef.current.has(imageId)) return;
        updateSelectedImage(imageId, { uploadStatus: "uploaded", uploadedUrl, uploadError: undefined });
        return;
      } catch (error: any) {
        if (attempt >= maxRetries) {
          updateSelectedImage(imageId, { uploadStatus: "failed", uploadError: error?.message || "Upload failed", uploadAttempts: attempt });
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
        return { file, preview: dataURL, id, uploadStatus: "pending" as const, uploadAttempts: 0 };
      })
    )
      .then((newImages: SelectedImage[]) => {
        setSelectedImages((prev) => [...prev, ...newImages]);
        newImages.forEach((img) => { if (img.file) void uploadImageWithRetry(img.id, img.file, 3); });
      })
      .catch((error) => { console.error("Error processing images:", error); });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const cleanImageUrlsFromContent = (content: string): string => {
    if (!content) return content;
    let cleaned = content;
    cleaned = cleaned.replace(/https:\/\/res\.cloudinary\.com\/[^\s]+/g, '').trim();
    cleaned = cleaned.replace(/Image \d+ URL:\s*/g, '');
    cleaned = cleaned.replace(/Please analyze these images in the context of poultry farming:\s*/g, '');
    cleaned = cleaned.replace(/^https?:\/\/[^\s]+$/gm, '');
    cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
    return cleaned;
  };

  const removeImage = (id: string) => {
    removedImageIdsRef.current.add(id);
    setSelectedImages(prev => prev.filter(i => i.id !== id));
  };

  const retryImageUpload = (id: string) => {
    const target = selectedImages.find((img) => img.id === id);
    if (!target?.file) return;
    removedImageIdsRef.current.delete(id);
    void uploadImageWithRetry(id, target.file, 3);
  };

  useEffect(() => {
    const hasUploading = selectedImages.some((img) => img.uploadStatus === "uploading" || img.uploadStatus === "pending");
    setIsUploadingImages(hasUploading);
  }, [selectedImages]);

  // ────────────────────── FIXED HISTORY LOADING ──────────────────────
  const loadConversationHistory = async (thread_id: string) => {
    if (!thread_id) return;
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`/api/proxy?path=/conversation/${encodeURIComponent(thread_id)}/history`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error("Failed to load history");

      const data = await response.json();
      const conversationData = data?.data || data?.conversation || null;
      if (!conversationData?.messages) { setMessages([]); return; }

      const historyMessages: ChatMessage[] = conversationData.messages.map(
        (msg: any, index: number) => {
          // ── Tools (unchanged) ──
          const tools: ToolExecution[] = [];
          let searchLinksToProcess = msg.search_links || [];
          if (msg.role === "assistant" && index > 0) {
            const previousMsg = conversationData.messages[index - 1];
            if (previousMsg && previousMsg.role === "user" && previousMsg.search_links && Array.isArray(previousMsg.search_links)) {
              searchLinksToProcess = [...searchLinksToProcess, ...previousMsg.search_links];
            }
          }
          if (searchLinksToProcess && Array.isArray(searchLinksToProcess) && searchLinksToProcess.length > 0) {
            searchLinksToProcess.forEach((searchLink: any) => {
              const toolName = searchLink.search_type === "web_search" ? "web_search" :
                searchLink.search_type === "rag_search" ? "rag_search" : "document_search";
              const searchResults = searchLink.results_data || searchLink.results;
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
          const metadataToolExecutions = msg?.metadata?.tool_executions;
          if (Array.isArray(metadataToolExecutions) && metadataToolExecutions.length > 0) {
            metadataToolExecutions.forEach((toolExec: any) => {
              if (!toolExec || !toolExec.name) return;
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

          // ── Smart image extraction ──
          let processedImages: string[] = [];

          // 1. Try common image fields first
          const rawImages =
            msg.images ||
            msg.attachments ||
            msg.image_urls ||
            msg.file_urls ||
            [];

          if (Array.isArray(rawImages) && rawImages.length > 0) {
            processedImages = rawImages
              .map((img: any) => {
                if (typeof img === "string") return img;
                if (img?.url) return img.url;
                if (img?.src) return img.src;
                if (img?.public_url) return img.public_url;
                return null;
              })
              .filter(Boolean) as string[];
          }

          // 2. Fallback: extract Cloudinary URLs from content
          if (processedImages.length === 0 && msg.content) {
            // Match both bare Cloudinary URLs and the "Image X URL: ..." pattern
            const urlMatches = msg.content.match(
              /(?:Image\s*\d+\s*URL\s*:\s*)?(https:\/\/res\.cloudinary\.com\/[^\s"'<>]+)/gi
            );
            if (urlMatches) {
              processedImages = urlMatches.map((m: string) =>
                m.replace(/^Image\s*\d+\s*URL\s*:\s*/i, "").trim()
              );
            }
          }

          // ── Clean content ──
          let cleanContent = msg.content || "";
          // Always remove the "Image X URL:" prefix line (but keep the image in the array)
          cleanContent = cleanContent.replace(
            /^Image\s+\d+\s+URL\s*:\s*https?:\/\/[^\n]*$/gim,
            ""
          );
          // Only run the full image URL stripper if we already have images from fields
          if (processedImages.length > 0) {
            cleanContent = cleanImageUrlsFromContent(cleanContent);
          }
          cleanContent = cleanContent.replace(/\n\s*\n\s*\n/g, "\n\n").trim();

          return {
            id: msg.id || `history-${index}-${Date.now()}`,
            type: msg.role === "user" ? "user" : "assistant",
            content: cleanContent,
            timestamp: new Date(msg.timestamp || Date.now()),
            tools,
            isStreaming: false,
            images: processedImages,
          };
        }
      );

      setMessages(historyMessages);
    } catch (error) {
      console.error("Error loading conversation history:", error);
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
    const forcedImageUrls = sendOptions?.forcedImageUrls?.filter(Boolean) || [];
    const hasForcedImages = forcedImageUrls.length > 0;
    const selectedImagesSnapshot = hasForcedImages ? [] : [...selectedImages];
    const hasSelectedImages = selectedImagesSnapshot.length > 0;
    if ((!textToSend && !hasSelectedImages && !hasForcedImages) || isThinking || isUploadingImages) return;
    if (selectedImagesSnapshot.length > 10) {
      alert("Maximum 10 images are allowed per request.");
      return;
    }
    const selectedImagePreviews = hasForcedImages
      ? forcedImageUrls
      : selectedImagesSnapshot.map((img) => img.uploadedUrl || img.preview);
    if (!hasForcedImages) {
      const notReadyImages = selectedImagesSnapshot.filter((img) => img.uploadStatus === "uploading" || img.uploadStatus === "pending");
      if (notReadyImages.length > 0) return;
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
      retryImageUrls = selectedImagesSnapshot.filter((img) => img.isRetry && isRemoteUrl(img.preview)).map((img) => img.preview);
      uploadedImageUrls = selectedImagesSnapshot.filter((img) => Boolean(img.uploadedUrl)).map((img) => img.uploadedUrl as string);
    }
    const shouldCreateUserMessage = !sendOptions?.suppressUserMessage;
    let userMessageId: string | undefined;
    if (shouldCreateUserMessage) {
      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        type: "user",
        content: textToSend,
        timestamp: new Date(),
        images: selectedImagePreviews,
        retryCount: retryContext?.retryCount || 0,
        originalMessageId: retryContext?.originalMessageId || undefined,
      };
      userMessageId = userMsg.id;
      setMessages(prev => [...prev, userMsg]);
    }
    setMessage("");
    setSelectedImages([]);
    setIsThinking(true);
    currentToolsRef.current = [];
    const assistantId = sendOptions?.reuseAssistantId || (Date.now() + 1).toString();
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
    const allImageUrlsForAnalysis = Array.from(new Set([...uploadedImageUrls, ...retryImageUrls]));
    if (allImageUrlsForAnalysis.length > 0 && userMessageId) {
      setMessages(prev => prev.map(msg =>
        msg.id === userMessageId
          ? { ...msg, images: allImageUrlsForAnalysis }
          : msg
      ));
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try { wsRef.current.close(); } catch {}
    }
    try {
      const qp = new URLSearchParams();
      if (threadId) qp.set("thread_id", threadId);
      const res = await fetch(`/api/soocket?${qp.toString()}`);
      let wsUrl = "";
      if (res.ok) {
        const data = await res.json();
        wsUrl = data?.url || "";
      }
      if (!wsUrl) throw new Error("Could not resolve WebSocket URL");
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
        if (allImageUrls.length > 0) payload.existing_image_urls = allImageUrls;
        ws.send(JSON.stringify(payload));
      };
      ws.onmessage = (ev) => {
        hasReceivedResponse = true;
        clearTimeout(responseTimeout);
        try {
          const data: EventMsg = JSON.parse(ev.data);
          if (data.thread_id && !threadId) {
            const cleanThreadId = typeof data.thread_id === 'string' ? data.thread_id : String(data.thread_id);
            setThreadId(cleanThreadId);
            if (typeof window !== "undefined") {
              window.localStorage.setItem("thread_id", cleanThreadId);
              const newUrl = new URL(window.location.href);
              newUrl.searchParams.set('thread_id', cleanThreadId);
              window.history.replaceState({}, '', newUrl.toString());
            }
          }
          if (data.type === "status" && data.message) {
            const cleanedMessage = cleanImageUrlsFromContent(data.message || "");
            setMessages(prev => prev.map(msg =>
              msg.id === assistantId ? { ...msg, content: cleanedMessage, isStreaming: true, timestamp: new Date() } : msg
            ));
          }
          if (data.type === "skeleton" && data.message) {
            const cleanedSkeleton = cleanImageUrlsFromContent(data.message || "");
            setMessages(prev => prev.map(msg =>
              msg.id === assistantId ? { ...msg, content: cleanedSkeleton, isStreaming: true, timestamp: new Date() } : msg
            ));
          }
          if (data.type === "tool_start") {
            const newTool: ToolExecution = { name: data.name || "Unknown Tool", args: data.args, isRunning: true, expanded: false };
            currentToolsRef.current.push(newTool);
            setMessages(prev => prev.map(msg =>
              msg.id === assistantId ? { ...msg, tools: [...currentToolsRef.current] } : msg
            ));
          }
          if (data.type === "tool_result") {
            const toolIndex = currentToolsRef.current.findIndex(t => t.name === data.name && t.isRunning);
            if (toolIndex >= 0) {
              currentToolsRef.current[toolIndex] = { ...currentToolsRef.current[toolIndex], result: data.output, isRunning: false };
              setMessages(prev => prev.map(msg =>
                msg.id === assistantId ? { ...msg, tools: [...currentToolsRef.current] } : msg
              ));
            }
          }
          if (data.type === "final") {
            const finalContent = typeof data.message === 'string' ? data.message : String(data.message || "");
            const cleanedContent = cleanImageUrlsFromContent(finalContent);
            setMessages(prev => prev.map(msg =>
              msg.id === assistantId ? { ...msg, content: cleanedContent, isStreaming: false } : msg
            ));
            setIsThinking(false);
          }
          if (data.type === "image_uploaded") {
            setMessages(prev => prev.map(msg =>
              msg.id === assistantId ? { ...msg, content: msg.content + `\n\n📸 Image uploaded: ${data.filename}`, isStreaming: true } : msg
            ));
          }
          if (data.type === "image_linked") {
            setMessages(prev => prev.map(msg =>
              msg.id === assistantId ? { ...msg, content: `${msg.content}\n\n🔗 Image ready: ${data.filename || `image ${typeof data.index === "number" ? data.index + 1 : ""}`}`.trim(), isStreaming: true, timestamp: new Date() } : msg
            ));
          }
          if (data.type === "vision_analysis") {
            setMessages(prev => prev.map(msg =>
              msg.id === assistantId ? { ...msg, content: msg.content + `\n\n🔍 **Vision Analysis:**\n${data.analysis || data.message}`, isStreaming: true } : msg
            ));
          }
          if (data.type === "error") {
            handleConnectionError(assistantId, textToSend, selectedImagePreviews, { kind: "backend", backendMessage: typeof data.message === "string" ? data.message : undefined });
          }
          if (data.type === "validation_error") {
            const validationMessage = data.message || "Request validation failed.";
            setIsThinking(false);
            setMessages(prev => prev.map(msg =>
              msg.id === assistantId ? { ...msg, type: "error" as const, content: validationMessage, isStreaming: false, canRetry: true, originalUserMessage: textToSend, images: selectedImagePreviews, timestamp: new Date() } : msg
            ));
          }
          if (data.type === "completion") {
            setIsThinking(false);
            setMessages(prev => prev.map(msg =>
              msg.id === assistantId && msg.isStreaming ? { ...msg, isStreaming: false, timestamp: new Date() } : msg
            ));
          }
        } catch (err) {
          handleConnectionError(assistantId, textToSend, selectedImagePreviews, { kind: "parse", error: err });
        }
      };
      ws.onclose = (event) => {
        clearTimeout(responseTimeout);
        if (!hasReceivedResponse && event.code !== 1000) {
          handleConnectionError(assistantId, textToSend, selectedImagePreviews, { kind: "close", closeEvent: event });
        } else {
          setIsThinking(false);
          setMessages(prev => prev.map(msg =>
            msg.id === assistantId && msg.isStreaming ? { ...msg, isStreaming: false } : msg
          ));
        }
      };
      ws.onerror = (error) => {
        clearTimeout(responseTimeout);
        handleConnectionError(assistantId, textToSend, selectedImagePreviews, { kind: "network", error });
      };
    } catch (error) {
      handleConnectionError(assistantId, textToSend, selectedImagePreviews, { kind: "network", error });
    }
  };

  const buildErrorMessage = (details?: ConnectionErrorDetails): string => {
    const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;
    if (isOffline) return "You appear to be offline. Check your connection and try again.";
    if (details?.backendMessage) return `Server error: ${details.backendMessage}`;
    if (details?.kind === "timeout") return "No response from the server (timeout). Please try again.";
    if (details?.kind === "parse") return "Received an unreadable response from the server. Please retry.";
    if (details?.closeEvent) {
      const code = details.closeEvent.code;
      if (code === 1006) return "Connection lost unexpectedly. Please try again.";
      if (code === 1011) return "Server error while processing the request. Please try again.";
      if (code === 1001) return "Server closed the connection. Please retry.";
      return `Connection closed (code ${code}). Please try again.`;
    }
    if (details?.kind === "network") return "Network error while contacting the server. Please try again.";
    return "Unable to connect to the streaming service. Please try again.";
  };

  const handleConnectionError = (
    assistantId: string,
    originalMessage: string,
    originalImages?: string[],
    details?: ConnectionErrorDetails
  ) => {
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
        msg.id === assistantId ? { ...msg, type: "assistant", content: "Reconnecting...", isStreaming: true, timestamp: new Date() } : msg
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
        return { ...msg, type: "error" as const, content: errorMessage, isStreaming: false, canRetry: true, originalUserMessage: originalMessage, images: originalImages, timestamp: new Date() };
      }
      return msg;
    }));
  };

  const retryMessage = useCallback(async (originalMessage: string, originalImages?: string[]) => {
    const existingMessageIndex = messages.findIndex(m => m.type === "user" && m.content === originalMessage);
    let retryCount = 0;
    let originalMessageId = "";
    if (existingMessageIndex !== -1) {
      const existingMessage = messages[existingMessageIndex];
      retryCount = (existingMessage.retryCount || 0) + 1;
      originalMessageId = existingMessage.originalMessageId || existingMessage.id;
      setMessages(prev => prev.map((msg, index) => 
        index === existingMessageIndex ? { ...msg, retryCount, originalMessageId, timestamp: new Date() } : msg
      ));
    }
    setMessage(originalMessage);
    if (originalImages && originalImages.length > 0) {
      const retryImages: SelectedImage[] = await Promise.all(originalImages.map(async (url, index) => {
        const id = `retry-${Date.now()}-${index}`;
        if (isRemoteUrl(url)) return { id, file: null, preview: url, isRetry: true };
        if (isDataImageUrl(url)) {
          try {
            const file = await dataUrlToFile(url, `retry_image_${index + 1}`);
            return { id, file, preview: url, isRetry: false };
          } catch {
            return { id, file: null, preview: url, isRetry: true };
          }
        }
        return { id, file: null, preview: url, isRetry: true };
      }));
      setSelectedImages(retryImages);
    } else {
      setSelectedImages([]);
    }
    setTimeout(() => {
      sendMessage(undefined, { isRetry: true, retryCount, originalMessageId, originalImages: originalImages || [] });
    }, 10);
  }, [messages]);

  const copyToClipboard = async (text: string) => {
    try { await navigator.clipboard.writeText(text); } catch (err) { console.error('Failed to copy text: ', err); }
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
    <div className={`min-h-screen relative overflow-hidden agri-ui ${theme === "dark" ? "theme-dark" : "theme-light"}`}>
      {/* CHICKEN BACKGROUND PHOTO */} <div className="absolute inset-0 z-0">
    <Image
      src="/images/chatbot_image.png"
      alt="Poultry farm background"
      fill
      className="object-cover opacity-20 blur-[2px]"
      priority
    />
  </div><div className="absolute inset-0 chicken-bg z-0"></div>
      
      {/* Atmosphere and grain overlays */}
      <div className="absolute inset-0 agri-atmosphere z-[1]"></div>
      <div className="absolute inset-0 agri-grain pointer-events-none z-[2]"></div>

      <div className="relative z-10 flex flex-col h-screen">
        {/* PROFESSIONAL LIQUID GLASS HEADER – ROUNDED */}
        <div className="px-4 pt-4">
          <div className="max-w-4xl mx-auto">
            <div className="agri-glass rounded-2xl px-5 py-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="agri-panel rounded-lg p-2">
                    <Bot className="w-5 h-5" style={{ color: "var(--text)" }} />
                  </div>
                  <div>
                    <h1 className="text-base font-semibold agri-heading">Poultry Market AI</h1>
                    <p className="text-xs agri-muted">Intelligent farming assistant</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="agri-button px-3 py-1.5 rounded-lg text-xs"
                    title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                  >
                    {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={doNewConversation}
                    className="agri-button px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    New Chat
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-hidden relative">
          <ChatArea 
            messages={messages} 
            onToggleTool={toggleToolExpansion} 
            isThinking={isThinking} 
            onRetry={retryMessage} 
            onCopy={copyToClipboard}
            isLoadingHistory={isLoadingHistory}
          />
          
          {/* Floating input */}
          <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
            <div className="max-w-4xl mx-auto pointer-events-auto">
              <div className="agri-glass rounded-2xl p-4">
                <ChatInput 
                  value={message} 
                  onChange={setMessage} 
                  onSend={() => sendMessage()} 
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

// ────────────────────── CHAT AREA ──────────────────────
function ChatArea({ 
  messages, 
  onToggleTool, 
  isThinking, 
  onRetry, 
  onCopy,
  isLoadingHistory 
}: { 
  messages: ChatMessage[]; 
  onToggleTool: (messageId: string, toolIndex: number) => void;
  isThinking: boolean;
  onRetry: (originalMessage: string, originalImages?: string[]) => void;
  onCopy: (text: string) => Promise<void>;
  isLoadingHistory: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      setShowScrollToBottom(scrollTop + clientHeight < scrollHeight - 100 && messages.length > 0);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  };

  if (isLoadingHistory) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 agri-muted">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading conversation...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <div ref={scrollRef} className="h-full overflow-y-auto hide-scrollbar pb-28" onScroll={handleScroll}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="mb-8">
              <div className="agri-panel rounded-full p-6">
                <Bot className="w-9 h-9" style={{ color: "var(--text)" }} />
              </div>
            </div>
            <h2 className="text-2xl font-semibold agri-heading mb-3">How can I help you today?</h2>
            <p className="agri-muted max-w-lg leading-relaxed text-base">
              Ask about poultry farming, market trends, disease management, or subscription services.
            </p>
          </div>
        )}
        <div className="px-5 py-5">
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
        </div>
      </div>
      {showScrollToBottom && (
        <button onClick={scrollToBottom} className="absolute bottom-36 right-6 w-11 h-11 agri-panel rounded-full shadow-md flex items-center justify-center z-10">
          <ChevronDown className="w-5 h-5" style={{ color: "var(--text)" }} />
        </button>
      )}
    </div>
  );
}

// ────────────────────── MESSAGE BUBBLE (agri styling) ──────────────────────
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

  useEffect(() => {
    if (!isUser && message.content && message.isStreaming) {
      const contentChanged = displayedContent !== message.content;
      if (contentChanged) {
        if (message.content.length > displayedContent.length + 5) {
          setIsTyping(true);
          let index = displayedContent.length;
          const interval = setInterval(() => {
            if (index < message.content.length) {
              const chunkSize = Math.min(3, message.content.length - index);
              setDisplayedContent(message.content.slice(0, index + chunkSize));
              index += chunkSize;
            } else { setIsTyping(false); clearInterval(interval); }
          }, 15);
          return () => clearInterval(interval);
        } else if (message.content.length > displayedContent.length) {
          setIsTyping(true);
          let index = displayedContent.length;
          const interval = setInterval(() => {
            if (index < message.content.length) {
              setDisplayedContent(message.content.slice(0, index + 1));
              index++;
            } else { setIsTyping(false); clearInterval(interval); }
          }, 20);
          return () => clearInterval(interval);
        }
      }
    } else {
      setDisplayedContent(message.content);
      setIsTyping(false);
    }
  }, [message.content, message.isStreaming, isUser, displayedContent]);

  return (
    <div className={`py-3 group ${isUser ? 'flex justify-end' : 'flex justify-start'}`}>
      <div className={`flex items-start gap-2 max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser 
            ? 'text-[var(--user-text)] border border-[rgb(var(--border-rgb)/0.6)]'
            : isError 
              ? 'agri-error-chip'
              : 'agri-panel'
        }`} style={isUser ? { backgroundColor: "rgb(var(--user-bubble-rgb))" } : undefined}>
          {isUser ? <User className="w-4 h-4" /> : isError ? <AlertCircle className="w-4 h-4" /> : <Bot className="w-4 h-4" style={{ color: "var(--text)" }} />}
        </div>
        <div className={`flex-1 min-w-0 ${isUser ? 'text-right' : 'text-left'}`}>
          {message.images && message.images.length > 0 && (
            <div className={`mb-2 ${isUser ? 'flex flex-wrap gap-2 justify-end' : 'flex flex-wrap gap-2'}`}>
              {message.images.map((imageUrl, idx) => (
                isUser ? <UserImagePreview key={`user-img-${idx}`} imageUrl={imageUrl} alt={`Image ${idx+1}`} index={idx+1} /> :
                         <ImagePreview key={`ai-img-${idx}`} imageUrl={imageUrl} alt={`Image ${idx+1}`} index={idx+1} />
              ))}
            </div>
          )}
          {(displayedContent || message.content) && (
            <div className={`leading-relaxed ${
              isUser 
                ? 'text-[var(--user-text)] rounded-2xl rounded-tr-md px-3 py-2 border border-[rgb(var(--border-rgb)/0.6)] shadow-sm'
                : 'rounded-2xl rounded-tl-md px-3 py-2 border border-[rgb(var(--border-rgb)/0.45)] shadow-sm'
            }`} style={
              isUser 
                ? { backgroundColor: "rgb(var(--user-bubble-rgb))" }
                : { backgroundColor: "rgb(var(--assistant-bubble-rgb) / 0.85)", color: "var(--text)" }
            }>
              {isUser ? (
                <div>{message.content}</div>
              ) : (
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-4 last:mb-0 leading-relaxed text-[color:var(--text)] opacity-90">{children}</p>,
                    h1: ({ children }) => <h1 className="text-xl font-semibold mb-4 agri-heading text-[color:var(--text)]">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-lg font-semibold mb-3 agri-heading text-[color:var(--text)]">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-base font-semibold mb-2 agri-heading text-[color:var(--text)]">{children}</h3>,
                    ul: ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-1 text-[color:var(--text)] opacity-90">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 space-y-1 text-[color:var(--text)] opacity-90">{children}</ol>,
                    li: ({ children }) => <li className="text-[color:var(--text)] opacity-90">{children}</li>,
                    code: ({ children, node, ...props }) => 
                      (node && (node as any).inline)
                        ? <code className="px-2 py-1 rounded text-sm font-mono bg-[rgb(var(--surface-2-rgb)/0.85)] text-[color:var(--text)]" {...props}>{children}</code>
                        : <code className="block p-4 rounded-lg text-sm font-mono text-[color:var(--text)] bg-[rgb(var(--surface-2-rgb)/0.7)] overflow-x-auto border border-[rgb(var(--border-rgb)/0.5)] mb-4" {...props}>{children}</code>,
                    pre: ({ children }) => <pre className="p-4 rounded-lg overflow-x-auto mb-4 bg-[rgb(var(--surface-2-rgb)/0.7)] border border-[rgb(var(--border-rgb)/0.5)]">{children}</pre>,
                    blockquote: ({ children }) => <blockquote className="border-l-4 border-[rgb(var(--border-rgb)/0.8)] pl-4 italic text-[color:var(--muted)] mb-4">{children}</blockquote>,
                    strong: ({ children }) => <strong className="font-semibold text-[color:var(--text)]">{children}</strong>,
                    em: ({ children }) => <em className="italic text-[color:var(--text)] opacity-90">{children}</em>,
                    a: ({ children, href }) => (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="underline transition-colors text-[color:var(--accent)] hover:text-[color:var(--accent-2)]">
                        {children}
                      </a>
                    ),
                  }}
                >
                  {message.isStreaming ? displayedContent : message.content}
                </ReactMarkdown>
              )}
              {!isUser && isTyping && <span className="inline-block w-2 h-5 bg-[var(--accent)]/70 ml-1 animate-pulse"></span>}
            </div>
          )}
          {!isUser && message.isStreaming && !displayedContent && !message.content && (
            <div className="flex items-center gap-2 agri-muted py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-[var(--accent)] rounded-full animate-bounce opacity-60"></div>
                <div className="w-2 h-2 bg-[var(--accent-2)] rounded-full animate-bounce opacity-60" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-[var(--accent)] rounded-full animate-bounce opacity-60" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="text-sm">Thinking...</span>
            </div>
          )}
          {!isUser && hasTools && (
            <div className="mt-3 space-y-2">
              {message.tools!.map((tool, index) => (
                <ToolCallDisplay key={`${tool.name}-${index}`} tool={tool} onToggle={() => onToggleTool(index)} retryAttempt={message.retryCount || 1} />
              ))}
            </div>
          )}
          {isError && message.canRetry && message.originalUserMessage !== undefined && (
            <div className="mt-3 pt-3 border-t border-[rgb(var(--border-rgb)/0.4)]">
              <button onClick={() => onRetry(message.originalUserMessage || "", message.images || [])} className="inline-flex items-center gap-1.5 px-3 py-1.5 agri-button rounded-lg text-xs">
                <RotateCcw className="w-3 h-3" />
                <span>Try again</span>
              </button>
            </div>
          )}
          <div className={`flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity ${isUser ? 'justify-end' : 'justify-start'}`}>
            {isUser ? (
              <button onClick={() => onRetry(message.content, message.images)} className="inline-flex items-center gap-1 px-2 py-1 text-xs agri-muted hover:text-[color:var(--text)] hover:bg-[rgb(var(--surface-2-rgb)/0.5)] rounded">
                <RotateCcw className="w-3 h-3" />
                <span>Resend</span>
              </button>
            ) : !isError && (displayedContent || message.content) && (
              <button onClick={() => onCopy(message.content)} className="inline-flex items-center gap-1 px-2 py-1 text-xs agri-muted hover:text-[color:var(--text)] hover:bg-[rgb(var(--surface-2-rgb)/0.5)] rounded">
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────── IMAGE PREVIEWS (agri styling) ──────────────────────
function UserImagePreview({ imageUrl, alt, index, ...props }: { imageUrl: string; alt: string; index: number; } & React.HTMLAttributes<HTMLDivElement>) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const handleImageLoad = () => setIsImageLoading(false);
  const handleImageError = () => { setIsImageLoading(false); setHasError(true); };
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
    } catch (error) { console.error('Failed to save image:', error); }
  };
  if (hasError) return <div className="w-[120px] h-[120px] agri-panel rounded-xl flex items-center justify-center"><div className="text-center agri-muted"><AlertCircle className="w-5 h-5 mx-auto mb-1" /><span className="text-xs">Failed to load</span></div></div>;
  return (
    <>
      <div className="relative group cursor-pointer" onClick={() => setIsModalOpen(true)}>
        <div className="relative overflow-hidden rounded-xl agri-panel transition-all duration-200">
          {isImageLoading && <div className="absolute inset-0 flex items-center justify-center bg-[rgb(var(--surface-2-rgb)/0.6)]"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--accent)" }} /></div>}
          <img src={imageUrl} alt={alt} onLoad={handleImageLoad} onError={handleImageError} className="w-[120px] h-[120px] object-cover group-hover:scale-105 transition-transform duration-300" crossOrigin="anonymous" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="text-white text-xs font-medium bg-[rgb(var(--surface-2-rgb)/0.6)] px-2 py-1 rounded-lg border border-[rgb(var(--border-rgb)/0.6)]">Click to view</div>
          </div>
        </div>
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setIsModalOpen(false)}>
          <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setIsModalOpen(false)} className="absolute -top-12 right-0 w-10 h-10 agri-button rounded-full flex items-center justify-center z-10"><X className="w-5 h-5" /></button>
            <button onClick={handleSaveImage} className="absolute -top-12 right-12 w-10 h-10 agri-button rounded-full flex items-center justify-center z-10" title="Save image"><Download className="w-5 h-5" /></button>
            <div className="relative agri-glass rounded-2xl overflow-hidden"><img src={imageUrl} alt={alt} className="max-w-full max-h-[80vh] object-contain" /></div>
          </div>
        </div>
      )}
    </>
  );
}

function ImagePreview({ imageUrl, alt, index, ...props }: { imageUrl: string; alt: string; index: number; } & React.HTMLAttributes<HTMLDivElement>) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const handleImageLoad = () => setIsImageLoading(false);
  const handleImageError = () => { setIsImageLoading(false); setHasError(true); };
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
    } catch (error) { console.error('Failed to save image:', error); }
  };
  if (hasError) return <div className="w-[120px] h-[120px] agri-panel rounded-xl flex items-center justify-center"><div className="text-center agri-muted"><AlertCircle className="w-5 h-5 mx-auto mb-1" /><span className="text-xs">Failed to load</span></div></div>;
  return (
    <>
      <div className="relative group cursor-pointer" onClick={() => setIsModalOpen(true)}>
        <div className="relative overflow-hidden rounded-xl agri-panel transition-all duration-200">
          {isImageLoading && <div className="absolute inset-0 flex items-center justify-center bg-[rgb(var(--surface-2-rgb)/0.6)]"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--accent)" }} /></div>}
          <img src={imageUrl} alt={alt} onLoad={handleImageLoad} onError={handleImageError} className="w-[120px] h-[120px] object-cover group-hover:scale-105 transition-transform duration-300" crossOrigin="anonymous" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="text-white text-xs font-medium bg-[rgb(var(--surface-2-rgb)/0.6)] px-2 py-1 rounded-lg border border-[rgb(var(--border-rgb)/0.6)]">Click to view</div>
          </div>
        </div>
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setIsModalOpen(false)}>
          <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setIsModalOpen(false)} className="absolute -top-12 right-0 w-10 h-10 agri-button rounded-full flex items-center justify-center z-10"><X className="w-5 h-5" /></button>
            <button onClick={handleSaveImage} className="absolute -top-12 right-12 w-10 h-10 agri-button rounded-full flex items-center justify-center z-10" title="Save image"><Download className="w-5 h-5" /></button>
            <div className="relative agri-glass rounded-2xl overflow-hidden"><img src={imageUrl} alt={alt} className="max-w-full max-h-[80vh] object-contain" /></div>
          </div>
        </div>
      )}
    </>
  );
}

// ────────────────────── TOOL CALL DISPLAY (quiet agri style) ──────────────────────
function ToolCallDisplay({ tool, onToggle, retryAttempt }: { tool: ToolExecution; onToggle: () => void; retryAttempt?: number; }) {
  const getToolIcon = (name: string) => {
    if (name.includes("vision") || name.includes("image")) return Eye;
    if (name.includes("web_search") || name.includes("web")) return Globe;
    if (name.includes("rag_search") || name.includes("document")) return Database;
    if (name.includes("email") || name.includes("subscription")) return Mail;
    return Search;
  };
  const Icon = getToolIcon(tool.name);
  const parsedResult = tool.result ? (typeof tool.result === 'string' ? tool.result : JSON.stringify(tool.result, null, 2)) : null;

  return (
    <div className="agri-panel rounded-lg overflow-hidden border border-[rgb(var(--border-rgb)/0.45)]">
      <button onClick={onToggle} className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-[rgb(var(--surface-2-rgb)/0.4)] transition-colors">
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-md ${tool.isRunning ? "bg-[rgb(var(--accent-rgb)/0.2)]" : "bg-[rgb(var(--surface-2-rgb)/0.6)]"}`}>
            {tool.isRunning ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--accent)" }} /> : <Icon className="w-4 h-4" style={{ color: "var(--accent)" }} />}
          </div>
          <div>
            <div className="text-sm font-medium text-[color:var(--text)] capitalize">{tool.name.replace(/_/g, ' ')}</div>
            <div className="text-xs agri-muted">{tool.isRunning ? 'Running...' : 'Completed'}</div>
          </div>
        </div>
        {tool.expanded ? <ChevronDown className="w-4 h-4 agri-muted" /> : <ChevronRight className="w-4 h-4 agri-muted" />}
      </button>
      {tool.expanded && parsedResult && (
        <div className="border-t border-[rgb(var(--border-rgb)/0.5)] bg-[rgb(var(--surface-2-rgb)/0.3)] px-4 py-3">
          <div className="text-xs agri-muted mb-2">Results</div>
          <div className="bg-[rgb(var(--surface-2-rgb)/0.6)] rounded-md p-3 text-xs leading-relaxed max-h-48 overflow-y-auto text-[color:var(--text)] whitespace-pre-wrap">
            {parsedResult}
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────── CHAT INPUT (agri-styled, no purple/blue) ──────────────────────
function ChatInput({ 
  value, onChange, onSend, disabled, isThinking, isUploadingImages,
  selectedImages, onImageSelect, onImageRemove, onRetryImageUpload, fileInputRef
}: { 
  value: string; onChange: (v: string) => void; onSend: () => void; disabled: boolean;
  isThinking: boolean; isUploadingImages: boolean; selectedImages: SelectedImage[];
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageRemove: (id: string) => void; onRetryImageUpload: (id: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !disabled && !isUploadingImages && (value.trim() || selectedImages.length)) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="relative">
      {selectedImages.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {selectedImages.map((img) => (
            <div key={img.id} className="relative group">
              <img src={img.preview} alt="Selected" className="w-16 h-16 object-cover rounded-xl border border-[rgb(var(--border-rgb)/0.6)] bg-[rgb(var(--surface-2-rgb)/0.5)]" />
              {img.uploadStatus === "uploading" && (
                <div className="absolute inset-0 rounded-xl bg-black/55 flex flex-col items-center justify-center text-[10px] text-white">
                  <Loader2 className="w-3 h-3 animate-spin mb-1" />
                  <span>Uploading</span>
                </div>
              )}
              {img.uploadStatus === "failed" && (
                <div className="absolute inset-0 rounded-xl bg-red-900/65 flex flex-col items-center justify-center text-[10px] text-red-100 px-1 text-center">
                  <span>Upload failed</span>
                  <button onClick={() => onRetryImageUpload(img.id)} className="mt-1 px-1.5 py-0.5 rounded bg-red-500/50 hover:bg-red-500/70 text-[10px]" type="button">Retry</button>
                </div>
              )}
              {img.uploadStatus === "uploaded" && (
                <div className="absolute bottom-0 left-0 right-0 rounded-b-xl bg-emerald-700/75 text-[10px] text-emerald-100 text-center py-0.5">Uploaded</div>
              )}
              <button onClick={() => onImageRemove(img.id)} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 transition-opacity opacity-0 group-hover:opacity-100" type="button">×</button>
            </div>
          ))}
        </div>
      )}

      <div className="relative flex items-end gap-3 agri-panel rounded-2xl shadow-sm focus-within:border-[rgb(var(--border-rgb)/0.8)] transition-all duration-200">
        <textarea
          ref={textareaRef}
          className="flex-1 resize-none border-0 bg-transparent px-4 py-3 text-[color:var(--text)] placeholder:text-[color:var(--muted)] focus:ring-0 focus:outline-none text-sm leading-relaxed"
          placeholder={isUploadingImages ? "Uploading images..." : isThinking ? "AI is responding..." : "Message Poultry Market AI..."}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          style={{ minHeight: '44px', maxHeight: '120px' }}
        />
        <button onClick={() => fileInputRef.current?.click()} disabled={disabled || isUploadingImages} className="flex-shrink-0 p-2.5 m-1.5 agri-button rounded-xl disabled:opacity-50 disabled:cursor-not-allowed" type="button" title="Add images">
          <Plus className="w-4 h-4" />
        </button>
        <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={onImageSelect} className="hidden" />
        <button
          onClick={onSend}
          disabled={disabled || isUploadingImages || (!value.trim() && selectedImages.length === 0)}
          className="flex-shrink-0 p-2.5 m-1.5 agri-primary rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
          title="Send message"
        >
          {disabled || isUploadingImages ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
      <div className="mt-2 text-xs text-center agri-muted">Press Enter to send, Shift+Enter for new line</div>
    </div>
  );
}