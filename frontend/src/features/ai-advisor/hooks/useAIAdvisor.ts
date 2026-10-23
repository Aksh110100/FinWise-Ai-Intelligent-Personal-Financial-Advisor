import { useState, useCallback, useEffect, useRef } from 'react';
import * as aiService from '../services/ai-advisor.service';

export const useAIAdvisor = () => {
  const [conversations, setConversations] = useState<aiService.Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<aiService.ChatMessage[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use a ref to track conversation ID so the sendMessage callback always
  // reads the latest value even if it was captured in a stale closure.
  const activeConversationRef = useRef<string | null>(null);
  activeConversationRef.current = activeConversationId;

  // Guard against duplicate in-flight requests
  const isSendingRef = useRef(false);

  const fetchConversations = useCallback(async () => {
    setIsLoadingConversations(true);
    try {
      const data = await aiService.getConversations();
      setConversations(data);
    } catch (err: any) {
      console.error('[useAIAdvisor] fetchConversations error:', err.message);
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  const loadConversation = useCallback(async (conversationId: string) => {
    setIsLoadingMessages(true);
    try {
      const msgs = await aiService.getConversationMessages(conversationId);
      setMessages(msgs);
      setActiveConversationId(conversationId);
      localStorage.setItem('finwise_ai_active_conversation', conversationId);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load conversation messages');
      setActiveConversationId(null);
      localStorage.removeItem('finwise_ai_active_conversation');
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  const startNewConversation = useCallback(() => {
    setActiveConversationId(null);
    localStorage.removeItem('finwise_ai_active_conversation');
    setError(null);
    setMessages([
      {
        id: 'init-1',
        sender: 'ai',
        text: 'Your finances have a few patterns worth looking at.'
      },
      {
        id: 'init-2',
        sender: 'ai',
        text: 'I can help you understand spending, improve savings, plan investments and work toward your goals.'
      }
    ]);
  }, []);

  const selectConversation = useCallback((conversationId: string) => {
    loadConversation(conversationId);
  }, [loadConversation]);

  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      await aiService.deleteConversation(conversationId);
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      if (activeConversationRef.current === conversationId) {
        startNewConversation();
      }
    } catch (err: any) {
      setError('Failed to delete conversation');
    }
  }, [startNewConversation]);

  const renameConversation = useCallback(async (conversationId: string, title: string) => {
    try {
      const updated = await aiService.renameConversation(conversationId, title);
      setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, title: updated.title } : c));
    } catch (err: any) {
      setError('Failed to rename conversation');
    }
  }, []);

  // Initial mount load
  const hasLoaded = useRef(false);
  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    const init = async () => {
      setIsLoadingConversations(true);
      try {
        const data = await aiService.getConversations();
        setConversations(data);
        
        const persistedId = localStorage.getItem('finwise_ai_active_conversation');
        if (persistedId && data.some(c => c.id === persistedId)) {
          // If valid, load it
          await loadConversation(persistedId);
        } else {
          // Otherwise, start new
          startNewConversation();
        }
      } catch (err: any) {
        console.error('[useAIAdvisor] init error:', err.message);
        setError('Failed to load history. You can still chat.');
        startNewConversation();
      } finally {
        setIsLoadingConversations(false);
      }
    };
    init();
  }, [loadConversation, startNewConversation]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Prevent duplicate in-flight requests using a ref (synchronous check)
    if (isSendingRef.current) return;
    isSendingRef.current = true;
    setIsSending(true);
    setError(null);

    const tempId = `temp-${Date.now()}`;
    const newMsg: aiService.ChatMessage = { id: tempId, sender: 'user', text: trimmed };

    setMessages(prev => [...prev, newMsg]);

    try {
      const convId = activeConversationRef.current || undefined;
      const data = await aiService.sendMessage(trimmed, convId);

      // Update conversationId if this was the first message
      if (!activeConversationRef.current && data.conversation) {
        setActiveConversationId(data.conversation.id);
        localStorage.setItem('finwise_ai_active_conversation', data.conversation.id);
        
        // Also update local list so the new conversation shows up instantly
        setConversations(prev => {
          // ensure no duplicates
          if (prev.find(c => c.id === data.conversation.id)) return prev;
          return [{ id: data.conversation.id, title: data.conversation.title, updatedAt: data.conversation.updatedAt }, ...prev];
        });
      }

      setMessages(prev => [
        ...prev.filter(m => m.id !== tempId),
        { id: data.userMessage.id, sender: 'user' as const, text: data.userMessage.content },
        { id: data.assistantMessage.id, sender: 'ai' as const, text: data.assistantMessage.content }
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      // Keep the user's message visible but mark it differently
      // so the user can see what they tried to send
    } finally {
      isSendingRef.current = false;
      setIsSending(false);
    }
  }, [fetchConversations]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    conversations,
    activeConversationId,
    messages,
    isLoadingConversations,
    isLoadingMessages,
    isSending,
    error,
    sendMessage,
    loadConversation,
    startNewConversation,
    selectConversation,
    deleteConversation,
    renameConversation,
    clearError
  };
};
