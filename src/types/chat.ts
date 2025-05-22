// src/types/chat.ts
export interface ChatMessageType {
    id: string;
    sender: 'user' | 'bot';
    text: string;
    displayText?: string; // 타이핑 애니메이션을 위한 표시 텍스트
    timestamp: string;
    isTyping?: boolean; // 타이핑 중인지 여부
    animationState?: 'appear' | 'typing' | 'complete'; // 애니메이션 상태
    query_string?: string;
    query_result?: any[];
    elapsed_time?: string | number;
    inference?: any;
}

export interface ChatSession {
    sessionId: string;
    userId: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    messages: ChatMessageType[];
}

export interface ChatHistoryState {
    loading: boolean;
    error: string | null;
    sessions: ChatSession[];
    currentSession: ChatSession | null;
    waitingForResponse: boolean;
}

export interface BotResponse {
    text: string;
    query_string?: string;
    query_result?: any[];
    elapsed_time?: string | number;
    inference?: any;
}
