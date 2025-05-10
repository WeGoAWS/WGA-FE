// src/services/chatApiService.ts
import axios from 'axios';
import { useAuthStore } from '@/stores/auth';

// API URL 설정
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const chatApiBasePath = `${apiUrl}/chat`;

// 세션 및 메시지 타입 정의
export interface ChatSession {
    userId: string;
    sessionId: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    messageCount: number;
    ttl?: number;
}

export interface ChatMessage {
    sessionId: string;
    messageId: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: string;
    displayText?: string;
    isTyping?: boolean;
    animationState?: 'appear' | 'typing' | 'complete';
    ttl?: number;
}

/**
 * 채팅 API 서비스: 백엔드 API와의 통신을 담당하는 클래스
 */
class ChatApiService {
    /**
     * 사용자의 채팅 세션 목록을 가져옵니다.
     */
    async getSessions(limit = 20): Promise<ChatSession[]> {
        try {
            const authStore = useAuthStore();

            // 사용자 ID 가져오기
            const userId = this.getUserId(authStore);
            if (!userId) throw new Error('로그인이 필요합니다');

            const response = await axios.get(`${chatApiBasePath}/sessions`, {
                params: {
                    userId,
                    limit,
                },
                headers: this.getHeaders(authStore),
            });

            return response.data.sessions || [];
        } catch (error) {
            console.error('세션 목록 가져오기 오류:', error);
            throw error;
        }
    }

    /**
     * 새 채팅 세션을 생성합니다.
     */
    async createSession(title: string): Promise<ChatSession> {
        try {
            const authStore = useAuthStore();

            // 사용자 ID 가져오기
            const userId = this.getUserId(authStore);
            if (!userId) throw new Error('로그인이 필요합니다');

            const response = await axios.post(
                `${chatApiBasePath}/sessions`,
                {
                    userId,
                    title,
                },
                {
                    headers: this.getHeaders(authStore),
                },
            );

            return response.data.session;
        } catch (error) {
            console.error('세션 생성 오류:', error);
            throw error;
        }
    }

    /**
     * 특정 세션의 상세 정보를 가져옵니다.
     */
    async getSession(sessionId: string): Promise<ChatSession> {
        try {
            const authStore = useAuthStore();

            // 사용자 ID 가져오기
            const userId = this.getUserId(authStore);
            if (!userId) throw new Error('로그인이 필요합니다');

            const response = await axios.get(`${chatApiBasePath}/sessions/${sessionId}`, {
                params: { userId },
                headers: this.getHeaders(authStore),
            });

            return response.data.session;
        } catch (error) {
            console.error('세션 정보 가져오기 오류:', error);
            throw error;
        }
    }

    /**
     * 세션 정보를 업데이트합니다.
     */
    async updateSession(sessionId: string, title: string): Promise<void> {
        try {
            const authStore = useAuthStore();

            // 사용자 ID 가져오기
            const userId = this.getUserId(authStore);
            if (!userId) throw new Error('로그인이 필요합니다');

            await axios.put(
                `${chatApiBasePath}/sessions/${sessionId}`,
                {
                    userId,
                    title,
                },
                {
                    headers: this.getHeaders(authStore),
                },
            );
        } catch (error) {
            console.error('세션 업데이트 오류:', error);
            throw error;
        }
    }

    /**
     * 세션 및 관련 메시지를 삭제합니다.
     */
    async deleteSession(sessionId: string): Promise<void> {
        try {
            const authStore = useAuthStore();

            // 사용자 ID 가져오기
            const userId = this.getUserId(authStore);
            if (!userId) throw new Error('로그인이 필요합니다');

            await axios.delete(`${chatApiBasePath}/sessions/${sessionId}`, {
                params: { userId },
                headers: this.getHeaders(authStore),
            });
        } catch (error) {
            console.error('세션 삭제 오류:', error);
            throw error;
        }
    }

    /**
     * 세션의 메시지 목록을 가져옵니다.
     */
    async getMessages(sessionId: string): Promise<ChatMessage[]> {
        try {
            const authStore = useAuthStore();

            // 사용자 ID 가져오기
            const userId = this.getUserId(authStore);
            if (!userId) throw new Error('로그인이 필요합니다');

            const response = await axios.get(`${chatApiBasePath}/sessions/${sessionId}/messages`, {
                params: { userId },
                headers: this.getHeaders(authStore),
            });

            return response.data.messages || [];
        } catch (error) {
            console.error('메시지 목록 가져오기 오류:', error);
            throw error;
        }
    }

    /**
     * 세션에 새 메시지를 추가합니다.
     */
    async addMessage(sessionId: string, message: Partial<ChatMessage>): Promise<ChatMessage> {
        try {
            const authStore = useAuthStore();

            // 사용자 ID 가져오기
            const userId = this.getUserId(authStore);
            if (!userId) throw new Error('로그인이 필요합니다');

            const response = await axios.post(
                `${chatApiBasePath}/sessions/${sessionId}/messages`,
                {
                    userId,
                    ...message,
                },
                {
                    headers: this.getHeaders(authStore),
                },
            );

            return response.data.message;
        } catch (error) {
            console.error('메시지 추가 오류:', error);
            throw error;
        }
    }

    /**
     * 메시지를 삭제합니다.
     */
    async deleteMessage(sessionId: string, messageId: string): Promise<void> {
        try {
            const authStore = useAuthStore();

            // 사용자 ID 가져오기
            const userId = this.getUserId(authStore);
            if (!userId) throw new Error('로그인이 필요합니다');

            await axios.delete(`${chatApiBasePath}/sessions/${sessionId}/messages/${messageId}`, {
                params: { userId },
                headers: this.getHeaders(authStore),
            });
        } catch (error) {
            console.error('메시지 삭제 오류:', error);
            throw error;
        }
    }

    /**
     * 인증 헤더를 생성합니다.
     */
    private getHeaders(authStore: ReturnType<typeof useAuthStore>) {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        // 인증 토큰이 있으면 추가
        if (authStore.tokens.accessToken) {
            headers['Authorization'] = `Bearer ${authStore.tokens.accessToken}`;
        }

        return headers;
    }

    /**
     * 인증 정보에서 사용자 ID를 가져옵니다.
     */
    private getUserId(authStore: ReturnType<typeof useAuthStore>): string | null {
        if (!authStore.isAuthenticated || !authStore.user) return null;

        // JWT 토큰의 sub 클레임 또는 사용자명을 사용
        return (
            authStore.user.sub ||
            authStore.user['cognito:username'] ||
            authStore.user.username ||
            authStore.user.email
        );
    }
}

// 서비스 인스턴스 생성 및 내보내기
export const chatApiService = new ChatApiService();

export default chatApiService;
