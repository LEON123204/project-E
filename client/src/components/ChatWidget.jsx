import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send } from 'lucide-react';
import { getLocalAccessToken } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLoginPrompt } from '../context/LoginPromptContext';

// Base API URL — reads from Vite env (falls back to relative path handled by dev proxy)
const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

// ---------------------------------------------------------------------------
// Markdown link renderer
// Parses [text](/product/id) patterns in assistant messages and renders them
// as React Router <Link> elements. All other text is emitted as plain spans
// so whitespace-pre-wrap, bullet points, and bolding are unaffected.
// Incomplete links mid-stream (i.e. unclosed brackets) remain as plain text
// and will re-render correctly once the full token arrives.
// ---------------------------------------------------------------------------
const PRODUCT_LINK_RE = /\[([^\]]+)\]\(\/product\/([^)]+)\)/g;

function renderMessageContent(content, isUser) {
  if (isUser) return content; // user messages are always plain text

  const parts = [];
  let lastIndex = 0;
  let match;
  PRODUCT_LINK_RE.lastIndex = 0; // reset stateful regex

  while ((match = PRODUCT_LINK_RE.exec(content)) !== null) {
    // Push any plain text before this match
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    const [, linkText, productId] = match;
    parts.push(
      <Link
        key={`${productId}-${match.index}`}
        to={`/product/${productId}`}
        className="rex-product-link"
      >
        {linkText}
      </Link>
    );
    lastIndex = match.index + match[0].length;
  }

  // Push remaining plain text after the last match
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length > 0 ? parts : content;
}

// ---------------------------------------------------------------------------
// ATC tag parser
// Detects <!--ATC:PRODUCT_ID--> anywhere in assistant content,
// strips it from the visible text, returns { cleanContent, atcProductId }.
// Only processed once streaming is done to avoid mid-stream flicker.
// ---------------------------------------------------------------------------
function parseATC(content) {
  const atcRe = /<!--ATC:([a-f0-9]{24})-->/i;
  const match = content.match(atcRe);
  if (!match) return { cleanContent: content, atcProductId: null };
  const atcProductId = match[1];
  const cleanContent = content.replace(atcRe, '').replace(/\n{3,}/g, '\n\n').trimEnd();
  return { cleanContent, atcProductId };
}

// ---------------------------------------------------------------------------
// Follow-up suggestion chip generator
// Rule-based, no extra LLM call. Detects query type from the user's message
// and returns 2-3 short suggestion strings.
// ---------------------------------------------------------------------------
const PRICE_QUERY_RE = /\b(under|below|above|over|between|cheaper|budget|affordable|less than|more than)\b/i;
const ORDER_QUERY_RE = /\b(order|track|delivery|shipped|status|dispatch|return|refund)\b/i;
const CART_QUERY_RE  = /\b(add|cart|buy|purchase|take it|get it|checkout)\b/i;

function generateSuggestions(userMessage) {
  if (!userMessage) return [];
  const msg = userMessage.toLowerCase();
  if (ORDER_QUERY_RE.test(msg)) {
    return ['Track another order', 'View recent orders', 'What\'s my refund status?'];
  }
  if (CART_QUERY_RE.test(msg) && !PRICE_QUERY_RE.test(msg)) {
    return ['Show similar products', 'What\'s in stock?', 'View my cart'];
  }
  if (PRICE_QUERY_RE.test(msg)) {
    return ['Show cheaper options', 'Filter by category', 'What\'s most popular?'];
  }
  // Generic product search
  if (/\b(show|find|search|recommend|suggest|what|which)\b/i.test(msg)) {
    return ['Show similar products', 'Compare prices', 'What\'s in stock?'];
  }
  return ['Browse all products', 'What\'s on sale?'];
}

const ChatWidget = () => {
  const { isAuthenticated } = useAuth();
  const { showPrompt } = useLoginPrompt();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm Rex, your AI shopping assistant. How can I help you today?"
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  // atcStatus: keyed by message index, value: 'idle'|'loading'|'success'|'error', message
  const [atcStatus, setAtcStatus] = useState({});

  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Auto-scroll to the bottom of message list on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isTyping, isOpen]);

  // Handle Tooltip trigger on first session load
  useEffect(() => {
    const hasSeenTooltip = sessionStorage.getItem('rex-chat-tooltip-shown');
    if (!hasSeenTooltip) {
      const showTimer = setTimeout(() => {
        setShowTooltip(true);
      }, 1000);

      const hideTimer = setTimeout(() => {
        setShowTooltip(false);
        sessionStorage.setItem('rex-chat-tooltip-shown', 'true');
      }, 6000); // stay visible for 5 seconds

      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    }
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isStreaming) return;

    const userMessageContent = inputValue.trim();

    // Build conversation history to send (last 8 messages, exclude the initial greeting)
    const historyToSend = messages.slice(-8).map(m => ({
      role: m.role,
      content: m.content
    }));

    // Append user message immediately
    setMessages(prev => [...prev, { role: 'user', content: userMessageContent }]);
    setInputValue('');
    setIsTyping(true);
    setIsStreaming(true);

    // Read auth token if present from in-memory API service
    let authHeader = {};
    try {
      const storedToken = getLocalAccessToken();
      if (storedToken) {
        authHeader = { Authorization: `Bearer ${storedToken}` };
      }
    } catch (_) { /* proceed as guest */ }

    // Create an abort controller for cleanup on unmount / panel close
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader
        },
        credentials: 'include', // include cookies (same as axios config)
        body: JSON.stringify({
          message: userMessageContent,
          conversationHistory: historyToSend
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantMessageIndex = null;
      let firstTokenReceived = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE frames are separated by double newline
        const frames = buffer.split('\n\n');
        buffer = frames.pop(); // last item may be incomplete

        for (const frame of frames) {
          if (!frame.trim()) continue;

          // Parse event type and data from SSE frame
          const lines = frame.split('\n');
          let eventType = 'token';
          let dataLine = '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice('event: '.length).trim();
            } else if (line.startsWith('data: ')) {
              dataLine = line.slice('data: '.length).trim();
            }
          }

          if (!dataLine) continue;

          let parsed;
          try {
            parsed = JSON.parse(dataLine);
          } catch (_) {
            continue;
          }

          if (eventType === 'token' && parsed.text) {
            if (!firstTokenReceived) {
              // Transition: remove typing indicator, add empty assistant bubble
              firstTokenReceived = true;
              setIsTyping(false);
              setMessages(prev => {
                assistantMessageIndex = prev.length;
                return [...prev, { role: 'assistant', content: parsed.text }];
              });
            } else {
              // Append token to the last assistant message
              setMessages(prev => {
                const updated = [...prev];
                if (assistantMessageIndex !== null && updated[assistantMessageIndex]) {
                  updated[assistantMessageIndex] = {
                    ...updated[assistantMessageIndex],
                    content: updated[assistantMessageIndex].content + parsed.text
                  };
                }
                return updated;
              });
            }
          } else if (eventType === 'error') {
            throw new Error(parsed.message || 'Stream error');
          }
          // 'done' event — stream finished, loop will exit naturally
        }
      }

      // If we never got a token (empty response), show a fallback
      if (!firstTokenReceived) {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: "I didn't receive a response. Please try again." }
        ]);
      } else {
        // Stream done — post-process the completed assistant message:
        // 1. Parse + strip any ATC tag embedded by the LLM
        // 2. Generate follow-up suggestion chips
        setMessages(prev => {
          const updated = [...prev];
          if (assistantMessageIndex !== null && updated[assistantMessageIndex]) {
            const raw = updated[assistantMessageIndex].content;
            const { cleanContent, atcProductId } = parseATC(raw);
            const chips = generateSuggestions(userMessageContent);
            updated[assistantMessageIndex] = {
              ...updated[assistantMessageIndex],
              content: cleanContent,
              atcProductId: atcProductId || null,
              chips
            };
          }
          return updated;
        });
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        // Panel was closed mid-stream — silent exit
        return;
      }
      console.error('[Rex] Chat error:', err.message);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "Sorry, I'm having trouble connecting right now. Please try again in a moment."
        }
      ]);
    } finally {
      setIsTyping(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleToggle = () => {
    // Abort any in-progress stream when closing
    if (!isOpen === false && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsOpen(!isOpen);
    if (showTooltip) {
      setShowTooltip(false);
      sessionStorage.setItem('rex-chat-tooltip-shown', 'true');
    }
  };

  // Send a chip suggestion as a user message (same flow as typing + submitting)
  const handleChipSend = (chipText) => {
    if (isStreaming) return;
    setInputValue(chipText);
    // Trigger submit on next tick so inputValue is set
    setTimeout(() => {
      const fakeEvent = { preventDefault: () => {} };
      setInputValue('');
      const userMsg = chipText;
      const historyToSend = messages.slice(-8).map(m => ({ role: m.role, content: m.content }));
      setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
      setIsTyping(true);
      setIsStreaming(true);

      let authHeader = {};
      try {
        const storedToken = getLocalAccessToken();
        if (storedToken) authHeader = { Authorization: `Bearer ${storedToken}` };
      } catch (_) {}

      const controller = new AbortController();
      abortControllerRef.current = controller;

      (async () => {
        try {
          const response = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader },
            credentials: 'include',
            body: JSON.stringify({ message: userMsg, conversationHistory: historyToSend }),
            signal: controller.signal
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buf = '';
          let msgIndex = null;
          let firstToken = false;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const frames = buf.split('\n\n');
            buf = frames.pop();
            for (const frame of frames) {
              if (!frame.trim()) continue;
              const lines = frame.split('\n');
              let evType = 'token', dataLine = '';
              for (const line of lines) {
                if (line.startsWith('event: ')) evType = line.slice(7).trim();
                else if (line.startsWith('data: ')) dataLine = line.slice(6).trim();
              }
              if (!dataLine) continue;
              let parsed;
              try { parsed = JSON.parse(dataLine); } catch (_) { continue; }
              if (evType === 'token' && parsed.text) {
                if (!firstToken) {
                  firstToken = true;
                  setIsTyping(false);
                  setMessages(prev => { msgIndex = prev.length; return [...prev, { role: 'assistant', content: parsed.text }]; });
                } else {
                  setMessages(prev => {
                    const u = [...prev];
                    if (msgIndex !== null && u[msgIndex]) u[msgIndex] = { ...u[msgIndex], content: u[msgIndex].content + parsed.text };
                    return u;
                  });
                }
              } else if (evType === 'error') throw new Error(parsed.message || 'Stream error');
            }
          }

          if (firstToken) {
            setMessages(prev => {
              const u = [...prev];
              if (msgIndex !== null && u[msgIndex]) {
                const { cleanContent, atcProductId } = parseATC(u[msgIndex].content);
                u[msgIndex] = { ...u[msgIndex], content: cleanContent, atcProductId: atcProductId || null, chips: generateSuggestions(userMsg) };
              }
              return u;
            });
          }
        } catch (err) {
          if (err.name === 'AbortError') return;
          setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble right now. Please try again." }]);
        } finally {
          setIsTyping(false);
          setIsStreaming(false);
          abortControllerRef.current = null;
        }
      })();
    }, 0);
  };

  // Add-to-cart call from Rex's inline button
  const handleAddToCartClick = async (productId, msgIndex) => {
    if (!isAuthenticated) {
      showPrompt({
        title: 'Sign in to add items to your cart',
        showGuestOption: false,
        redirectUrl: '/cart'
      });
      return;
    }
    setAtcStatus(prev => ({ ...prev, [msgIndex]: { state: 'loading' } }));
    let authHeader = {};
    try {
      const storedToken = getLocalAccessToken();
      if (storedToken) authHeader = { Authorization: `Bearer ${storedToken}` };
    } catch (_) {}

    try {
      const res = await fetch(`${API_BASE}/chat/add-to-cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        credentials: 'include',
        body: JSON.stringify({ productId, quantity: 1 })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAtcStatus(prev => ({ ...prev, [msgIndex]: { state: 'success', message: data.message } }));
        // Auto-clear success after 3 seconds
        setTimeout(() => setAtcStatus(prev => ({ ...prev, [msgIndex]: { state: 'done' } })), 3000);
      } else {
        setAtcStatus(prev => ({ ...prev, [msgIndex]: { state: 'error', message: data.message || 'Could not add to cart.' } }));
        setTimeout(() => setAtcStatus(prev => ({ ...prev, [msgIndex]: { state: 'idle' } })), 4000);
      }
    } catch (_) {
      setAtcStatus(prev => ({ ...prev, [msgIndex]: { state: 'error', message: 'Network error. Please try again.' } }));
      setTimeout(() => setAtcStatus(prev => ({ ...prev, [msgIndex]: { state: 'idle' } })), 4000);
    }
  };

  return (
    <>
      <AnimatePresence mode="wait">
        {!isOpen ? (
          <motion.div
            key="bubble"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-40 select-none"
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              className="relative"
            >
              {/* Onboarding Tooltip */}
              <AnimatePresence>
                {showTooltip && (
                  <motion.div
                    initial={{ opacity: 0, x: 15, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 15, scale: 0.9 }}
                    className="absolute right-[60px] md:right-[76px] bottom-1 md:bottom-2 bg-slate-900 border border-indigo-500/20 text-slate-100 text-xs font-semibold px-3.5 py-2.5 rounded-xl shadow-2xl shadow-indigo-500/10 whitespace-nowrap z-50 flex items-center gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>Ask Rex anything</span>
                    {/* Tooltip pointer arrow */}
                    <div className="absolute right-[-5px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-slate-900 border-t border-r border-indigo-500/20 rotate-45" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Main Collapsed Bubble Button */}
              <button
                onClick={handleToggle}
                className="relative flex items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-xl shadow-purple-500/20 text-white cursor-pointer active:scale-95 transition-transform outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-950 w-12 h-12 md:w-[60px] md:h-[60px]"
                aria-label="Open chat assistant"
              >
                <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-white" />

                {/* Soft pulsing outward rings */}
                <div className="absolute inset-0 rounded-full -z-10 overflow-visible pointer-events-none">
                  {[...Array(2)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500"
                      initial={{ scale: 1, opacity: 0.4 }}
                      animate={{ scale: 1.6, opacity: 0 }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: 'easeOut',
                        delay: i * 1.25
                      }}
                    />
                  ))}
                </div>
              </button>
            </motion.div>
          </motion.div>
        ) : (
          /* Expanded Chat Panel */
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="fixed inset-0 sm:inset-4 md:inset-auto md:bottom-6 md:right-6 md:w-[360px] md:h-[580px] z-50 flex flex-col bg-slate-950 border border-slate-900 shadow-2xl rounded-none sm:rounded-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white select-none">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-white/10 rounded-lg">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold tracking-wide text-sm">Rex</span>
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </div>
                  <span className="text-[10px] text-indigo-100 font-medium">AI Shopping Helper</span>
                </div>
              </div>
              <button
                onClick={handleToggle}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white outline-none focus:ring-1 focus:ring-white/30"
                aria-label="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Message Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              {messages.map((message, index) => {
                const isUser = message.role === 'user';
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex items-start gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Rex Avatar */}
                    {!isUser && (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-[10px] text-white font-bold shrink-0 shadow-md shadow-purple-500/10">
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}

                    {/* Bubble + ATC + chips stacked vertically, sitting beside the avatar */}
                    {!isUser ? (
                      <div className="flex flex-col items-start gap-1.5 min-w-0 max-w-[78%]">
                        {/* Message Bubble */}
                        <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-none text-sm shadow-sm leading-relaxed whitespace-pre-wrap bg-slate-900 border border-slate-800 text-slate-100">
                          {renderMessageContent(message.content, isUser)}
                        </div>

                        {/* Add-to-Cart button — only when ATC tag present and stream finished */}
                        {message.atcProductId && !isStreaming && (() => {
                          const s = atcStatus[index];
                          if (s?.state === 'done') return null;
                          if (s?.state === 'success') return (
                            <span className="rex-atc-success">✓ {s.message}</span>
                          );
                          if (s?.state === 'error') return (
                            <span className="rex-atc-error">{s.message}</span>
                          );
                          return (
                            <button
                              onClick={() => handleAddToCartClick(message.atcProductId, index)}
                              disabled={s?.state === 'loading'}
                              className="rex-atc-btn"
                            >
                              {s?.state === 'loading' ? (
                                <span className="flex items-center gap-1.5">
                                  <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                  Adding...
                                </span>
                              ) : (
                                <span>🛒 Add to Cart</span>
                              )}
                            </button>
                          );
                        })()}

                        {/* Follow-up suggestion chips — only on last completed assistant message */}
                        {!isStreaming && message.chips?.length > 0 && index === messages.length - 1 && (
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {message.chips.map((chip, ci) => (
                              <button
                                key={ci}
                                onClick={() => handleChipSend(chip)}
                                className="rex-chip"
                              >
                                {chip}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* User bubble — no chips or ATC, plain single div */
                      <div className="px-3.5 py-2.5 rounded-2xl rounded-tr-none text-sm shadow-sm leading-relaxed whitespace-pre-wrap max-w-[78%] bg-gradient-to-tr from-indigo-500 to-purple-600 text-white border border-indigo-400/10">
                        {renderMessageContent(message.content, isUser)}
                      </div>
                    )}
                  </motion.div>

                );
              })}

              {/* Typing/Loading Indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2.5 justify-start"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-[10px] text-white font-bold shrink-0 shadow-md shadow-purple-500/10">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 border-t border-slate-900 bg-slate-950 flex gap-2"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask Rex about products, deals..."
                className="flex-1 bg-slate-900/60 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none transition-smooth"
                maxLength={400}
              />
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className="p-2.5 bg-gradient-to-tr from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:opacity-40 disabled:hover:from-indigo-500 disabled:hover:to-purple-500 text-white rounded-xl transition-all duration-200 shadow-md shadow-purple-500/10 flex items-center justify-center shrink-0"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatWidget;
