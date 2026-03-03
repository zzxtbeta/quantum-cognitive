// Chat相关类型定义

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  context?: {
    signalId?: string;
    domainId?: string;
    companyId?: string;
  };
  sources?: Array<{
    type: 'signal' | 'paper' | 'company';
    id: string;
    title: string;
  }>;
}

export interface ChatContext {
  type: 'signal' | 'domain' | 'company' | 'general';
  id?: string;
  title?: string;
}

export interface ChatRequest {
  message: string;
  context?: ChatContext;
  history?: ChatMessage[];
}

export interface ChatResponse {
  message: ChatMessage;
}
