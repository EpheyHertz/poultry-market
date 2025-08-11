"use client";

import React from "react";
import { useMemo, useRef, useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowRight, Loader2, Search, Bot, ChevronDown, ChevronRight, Database, Globe, Mail, MessageSquare, User, RotateCcw, AlertCircle, Copy, Send, Plus } from "lucide-react";

type EventMsg = {
  type: "status" | "tool_start" | "tool_result" | "final" | "error" | "info";
  message?: string;
  name?: string;
  args?: any;
  output?: any;
  thread_id?: string;
  final?: boolean;
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
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: string;
  }>;
  summary?: string;
};

export default function ChatPage() {
  const [message, setMessage] = useState("");
  const [threadId, setThreadId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const currentToolsRef = useRef<ToolExecution[]>([]);

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
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

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
        // console.log('📋 Parsed Conversation Data:', conversationData);
        
        // Check if we have the messages array (new backend structure)
        if (conversationData && conversationData.messages && Array.isArray(conversationData.messages)) {
          const historyMessages: ChatMessage[] = conversationData.messages.map((msg: any, index: number) => ({
            id: `history-${index}-${Date.now()}`,
            type: msg.role === "user" ? "user" : "assistant",
            content: msg.content || "",
            timestamp: new Date(msg.timestamp || Date.now()),
            tools: [],
            isStreaming: false,
          }));
          
          // console.log('📋 Converted History Messages:', historyMessages);
          setMessages(historyMessages);
          
          // Log additional conversation metadata
          if (conversationData.summary) {
            console.log('📋 Conversation Summary:', conversationData.summary);
          }
          if (conversationData.topics) {
            console.log('📋 Recent Topics:', conversationData.topics);
          }
        } else {
          console.warn('📋 No messages found in conversation history');
          setMessages([]);
        }
      } else {
        // console.warn('Failed to load conversation history:', response.status);
        setMessages([]);
      }
    } catch (error) {
      // console.error('Error loading conversation history:', error);
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
    if (!textToSend || isThinking) return;
    
    // console.log('📤 Sending message:', textToSend);
    // console.log('📤 Current thread ID:', threadId);
    
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: textToSend,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMsg]);
    
    // Always clear the input field after sending (whether it's a retry or new message)
    setMessage("");
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
          thread_id: typeof threadId === 'string' ? threadId : undefined 
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
            setMessages(prev => prev.map(msg => 
              msg.id === assistantId 
                ? { 
                    ...msg, 
                    content: data.message || "", 
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
            // console.log('✅ Final Message:', finalContent);
            setMessages(prev => prev.map(msg => 
              msg.id === assistantId 
                ? { ...msg, content: finalContent, isStreaming: false }
                : msg
            ));
            setIsThinking(false);
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

function ToolCallDisplay({ tool, onToggle }: { 
  tool: ToolExecution; 
  onToggle: () => void;
}) {
  const getToolIcon = (name: string) => {
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
                {tool.name.replace(/_/g, ' ')}
              </span>
              {tool.isRunning ? (
                <div className="text-sm text-blue-300 mt-1 flex items-center gap-2">
                  <span>Running...</span>
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse"></div>
                    <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-green-300 mt-1">Completed</div>
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

function ChatInput({ value, onChange, onSend, disabled, isThinking }: { 
  value: string; 
  onChange: (value: string) => void; 
  onSend: () => void; 
  disabled: boolean;
  isThinking: boolean;
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
        
        <button
          onClick={onSend}
          disabled={disabled || !value.trim()}
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
