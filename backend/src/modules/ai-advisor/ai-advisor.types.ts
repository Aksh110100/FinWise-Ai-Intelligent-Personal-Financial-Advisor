export interface ChatRequestDto {
  conversationId?: string;
  message: string;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  metadata?: any;
  createdAt: Date;
}

export interface ConversationDto {
  id: string;
  userId: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatResponseDto {
  success: boolean;
  data: {
    conversation: ConversationDto;
    userMessage: MessageDto;
    assistantMessage: MessageDto;
  };
}
