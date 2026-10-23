import { apiClient } from '../../../api/client';

export interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  createdAt?: string;
}

export interface Conversation {
  id: string;
  title: string | null;
  updatedAt: string;
}

export const getConversations = async (): Promise<Conversation[]> => {
  const response = await apiClient.get('/ai/conversations');
  return response.data.data;
};

export const getConversationMessages = async (conversationId: string): Promise<ChatMessage[]> => {
  const response = await apiClient.get(`/ai/conversations/${conversationId}`);
  const messages = response.data.data.Messages;
  return messages.map((m: any) => ({
    id: m.id,
    sender: m.role === 'USER' ? 'user' : 'ai',
    text: m.content,
    createdAt: m.createdAt
  }));
};

export const sendMessage = async (message: string, conversationId?: string) => {
  const response = await apiClient.post('/ai/chat', { message, conversationId });
  return response.data.data;
};

export const deleteConversation = async (conversationId: string) => {
  const response = await apiClient.delete(`/ai/conversations/${conversationId}`);
  return response.data;
};

export const renameConversation = async (conversationId: string, title: string) => {
  const response = await apiClient.patch(`/ai/conversations/${conversationId}`, { title });
  return response.data.data;
};
