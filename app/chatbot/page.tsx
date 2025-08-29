"use client";

import React from "react";
import { useMemo, useRef, useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowRight, Loader2, Search, Bot, ChevronDown, ChevronRight, Database, Globe, Mail, MessageSquare, User, RotateCcw, AlertCircle, Copy, Send, Plus, X, Download, Eye } from "lucide-react";

type EventMsg = {
  type: "status" | "tool_start" | "tool_result" | "final" | "error" | "info" | "image_uploaded" | "image_error" | "vision_analysis";
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
};

type ToolExecution = {
  name: string;
  args: any;
  result?: any;
  isRunning?: boolean;
  expanded?: boolean;
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
  file: File;
  preview: string;
  id: string;
}

export default function ChatPage() {
  const [message, setMessage] = useState("");
  const [threadId, setThreadId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const currentToolsRef = useRef<ToolExecution[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    `;
    document.head.appendChild(style);
    
    // Cleanup image previews on unmount
    return () => {
      document.head.removeChild(style);
      selectedImages.forEach(img => URL.revokeObjectURL(img.preview));
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
  const fileToImageObject = (file: File): Promise<{data: string, filename: string, mime_type: string}> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve({
          data: base64,
          filename: file.name,
          mime_type: file.type
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const fileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter((file: File) => file.type.startsWith('image/'));
    
    // Process each image file
    Promise.all(
      imageFiles.map(async (file: File) => {
        const dataURL = await fileToDataURL(file);
        return {
          file,
          preview: dataURL, // Use data URL instead of blob URL
          id: crypto.randomUUID()
        };
      })
    ).then((newImages: SelectedImage[]) => {
      setSelectedImages(prev => [...prev, ...newImages]);
    }).catch((error) => {
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

  const removeImage = (id: string) => {
    setSelectedImages(prev => prev.filter(i => i.id !== id));
  };

  const loadConversationHistory = async (thread_id: string) => {
    if (!thread_id) return;
    
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`/api/proxy?path=/conversation/${encodeURIComponent(thread_id)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📋 Conversation History Response:', data);
        
        // Updated to handle the new backend response structure
        const conversationData = data.data;
        console.log('📋 Parsed Conversation Data:', conversationData);
        
        // Check if we have the messages array (new backend structure)
        if (conversationData && conversationData.messages && Array.isArray(conversationData.messages)) {
          const historyMessages: ChatMessage[] = conversationData.messages.map((msg: any, index: number) => {
            // Create tools array from search links if present
            const tools: ToolExecution[] = [];
            
            if (msg.search_links && Array.isArray(msg.search_links)) {
              msg.search_links.forEach((searchLink: any) => {
                const toolName = searchLink.search_type === "web_search" ? "web_search" : "document_search";
                tools.push({
                  name: toolName,
                  args: { query: searchLink.query },
                  result: searchLink.results,
                  isRunning: false,
                  expanded: false
                });
              });
            }
            
            // Clean image URLs from content since they should be displayed as images, not text
            let cleanContent = cleanImageUrlsFromContent(msg.content || "");
            
            // Debug: Log image data for this message
            if (msg.images && msg.images.length > 0) {
              console.log(`📸 Message ${msg.id} has ${msg.images.length} images:`, msg.images);
            }
            
            const processedImages = msg.images?.map((img: any) => {
              // Handle both URL string and image object formats
              if (typeof img === 'string') {
                console.log('📸 Processing string image:', img);
                return img; // Already a URL
              } else if (img && img.url) {
                console.log('📸 Processing image object:', img);
                return img.url; // Image object with URL property
              } else {
                console.log('📸 Invalid image data:', img);
                return null; // Invalid image data
              }
            }).filter(Boolean) || []; // Remove null values
            
            console.log(`📸 Final processed images for message ${msg.id}:`, processedImages);
            
            return {
              id: msg.id || `history-${index}-${Date.now()}`,
              type: msg.role === "user" ? "user" : "assistant",
              content: cleanContent,
              timestamp: new Date(msg.timestamp || Date.now()),
              tools: tools,
              isStreaming: false,
              images: processedImages,
            };
          });
          
          console.log('📋 Converted History Messages:', historyMessages);
          setMessages(historyMessages);
          
          // Log additional conversation metadata
          if (conversationData.summary) {
            console.log('📋 Conversation Summary:', conversationData.summary);
          }
          if (conversationData.topics) {
            console.log('📋 Recent Topics:', conversationData.topics);
          }
          if (conversationData.search_history) {
            console.log('📋 Search History:', conversationData.search_history);
          }
          if (conversationData.thread_context) {
            console.log('📋 Thread Context:', conversationData.thread_context);
          }
        } else {
          console.warn('📋 No messages found in conversation history');
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

  const sendMessage = async (messageText?: string) => {
    let rawText: string;
    if (typeof messageText === 'string') {
      rawText = messageText;
    } else if (messageText && typeof messageText === 'object' && 'target' in messageText) {
      rawText = message.trim();
    } else {
      rawText = message.trim();
    }
    
    const textToSend = typeof rawText === 'string' ? rawText : String(rawText);
    if ((!textToSend && selectedImages.length === 0) || isThinking) return;
    
    // console.log('📤 Sending message:', textToSend);
    // console.log('📤 Current thread ID:', threadId);
    // console.log('📤 Selected images:', selectedImages.length);
    
    // Process images for upload
    let images: {data: string, filename: string, mime_type: string}[] = [];
    if (selectedImages.length > 0) {
      try {
        images = await Promise.all(
          selectedImages.map(img => fileToImageObject(img.file))
        );
      } catch (error) {
        console.error("Error converting images:", error);
        return;
      }
    }
    
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: textToSend,
      timestamp: new Date(),
      images: selectedImages.map(img => img.preview), // Use preview URLs for display
    };
    
    setMessages(prev => [...prev, userMsg]);
    
    // Clear input but keep the data URLs - they don't need cleanup
    setMessage("");
    setSelectedImages([]);
    setIsThinking(true);
    currentToolsRef.current = [];

    // Start assistant response
    const assistantId = (Date.now() + 1).toString();
    // console.log('🤖 Creating assistant message with ID:', assistantId);
    setMessages(prev => [...prev, {
      id: assistantId,
      type: "assistant",
      content: "",
      tools: [],
      isStreaming: true,
      timestamp: new Date(),
    }]);

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
          handleConnectionError(assistantId, textToSend);
        }
      }, 30000);

      ws.onopen = () => {
        const payload = { 
          message: typeof textToSend === 'string' ? textToSend : String(textToSend), 
          thread_id: typeof threadId === 'string' ? threadId : undefined,
          images: images // Include images in the payload
        };
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
            handleConnectionError(assistantId, textToSend);
          }
        } catch (err) {
          // console.error("WebSocket message parsing error:", err);
          // console.error("Raw message that failed to parse:", ev.data);
          handleConnectionError(assistantId, textToSend);
        }
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket Closed:', { code: event.code, reason: event.reason });
        clearTimeout(responseTimeout);
        
        if (!hasReceivedResponse && event.code !== 1000) {
          // console.log('❌ WebSocket closed unexpectedly, handling as error');
          handleConnectionError(assistantId, textToSend);
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
        handleConnectionError(assistantId, textToSend);
      };
    } catch (error) {
      handleConnectionError(assistantId, textToSend);
    }
  };

  const handleConnectionError = (assistantId: string, originalMessage: string) => {
    // console.error('🚨 Handling connection error for assistant:', assistantId);
    setIsThinking(false);
    setMessages(prev => prev.map(msg => {
      if (msg.id === assistantId) {
        return {
          ...msg,
          type: "error" as const,
          content: "I'm experiencing connectivity issues with the enhanced streaming service. Please try again.",
          isStreaming: false,
          canRetry: true,
          originalUserMessage: originalMessage,
          timestamp: new Date()
        };
      }
      return msg;
    }));
  };

  const retryMessage = (originalMessage: string) => {
    sendMessage(originalMessage);
  };

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 relative overflow-hidden">
      {/* Liquid glass background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-blue/[0.02]"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full blur-3xl"></div>
      
      <div className="relative z-10 flex flex-col h-screen">
        {/* Header - Liquid glass style */}
        <div className="backdrop-blur-xl bg-white/5 border-b border-white/10 px-6 py-4">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-lg blur opacity-50"></div>
                <div className="relative bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/20">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">Poultry Market AI</h1>
                <p className="text-xs text-white/60">Intelligent farming assistant</p>
              </div>
            </div>
            <button
              onClick={doNewConversation}
              className="group relative px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white/80 text-sm transition-all duration-300 hover:bg-white/15 hover:border-white/30"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>New Chat</span>
              </div>
            </button>
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
          />
          
          {/* Floating input area - positioned absolutely */}
          <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
            <div className="max-w-4xl mx-auto pointer-events-auto">
              <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-4">
                <ChatInput 
                  value={message} 
                  onChange={setMessage} 
                  onSend={sendMessage} 
                  disabled={isThinking}
                  isThinking={isThinking}
                  selectedImages={selectedImages}
                  onImageSelect={handleFileSelect}
                  onImageRemove={removeImage}
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
  isLoadingHistory 
}: { 
  messages: ChatMessage[]; 
  onToggleTool: (messageId: string, toolIndex: number) => void;
  isThinking: boolean;
  onRetry: (originalMessage: string) => void;
  onCopy: (text: string) => Promise<void>;
  isLoadingHistory: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

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
        className="h-full overflow-y-auto hide-scrollbar pb-32"
        onScroll={handleScroll}
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="mb-8">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full blur-xl opacity-30"></div>
                <div className="relative bg-white/10 backdrop-blur-sm rounded-full p-6 border border-white/20">
                  <Bot className="w-10 h-10 text-white" />
                </div>
              </div>
            </div>
            <h2 className="text-3xl font-semibold text-white mb-4">How can I help you today?</h2>
            <p className="text-white/60 max-w-lg leading-relaxed text-lg">Ask me anything about poultry farming, market trends, disease management, or subscription services.</p>
          </div>
        )}

        <div className="px-6 py-6">
          {messages.map((msg) => (
            <MessageBubble 
              key={msg.id}
              message={msg} 
              onToggleTool={(toolIndex) => onToggleTool(msg.id, toolIndex)}
              onRetry={onRetry}
              onCopy={onCopy}
            />
          ))}

          {isThinking && (
            <div className="py-6 flex justify-start">
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
          className="absolute bottom-40 right-6 w-12 h-12 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full shadow-xl hover:bg-white/15 hover:border-white/30 transition-all duration-300 flex items-center justify-center group z-10"
          title="Scroll to bottom"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <ChevronDown className="w-5 h-5 text-white/80 relative z-10" />
        </button>
      )}
    </div>
  );
}

function MessageBubble({ message, onToggleTool, onRetry, onCopy }: { 
  message: ChatMessage; 
  onToggleTool: (toolIndex: number) => void;
  onRetry: (originalMessage: string) => void;
  onCopy: (text: string) => Promise<void>;
}) {
  const [displayedContent, setDisplayedContent] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const isUser = message.type === "user";
  const isError = message.type === "error";
  const hasTools = message.tools && message.tools.length > 0;

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
    <div className={`py-4 group ${isUser ? 'flex justify-end' : 'flex justify-start'}`}>
      <div className={`flex items-start gap-4 max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser 
            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' 
            : isError 
              ? 'bg-red-500/20 backdrop-blur-sm border border-red-500/30' 
              : 'bg-white/10 backdrop-blur-sm border border-white/20'
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
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl rounded-tr-md px-4 py-3 shadow-lg' 
                : 'text-white'
            }`}>
              {isUser ? (
                // User messages: simple text without markdown
                <div className="text-white">{message.content}</div>
              ) : (
                // Bot messages: full markdown with streaming effect
                <ReactMarkdown
                  components={{
                    // Clean, no-container rendering for bot messages
                    p: ({ children }) => <p className="mb-4 last:mb-0 text-white/90 leading-relaxed">{children}</p>,
                    h1: ({ children }) => <h1 className="text-xl font-semibold mb-4 text-white">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-lg font-semibold mb-3 text-white">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-base font-semibold mb-2 text-white">{children}</h3>,
                    ul: ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-1 text-white/90">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 space-y-1 text-white/90">{children}</ol>,
                    li: ({ children }) => <li className="text-white/90">{children}</li>,
                    code: ({ children, node, ...props }) => 
                      (node && (node as any).inline)
                        ? <code className="bg-white/10 px-2 py-1 rounded text-sm font-mono text-blue-200 backdrop-blur-sm" {...props}>{children}</code>
                        : <code className="block bg-white/5 p-4 rounded-lg text-sm font-mono text-white/90 overflow-x-auto backdrop-blur-sm border border-white/10 mb-4" {...props}>{children}</code>,
                    pre: ({ children }) => <pre className="bg-white/5 p-4 rounded-lg overflow-x-auto mb-4 backdrop-blur-sm border border-white/10">{children}</pre>,
                    blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-400/50 pl-4 italic text-white/70 mb-4 backdrop-blur-sm">{children}</blockquote>,
                    strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                    em: ({ children }) => <em className="italic text-white/90">{children}</em>,
                    a: ({ children, href }) => (
                      <a 
                        href={href} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-blue-300 hover:text-blue-200 underline transition-colors"
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
                <div className="w-2 h-2 bg-blue-400/60 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-purple-400/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-pink-400/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="text-sm">Sending...</span>
            </div>
          )}

          {/* Tools (only for bot messages) */}
          {!isUser && hasTools && (
            <div className="mt-4 space-y-3">
              {message.tools!.map((tool, index) => (
                <ToolCallDisplay 
                  key={`${tool.name}-${index}`}
                  tool={tool}
                  onToggle={() => onToggleTool(index)}
                />
              ))}
            </div>
          )}

          {/* Retry button for error messages */}
          {isError && message.canRetry && message.originalUserMessage && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <button
                onClick={() => onRetry(message.originalUserMessage!)}
                className="inline-flex items-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-sm text-red-200 hover:text-red-100 transition-all backdrop-blur-sm"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Try again</span>
              </button>
            </div>
          )}

          {/* Action buttons for both user and bot messages */}
          <div className={`flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity ${isUser ? 'justify-end' : 'justify-start'}`}>
            {isUser ? (
              // Resend button for user messages
              <button
                onClick={() => onRetry(message.content)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs text-white/50 hover:text-white/70 hover:bg-white/5 rounded transition-all backdrop-blur-sm"
                title="Resend message"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Resend</span>
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
        <div className="w-[140px] h-[140px] bg-blue-500/10 backdrop-blur-sm border border-blue-400/30 rounded-2xl flex items-center justify-center">
          <div className="text-center text-blue-200/70">
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
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 to-blue-600/30 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-all duration-300 -inset-1"></div>
        
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-500/20 to-blue-600/20 backdrop-blur-sm border border-blue-400/30 group-hover:border-blue-300/50 transition-all duration-300 shadow-lg">
          {/* Loading state */}
          {isImageLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-blue-500/10">
              <Loader2 className="w-5 h-5 text-blue-300 animate-spin" />
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
          <div className="absolute inset-0 bg-blue-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="text-white text-xs font-medium bg-blue-500/30 backdrop-blur-sm px-2 py-1 rounded-lg border border-blue-300/40">
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
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-all duration-300 -inset-1"></div>
        
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

function ToolCallDisplay({ tool, onToggle }: { 
  tool: ToolExecution; 
  onToggle: () => void;
}) {
  const getToolIcon = (name: string) => {
    if (name.includes("vision") || name.includes("image")) return Eye; // Use Eye icon for vision analysis
    if (name.includes("search") || name.includes("web")) return Globe;
    if (name.includes("email") || name.includes("subscription")) return Mail;
    if (name.includes("rag") || name.includes("document")) return Database;
    return Search;
  };

  const Icon = getToolIcon(tool.name);

  // Enhanced parsing for structured tool results
  const parseToolResult = (result: any) => {
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
    else if (percentage >= 80) color = 'text-blue-300';
    else if (percentage >= 60) color = 'text-yellow-300';
    else if (percentage >= 40) color = 'text-orange-300';
    
    return { percentage, color };
  };

  const parsedResult = tool.result ? parseToolResult(tool.result) : null;

  return (
    <div className="relative group">
      {/* Liquid glass container with subtle gradient border */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-xl">
        <button
          onClick={onToggle}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-all duration-300"
        >
          <div className="flex items-center gap-4">
            <div className={`relative p-3 rounded-xl backdrop-blur-sm ${
              tool.isRunning 
                ? "bg-blue-500/20 border border-blue-400/30" 
                : "bg-green-500/20 border border-green-400/30"
            }`}>
              {/* Glow effect */}
              <div className={`absolute inset-0 rounded-xl blur ${
                tool.isRunning 
                  ? "bg-blue-400/20" 
                  : "bg-green-400/20"
              }`}></div>
              <div className="relative">
                {tool.isRunning ? (
                  <Loader2 className="w-5 h-5 animate-spin text-blue-300" />
                ) : (
                  <Icon className="w-5 h-5 text-green-300" />
                )}
              </div>
            </div>
            <div>
              <span className="text-base font-medium text-white/90 capitalize">
                {tool.name === 'vision_analysis' ? 'AI Vision Analysis' : tool.name.replace(/_/g, ' ')}
              </span>
              {tool.isRunning ? (
                <div className="text-sm text-blue-300 mt-1 flex items-center gap-2">
                  <span>{tool.name === 'vision_analysis' ? 'Analyzing images...' : 'Running...'}</span>
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse"></div>
                    <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-green-300 mt-1">
                  {tool.name === 'vision_analysis' ? 'Analysis complete' : 'Completed'}
                </div>
              )}
            </div>
          </div>
          {tool.expanded ? (
            <ChevronDown className="w-5 h-5 text-white/50" />
          ) : (
            <ChevronRight className="w-5 h-5 text-white/50" />
          )}
        </button>

        {tool.expanded && (
          <div className="border-t border-white/10 bg-white/[0.02]">
            {/* Parameters Section */}
            {tool.args && (
              <div className="p-6 border-b border-white/5">
                <div className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Parameters
                </div>
                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                  {Object.entries(tool.args).map(([key, value]) => (
                    <div key={key} className="flex items-start gap-3 py-2">
                      <span className="text-blue-300 font-medium text-sm min-w-0 capitalize">
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
              <div className="p-6">
                <div className="text-sm font-medium text-white/70 mb-4 flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Results
                </div>
                
                {parsedResult.type === 'search_results' ? (
                  <div className="space-y-4">
                    {parsedResult.content.map((result: any, index: number) => {
                      const { percentage, color } = formatScore(result.score);
                      return (
                        <div key={index} className="relative group/result">
                          {/* Individual result liquid glass container */}
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-lg blur opacity-0 group-hover/result:opacity-100 transition-opacity duration-300"></div>
                          <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:bg-white/[0.07] transition-all duration-300">
                            {/* Header with title and score */}
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1 min-w-0">
                                <h4 className="text-white/90 font-medium text-sm leading-snug">
                                  {result.title || 'Untitled'}
                                </h4>
                                {result.url && (
                                  <a 
                                    href={result.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-300 hover:text-blue-200 text-xs mt-1 inline-flex items-center gap-1 transition-colors group/link"
                                  >
                                    <Globe className="w-3 h-3" />
                                    <span className="truncate max-w-xs">
                                      {result.url.replace(/^https?:\/\//, '').replace(/^www\./, '')}
                                    </span>
                                  </a>
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
                              <div className="text-white/70 text-xs leading-relaxed bg-white/5 rounded-md p-3 border border-white/5">
                                <p className="line-clamp-3">
                                  {result.content.length > 200 
                                    ? `${result.content.substring(0, 200)}...` 
                                    : result.content
                                  }
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : tool.name === 'vision_analysis' ? (
                  // Special styling for vision analysis results with markdown support
                  <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-sm rounded-lg p-4 border border-purple-400/20 max-h-96 overflow-y-auto">
                    <div className="flex items-center gap-2 mb-3">
                      <Eye className="w-4 h-4 text-purple-300" />
                      <span className="text-purple-200 text-sm font-medium">Vision Analysis Results</span>
                    </div>
                    <div className="prose prose-sm prose-invert max-w-none">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-3 last:mb-0 text-white/90 leading-relaxed text-sm">{children}</p>,
                          h1: ({ children }) => <h1 className="text-lg font-semibold mb-3 text-purple-200">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-base font-semibold mb-2 text-purple-200">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-semibold mb-2 text-purple-200">{children}</h3>,
                          ul: ({ children }) => <ul className="list-disc pl-4 mb-3 space-y-1 text-white/90">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-4 mb-3 space-y-1 text-white/90">{children}</ol>,
                          li: ({ children }) => <li className="text-white/90 text-sm">{children}</li>,
                          code: ({ children, node, ...props }) => 
                            (node && (node as any).inline)
                              ? <code className="bg-purple-500/20 px-1 py-0.5 rounded text-xs font-mono text-purple-200" {...props}>{children}</code>
                              : <code className="block bg-purple-500/10 p-3 rounded text-xs font-mono text-white/90 overflow-x-auto mb-3" {...props}>{children}</code>,
                          pre: ({ children }) => <pre className="bg-purple-500/10 p-3 rounded overflow-x-auto mb-3">{children}</pre>,
                          blockquote: ({ children }) => <blockquote className="border-l-4 border-purple-400/50 pl-3 italic text-white/70 mb-3">{children}</blockquote>,
                          strong: ({ children }) => <strong className="font-semibold text-purple-200">{children}</strong>,
                          em: ({ children }) => <em className="italic text-white/90">{children}</em>,
                        }}
                      >
                        {parsedResult.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                ) : parsedResult.type === 'json' ? (
                  <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 max-h-64 overflow-y-auto">
                    <pre className="text-white/80 text-xs font-mono leading-relaxed">
                      {JSON.stringify(parsedResult.content, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 max-h-64 overflow-y-auto">
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
  selectedImages,
  onImageSelect,
  onImageRemove,
  fileInputRef
}: { 
  value: string; 
  onChange: (value: string) => void; 
  onSend: () => void; 
  disabled: boolean;
  isThinking: boolean;
  selectedImages: SelectedImage[];
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageRemove: (id: string) => void;
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
    if (e.key === 'Enter' && !e.shiftKey && !disabled) {
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

      <div className="relative flex items-end gap-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl focus-within:border-white/30 focus-within:shadow-2xl transition-all duration-300">
        {/* Gradient border effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur opacity-0 focus-within:opacity-100 transition-opacity duration-300 -z-10"></div>
        
        <textarea
          ref={textareaRef}
          className="flex-1 resize-none border-0 bg-transparent px-4 py-3 text-white placeholder:text-white/40 focus:ring-0 focus:outline-none text-sm leading-relaxed"
          placeholder={isThinking ? "AI is responding..." : "Message Poultry Market AI..."}
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
          disabled={disabled}
          className="flex-shrink-0 p-2.5 m-1.5 bg-white/10 backdrop-blur-sm text-white/70 rounded-xl hover:bg-white/20 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
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
          disabled={disabled || (!value.trim() && selectedImages.length === 0)}
          className="flex-shrink-0 p-2.5 m-1.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 disabled:from-white/10 disabled:to-white/10 disabled:text-white/30 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
          title="Send message"
        >
          {disabled ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ArrowRight className="w-4 h-4" />
          )}
        </button>
      </div>
      
      <div className="mt-2 text-xs text-white/40 text-center">
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  );
}
