"use client";

import React from "react";
import { useMemo, useRef, useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowRight, Loader2, Search, Bot, ChevronDown, ChevronRight, Database, Globe, Mail, MessageSquare, User, RotateCcw, AlertCircle, Copy, Send } from "lucide-react";

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
  content: string; // Ensure this is always a string
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

export default function ChatPage() {
  const [message, setMessage] = useState("");
  const [threadId, setThreadId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const currentToolsRef = useRef<ToolExecution[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("thread_id");
    if (saved && typeof saved === 'string') {
      setThreadId(saved);
    }
  }, []);

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
    }
  };

  const sendMessage = async (messageText?: string) => {
    // Handle case where an event object is passed instead of text
    let rawText: string;
    if (typeof messageText === 'string') {
      rawText = messageText;
    } else if (messageText && typeof messageText === 'object' && 'target' in messageText) {
      // It's an event object, ignore it and use the input value
      rawText = message.trim();
    } else {
      rawText = message.trim();
    }
    
    const textToSend = typeof rawText === 'string' ? rawText : String(rawText);
    console.log('sendMessage - rawText:', rawText, 'textToSend:', textToSend, 'type:', typeof textToSend);
    if (!textToSend || isThinking) return;
    
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: textToSend, // This should already be a string now
      timestamp: new Date(),
    };
    
    console.log('userMsg created:', userMsg);
    
    setMessages(prev => [...prev, userMsg]);
    if (!messageText) setMessage(""); // Only clear input if sending new message
    setIsThinking(true);
    currentToolsRef.current = [];

    // Start assistant response
    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: assistantId,
      type: "assistant",
      content: "",
      tools: [],
      isStreaming: true,
      timestamp: new Date(),
    }]);

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

      if (!wsUrl) {
        throw new Error("Could not resolve WebSocket URL");
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      let hasReceivedResponse = false;
      const responseTimeout = setTimeout(() => {
        if (!hasReceivedResponse) {
          ws.close();
          handleConnectionError(assistantId, textToSend);
        }
      }, 30000); // 30 second timeout

      ws.onopen = () => {
        const payload = { 
          message: typeof textToSend === 'string' ? textToSend : String(textToSend), 
          thread_id: typeof threadId === 'string' ? threadId : undefined 
        };
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
            }
          }

          if (data.type === "tool_start") {
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
            setMessages(prev => prev.map(msg => 
              msg.id === assistantId 
                ? { ...msg, content: finalContent, isStreaming: false }
                : msg
            ));
            setIsThinking(false);
          }
        } catch (err) {
          console.error("WebSocket message error:", err);
          handleConnectionError(assistantId, textToSend);
        }
      };

      ws.onclose = (event) => {
        clearTimeout(responseTimeout);
        if (!hasReceivedResponse && event.code !== 1000) {
          handleConnectionError(assistantId, textToSend);
        } else {
          setIsThinking(false);
          setMessages(prev => prev.map(msg => 
            msg.id === assistantId && msg.isStreaming
              ? { ...msg, isStreaming: false }
              : msg
          ));
        }
      };

      ws.onerror = () => {
        clearTimeout(responseTimeout);
        handleConnectionError(assistantId, textToSend);
      };
    } catch (error) {
      handleConnectionError(assistantId, textToSend);
    }
  };

  const handleConnectionError = (assistantId: string, originalMessage: string) => {
    setIsThinking(false);
    setMessages(prev => prev.map(msg => {
      if (msg.id === assistantId) {
        return {
          ...msg,
          type: "error" as const,
          content: "I'm having trouble connecting to my systems right now. This sometimes happens, but don't worry - you can try sending your message again.",
          isStreaming: false,
          canRetry: true,
          originalUserMessage: originalMessage,
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
      // You could add a toast notification here if desired
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Glass morphism overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-white/[0.05]"></div>
      
      <div className="relative z-10 mx-auto max-w-4xl px-4 py-6">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl blur opacity-75"></div>
              <div className="relative bg-slate-800/80 backdrop-blur-xl rounded-xl p-2 border border-white/10">
                <Bot className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Poultry Market AI</h1>
              <p className="text-xs text-slate-400">Intelligent assistant for poultry industry insights</p>
            </div>
          </div>
          <button 
            onClick={doNewConversation} 
            className="group relative px-4 py-2 bg-slate-800/50 backdrop-blur-xl rounded-lg border border-white/10 text-slate-300 text-sm transition-all duration-300 hover:bg-slate-700/50 hover:text-white"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <span className="relative">New Chat</span>
          </button>
        </header>

        <main className="grid grid-rows-[1fr,auto] gap-4 h-[calc(100vh-8rem)]">
          <div className="relative bg-slate-900/30 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] to-transparent"></div>
            <ChatArea messages={messages} onToggleTool={toggleToolExpansion} isThinking={isThinking} onRetry={retryMessage} onCopy={copyToClipboard} />
          </div>

          <div className="relative bg-slate-900/30 backdrop-blur-xl rounded-2xl border border-white/10 p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] to-transparent rounded-2xl"></div>
            <ChatInput 
              value={message} 
              onChange={setMessage} 
              onSend={sendMessage} 
              disabled={isThinking}
              isThinking={isThinking}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

function ChatArea({ messages, onToggleTool, isThinking, onRetry, onCopy }: { 
  messages: ChatMessage[]; 
  onToggleTool: (messageId: string, toolIndex: number) => void;
  isThinking: boolean;
  onRetry: (originalMessage: string) => void;
  onCopy: (text: string) => Promise<void>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div ref={scrollRef} className="relative h-full overflow-y-auto p-6 space-y-6">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur opacity-30"></div>
            <div className="relative bg-slate-800/50 backdrop-blur-xl rounded-full p-4 border border-white/20">
              <MessageSquare className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <h2 className="text-xl font-medium text-white mb-2">How can I help you today?</h2>
          <p className="text-slate-400 text-sm max-w-md">Ask me anything about poultry farming, market trends, or subscription services.</p>
        </div>
      )}

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
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          <span className="text-sm">AI is thinking and researching...</span>
        </div>
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
  const isUser = message.type === "user";
  const isError = message.type === "error";
  const hasTools = message.tools && message.tools.length > 0;

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="relative flex-shrink-0">
          <div className={`absolute inset-0 bg-gradient-to-r ${isError ? "from-rose-500 to-orange-500" : "from-blue-500 to-purple-500"} rounded-lg blur opacity-50`}></div>
          <div className="relative bg-slate-800/80 backdrop-blur-xl rounded-lg p-2 border border-white/10">
            {isError ? (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            ) : (
              <Bot className="w-4 h-4 text-blue-400" />
            )}
          </div>
        </div>
      )}

      <div className={`max-w-[80%] ${isUser ? "order-first" : ""}`}>
        <div className={`relative rounded-2xl px-4 py-3 ${
          isUser 
            ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white ml-auto"
            : isError
              ? "bg-gradient-to-r from-rose-900/50 to-orange-900/50 backdrop-blur-xl border border-rose-500/20 text-rose-100"
              : "bg-slate-800/50 backdrop-blur-xl border border-white/10 text-slate-100"
        }`}>
          {!isUser && <div className={`absolute inset-0 bg-gradient-to-br ${isError ? "from-rose-500/[0.08]" : "from-white/[0.08]"} to-transparent rounded-2xl`}></div>}
          
          <div className="relative">
            {message.content && (
              <div className={`prose prose-sm max-w-none ${isUser ? "prose-invert" : isError ? "prose-rose" : "prose-slate"}`}>
                {/* {console.log('Rendering message content:', message.content, 'type:', typeof message.content)} */}
                <ReactMarkdown>{
                  typeof message.content === 'string' 
                    ? message.content 
                    : typeof message.content === 'object'
                      ? JSON.stringify(message.content, null, 2)
                      : String(message.content)
                }</ReactMarkdown>
              </div>
            )}

            {message.isStreaming && !message.content && (
              <div className="flex items-center gap-2 text-slate-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="text-xs">Generating response...</span>
              </div>
            )}

            {hasTools && (
              <div className="mt-3 space-y-2">
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
              <div className="mt-3 pt-3 border-t border-rose-500/20">
                <button
                  onClick={() => onRetry(message.originalUserMessage!)}
                  className="group relative inline-flex items-center gap-2 px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 rounded-lg text-xs text-rose-200 hover:text-white transition-all duration-200"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-rose-400/10 to-orange-400/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                  <RotateCcw className="w-3 h-3 relative" />
                  <span className="relative">Try again</span>
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Action buttons */}
        <div className={`flex items-center gap-2 mt-2 ${isUser ? "justify-end" : "justify-start"}`}>
          {isUser ? (
            // Resend button for user messages
            <button
              onClick={() => onRetry(message.content)}
              className="group relative inline-flex items-center gap-1 px-2 py-1 bg-slate-700/30 hover:bg-slate-600/40 border border-white/10 rounded text-[10px] text-slate-400 hover:text-slate-200 transition-all duration-200"
              title="Resend message"
            >
              <Send className="w-3 h-3" />
              <span>Resend</span>
            </button>
          ) : (
            // Copy button for AI messages
            !isError && message.content && (
              <button
                onClick={() => onCopy(message.content)}
                className="group relative inline-flex items-center gap-1 px-2 py-1 bg-slate-700/30 hover:bg-slate-600/40 border border-white/10 rounded text-[10px] text-slate-400 hover:text-slate-200 transition-all duration-200"
                title="Copy message"
              >
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </button>
            )
          )}
        </div>
        
        <div className={`text-xs ${isError ? "text-rose-400" : "text-slate-500"} mt-1 ${isUser ? "text-right" : "text-left"}`}>
          {message.timestamp.toLocaleTimeString()}
        </div>
      </div>

      {isUser && (
        <div className="relative flex-shrink-0">
          <div className="bg-slate-700/50 backdrop-blur-xl rounded-lg p-2 border border-white/10">
            <User className="w-4 h-4 text-slate-300" />
          </div>
        </div>
      )}
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

  const formatToolResult = (result: any, toolName: string) => {
    if (typeof result === 'string') {
      // Handle web search results
      if (toolName.includes("web") || toolName.includes("search")) {
        return parseWebSearchResult(result);
      }
      return <div className="text-xs text-slate-300 whitespace-pre-wrap">{result}</div>;
    }
    
    // Handle structured data
    if (result && typeof result === 'object') {
      return <pre className="text-xs bg-slate-950/50 rounded p-2 overflow-x-auto text-slate-300 max-h-32 overflow-y-auto">
        {JSON.stringify(result, null, 2)}
      </pre>;
    }
    
    return <div className="text-xs text-slate-400">No result</div>;
  };

  const parseWebSearchResult = (result: string) => {
    // Parse web search results format
    const sections = result.split('---').map(s => s.trim()).filter(Boolean);
    
    return (
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {sections.map((section, idx) => {
          const lines = section.split('\n').filter(Boolean);
          const titleMatch = lines.find(l => l.startsWith('Title:'));
          const urlMatch = lines.find(l => l.startsWith('URL:'));
          const contentMatch = lines.find(l => l.startsWith('Content:'));
          const scoreMatch = lines.find(l => l.startsWith('Score:'));
          
          const title = titleMatch?.replace('Title:', '').trim() || `Result ${idx + 1}`;
          const url = urlMatch?.replace('URL:', '').trim();
          const content = contentMatch?.replace('Content:', '').trim();
          const score = scoreMatch?.replace('Score:', '').trim();
          
          return (
            <div key={idx} className="bg-slate-800/30 rounded-lg p-3 border border-white/5">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="text-xs font-medium text-slate-200 leading-tight">{title}</h4>
                {score && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full flex-shrink-0">
                    {parseFloat(score).toFixed(2)}
                  </span>
                )}
              </div>
              
              {url && (
                <div className="flex items-center gap-1 mb-2">
                  <Globe className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  <a 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] text-blue-400 hover:text-blue-300 truncate"
                  >
                    {url}
                  </a>
                </div>
              )}
              
              {content && (
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {content.length > 200 ? `${content.substring(0, 200)}...` : content}
                </p>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const formatToolArgs = (args: any) => {
    if (!args) return null;
    
    if (typeof args === 'object' && !Array.isArray(args)) {
      return (
        <div className="space-y-2">
          {Object.entries(args).map(([key, value]) => (
            <div key={key} className="flex flex-col gap-1">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{key}:</span>
              <div className="text-xs bg-slate-950/50 rounded p-2 text-slate-300">
                {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
              </div>
            </div>
          ))}
        </div>
      );
    }
    
    return (
      <pre className="text-xs bg-slate-950/50 rounded p-2 overflow-x-auto text-slate-300">
        {JSON.stringify(args, null, 2)}
      </pre>
    );
  };

  return (
    <div className="bg-slate-900/30 backdrop-blur-sm rounded-lg border border-white/5 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-white/5 transition-colors duration-200"
      >
        <div className="flex items-center gap-2">
          <div className={`p-1 rounded ${tool.isRunning ? "bg-amber-500/20" : "bg-emerald-500/20"}`}>
            {tool.isRunning ? (
              <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
            ) : (
              <Icon className="w-3 h-3 text-emerald-400" />
            )}
          </div>
          <span className="text-xs font-medium text-slate-300 capitalize">
            {tool.name.replace(/_/g, ' ')}
          </span>
          {tool.isRunning && (
            <span className="text-xs text-amber-400">Running...</span>
          )}
        </div>
        {tool.expanded ? (
          <ChevronDown className="w-3 h-3 text-slate-400" />
        ) : (
          <ChevronRight className="w-3 h-3 text-slate-400" />
        )}
      </button>

      {tool.expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-white/5">
          {tool.args && (
            <div>
              <div className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1">
                <Search className="w-3 h-3" />
                Query Parameters
              </div>
              {formatToolArgs(tool.args)}
            </div>
          )}
          
          {tool.result && (
            <div>
              <div className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1">
                <Database className="w-3 h-3" />
                Results
              </div>
              {formatToolResult(tool.result, tool.name)}
            </div>
          )}
        </div>
      )}
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
  return (
    <div className="relative flex items-end gap-3">
      <div className="flex-1 relative">
        <textarea
          className="w-full bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-3 pr-12 text-slate-100 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
          placeholder={isThinking ? "AI is processing..." : "Ask me anything about poultry..."}
          value={value}
          onChange={(e) => {
            const inputValue = e.target.value;
            const cleanValue = typeof inputValue === 'string' ? inputValue : String(inputValue);
            onChange(cleanValue);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !disabled) {
              e.preventDefault();
              onSend();
            }
          }}
          disabled={disabled}
          rows={1}
          style={{ minHeight: '48px', maxHeight: '120px' }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] to-transparent rounded-xl pointer-events-none"></div>
      </div>
      
      <button
        onClick={() => onSend()}
        disabled={disabled || !value.trim()}
        className="group relative px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-500 hover:to-purple-500 disabled:hover:from-blue-600 disabled:hover:to-purple-600"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-xl blur opacity-0 group-hover:opacity-30 group-disabled:opacity-0 transition-opacity duration-300"></div>
        <div className="relative flex items-center gap-2">
          {disabled ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ArrowRight className="w-4 h-4" />
          )}
          <span>{disabled ? "Sending..." : "Send"}</span>
        </div>
      </button>
    </div>
  );
}
