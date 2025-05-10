// src/stores/chatbotWithPersistence.ts
import { defineStore } from 'pinia';
import axios from 'axios';
import type { ChatMessage, ChatSession } from '@/services/chatApiService';
import chatApiService from '@/services/chatApiService';
import { useAuthStore } from '@/stores/auth';

// 채팅봇 상태 인터페이스
interface ChatbotState {
    loading: boolean;
    error: string;
    sessions: ChatSession[];
    currentSession: ChatSession | null;
    currentMessages: ChatMessage[];
    waitingForResponse: boolean;
}

// 타이핑 시뮬레이션 속도 설정 (밀리초 단위)
const TYPING_SPEED = 10;
const MAX_TYPING_TIME = 2000;

export const useChatbotStore = defineStore('chatbot-with-persistence', {
    state: (): ChatbotState => ({
        loading: false,
        error: '',
        sessions: [],
        currentSession: null,
        currentMessages: [],
        waitingForResponse: false,
    }),

    getters: {
        hasSessions: (state) => state.sessions.length > 0,
    },

    actions: {
        // 채팅 세션 목록 불러오기
        async fetchSessions() {
            this.loading = true;
            this.error = '';

            try {
                // 백엔드 API에서 세션 목록 불러오기
                const sessions = await chatApiService.getSessions();
                this.sessions = sessions;

                // 세션이 있으면 첫 번째 세션 선택
                if (sessions.length > 0 && !this.currentSession) {
                    await this.selectSession(sessions[0].sessionId);
                }
            } catch (err: any) {
                console.error('채팅 세션 목록 가져오기 오류:', err);
                this.error = err.message || '채팅 세션 목록을 불러오는 중 오류가 발생했습니다.';
            } finally {
                this.loading = false;
            }
        },

        // 새 채팅 세션 생성
        async createNewSession(title = '새 대화') {
            try {
                const now = new Date().toISOString();
                title = title || `새 대화 ${now.split('T')[0]}`;

                // 백엔드 API로 세션 생성
                const newSession = await chatApiService.createSession(title);

                // 로컬 상태 업데이트
                this.sessions.unshift(newSession);
                this.currentSession = newSession;
                this.currentMessages = [];

                return newSession;
            } catch (err: any) {
                console.error('새 채팅 세션 생성 오류:', err);
                this.error = err.message || '새 채팅 세션을 생성하는 중 오류가 발생했습니다.';
                throw err;
            }
        },

        // 채팅 세션 선택
        async selectSession(sessionId: string) {
            try {
                // 백엔드에서 세션 정보 가져오기
                const session = await chatApiService.getSession(sessionId);
                this.currentSession = session;

                // 세션의 메시지 목록 가져오기
                const messages = await chatApiService.getMessages(sessionId);
                this.currentMessages = messages;
            } catch (err: any) {
                console.error('채팅 세션 선택 오류:', err);
                this.error = err.message || '채팅 세션을 선택하는 중 오류가 발생했습니다.';
            }
        },

        // 세션 제목 업데이트
        async updateSessionTitle(sessionId: string, title: string) {
            try {
                // 백엔드 API로 세션 제목 업데이트
                await chatApiService.updateSession(sessionId, title);

                // 로컬 상태 업데이트
                const sessionIndex = this.sessions.findIndex((s) => s.sessionId === sessionId);
                if (sessionIndex >= 0) {
                    this.sessions[sessionIndex].title = title;
                }

                if (this.currentSession && this.currentSession.sessionId === sessionId) {
                    this.currentSession.title = title;
                }
            } catch (err: any) {
                console.error('세션 제목 업데이트 오류:', err);
                this.error = err.message || '세션 제목을 업데이트하는 중 오류가 발생했습니다.';
            }
        },

        // 메시지 전송
        async sendMessage(text: string) {
            if (!text.trim()) return;

            // 현재 세션이 없으면 새 세션 생성
            if (!this.currentSession) {
                await this.createNewSession(
                    text.length > 30 ? text.substring(0, 30) + '...' : text,
                );
            }

            if (!this.currentSession) {
                console.error('세션 생성 실패');
                return;
            }

            const sessionId = this.currentSession.sessionId;

            // 사용자 메시지 생성
            const userMessage: Partial<ChatMessage> = {
                text: text,
                sender: 'user',
                animationState: 'appear',
            };

            try {
                // 백엔드 API에 사용자 메시지 저장
                const savedUserMessage = await chatApiService.addMessage(sessionId, userMessage);

                // 로컬 상태 업데이트
                this.currentMessages.push(savedUserMessage);

                // 첫 메시지인 경우 세션 제목 업데이트
                if (this.currentMessages.length === 1) {
                    await this.updateSessionTitle(
                        sessionId,
                        text.length > 30 ? text.substring(0, 30) + '...' : text,
                    );
                }

                // 봇 응답 처리
                this.waitingForResponse = true;

                // 로딩 중 표시 (타이핑 중 표시)
                const loadingMessage: Partial<ChatMessage> = {
                    text: '...',
                    sender: 'bot',
                    isTyping: true,
                };

                const savedLoadingMessage = await chatApiService.addMessage(
                    sessionId,
                    loadingMessage,
                );
                this.currentMessages.push(savedLoadingMessage);

                // API 호출하여 봇 응답 가져오기
                const botResponseText = await this.generateBotResponse(text);

                // 로딩 메시지 삭제
                await chatApiService.deleteMessage(sessionId, savedLoadingMessage.messageId);
                this.currentMessages = this.currentMessages.filter(
                    (msg) => msg.messageId !== savedLoadingMessage.messageId,
                );

                // 실제 타이핑 효과를 위한 봇 메시지 추가
                const botMessage: Partial<ChatMessage> = {
                    text: botResponseText,
                    displayText: '', // 초기에는 빈 문자열로 시작
                    sender: 'bot',
                    animationState: 'typing',
                };

                const savedBotMessage = await chatApiService.addMessage(sessionId, botMessage);
                this.currentMessages.push(savedBotMessage);

                // 타이핑 애니메이션
                await this.simulateTyping(savedBotMessage.messageId, botResponseText);

                // 세션 갱신 (업데이트 시간 변경을 위해)
                const updatedSession = await chatApiService.getSession(sessionId);
                const index = this.sessions.findIndex((s) => s.sessionId === sessionId);
                if (index >= 0) {
                    this.sessions[index] = updatedSession;
                }
                this.currentSession = updatedSession;
            } catch (err: any) {
                console.error('봇 응답 가져오기 오류:', err);

                // 오류 메시지 추가
                const errorMessage: Partial<ChatMessage> = {
                    text: '죄송합니다. 응답을 처리하는 중에 오류가 발생했습니다. 다시 시도해 주세요.',
                    sender: 'bot',
                    animationState: 'appear',
                };

                if (this.currentSession) {
                    const savedErrorMessage = await chatApiService.addMessage(
                        this.currentSession.sessionId,
                        errorMessage,
                    );
                    this.currentMessages.push(savedErrorMessage);
                }
            } finally {
                this.waitingForResponse = false;
            }
        },

        // 타이핑 애니메이션 시뮬레이션
        async simulateTyping(messageId: string, fullText: string) {
            if (!this.currentSession) return;

            const messageIndex = this.currentMessages.findIndex((m) => m.messageId === messageId);
            if (messageIndex < 0) return;

            const typingSpeed = TYPING_SPEED; // 문자당 타이핑 시간 (밀리초)
            const maxTypingTime = MAX_TYPING_TIME; // 최대 타이핑 시간 (밀리초)

            // 최대 타이핑 시간에 맞춰 속도 조절
            const totalTypingTime = Math.min(fullText.length * typingSpeed, maxTypingTime);
            const charInterval = totalTypingTime / fullText.length;

            // 메시지 업데이트를 위한 복사본 생성
            const message = { ...this.currentMessages[messageIndex] };
            message.displayText = '';

            for (let i = 0; i < fullText.length; i++) {
                await new Promise((resolve) => setTimeout(resolve, charInterval));

                // 메시지가 여전히 존재하는지 확인 (삭제되었을 수 있음)
                const currentMessageIndex = this.currentMessages.findIndex(
                    (m) => m.messageId === messageId,
                );
                if (currentMessageIndex < 0) return;

                // 다음 글자 추가
                const updatedMessage = { ...this.currentMessages[currentMessageIndex] };
                updatedMessage.displayText = fullText.substring(0, i + 1);

                // 로컬 상태 업데이트
                this.currentMessages.splice(currentMessageIndex, 1, updatedMessage);

                // 백엔드에 주기적으로 업데이트 (매 10글자마다)
                if (i % 10 === 0 || i === fullText.length - 1) {
                    try {
                        // 백엔드 API 호출 (비동기로 처리하고 결과 기다리지 않음)
                        chatApiService
                            .addMessage(this.currentSession.sessionId, {
                                text: fullText,
                                displayText: updatedMessage.displayText,
                                sender: 'bot',
                                animationState: 'typing',
                            })
                            .catch((err) => console.error('메시지 업데이트 오류:', err));
                    } catch (err) {
                        console.error('타이핑 업데이트 오류:', err);
                    }
                }
            }

            // 애니메이션 완료 상태로 변경
            const finalMessageIndex = this.currentMessages.findIndex(
                (m) => m.messageId === messageId,
            );
            if (finalMessageIndex >= 0) {
                const completedMessage = { ...this.currentMessages[finalMessageIndex] };
                completedMessage.animationState = 'complete';

                // 로컬 상태 업데이트
                this.currentMessages.splice(finalMessageIndex, 1, completedMessage);

                // 백엔드 업데이트
                try {
                    await chatApiService.addMessage(this.currentSession.sessionId, {
                        text: fullText,
                        displayText: fullText,
                        sender: 'bot',
                        animationState: 'complete',
                    });
                } catch (err) {
                    console.error('메시지 완료 상태 업데이트 오류:', err);
                }
            }
        },

        // 간단한 봇 응답 생성 함수 (실제 구현에서는 API 호출로 대체)
        async generateBotResponse(userMessage: string): Promise<string> {
            try {
                // API URL 설정 - 환경변수나 설정에서 가져오는 것이 좋습니다
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                const authStore = useAuthStore();

                console.log('API 요청 전송:', userMessage);

                // API 호출
                const response = await axios.post(
                    `${apiUrl}/llm1`,
                    {
                        text: userMessage,
                        sessionId: this.currentSession?.sessionId,
                        userId:
                            authStore.user?.sub ||
                            authStore.user?.['cognito:username'] ||
                            authStore.user?.username,
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            ...(authStore.tokens.accessToken
                                ? { Authorization: `Bearer ${authStore.tokens.accessToken}` }
                                : {}),
                        },
                        withCredentials: true, // 쿠키 및 인증 정보 포함
                    },
                );

                console.log('API 응답 수신:', response.data);

                // API 응답 처리 로직 개선
                if (response.data) {
                    // 응답이 배열 형태인지 확인 (첫 번째 형식: answer가 배열)
                    if (Array.isArray(response.data.answer)) {
                        console.log('배열 형태의 응답 변환 처리');
                        // rank_order로 정렬
                        const sortedItems = [...response.data.answer].sort(
                            (a, b) => a.rank_order - b.rank_order,
                        );

                        // 배열을 문자열로 변환
                        return sortedItems
                            .map((item) => `${item.context}\n${item.title}\n${item.url}`)
                            .join('\n\n');
                    } else if (typeof response.data.answer === 'string') {
                        console.log('문자열 형태의 응답 처리');
                        // 이미 문자열 형태인 경우 (두 번째 형식)
                        return response.data.answer;
                    } else {
                        console.log('예상 외 응답 형식:', typeof response.data.answer);
                        // 응답 형식이 예상과 다른 경우
                        return JSON.stringify(response.data.answer);
                    }
                }

                console.log('유효한 응답 데이터가 없음');
                return '죄송합니다. 유효한 응답 데이터를 받지 못했습니다.';
            } catch (error) {
                console.error('봇 응답 API 호출 오류:', error);

                // API 호출 실패 시 폴백 메시지 반환
                return '죄송합니다. 응답을 처리하는 중에 오류가 발생했습니다. 다시 시도해 주세요.';
            }
        },

        // 채팅 세션 삭제
        async deleteSession(sessionId: string) {
            try {
                // 백엔드 API에서 세션 삭제
                await chatApiService.deleteSession(sessionId);

                // 로컬 상태 업데이트
                this.sessions = this.sessions.filter((s) => s.sessionId !== sessionId);

                // 현재 선택된 세션이 삭제된 경우
                if (this.currentSession && this.currentSession.sessionId === sessionId) {
                    this.currentSession = this.sessions.length > 0 ? this.sessions[0] : null;

                    if (this.currentSession) {
                        // 새 세션의 메시지 불러오기
                        await this.selectSession(this.currentSession.sessionId);
                    } else {
                        this.currentMessages = [];
                    }
                }
            } catch (err: any) {
                console.error('채팅 세션 삭제 오류:', err);
                this.error = err.message || '채팅 세션을 삭제하는 중 오류가 발생했습니다.';
            }
        },

        // 채팅 기록 클리어 (현재 세션의 메시지만 삭제)
        async clearMessages() {
            if (!this.currentSession) return;

            try {
                const sessionId = this.currentSession.sessionId;

                // 각 메시지 삭제
                for (const message of this.currentMessages) {
                    await chatApiService.deleteMessage(sessionId, message.messageId);
                }

                // 로컬 상태 업데이트
                this.currentMessages = [];

                // 세션 정보 갱신
                const updatedSession = await chatApiService.getSession(sessionId);
                const index = this.sessions.findIndex((s) => s.sessionId === sessionId);
                if (index >= 0) {
                    this.sessions[index] = updatedSession;
                }
                this.currentSession = updatedSession;
            } catch (err: any) {
                console.error('메시지 삭제 오류:', err);
                this.error = err.message || '메시지를 삭제하는 중 오류가 발생했습니다.';
            }
        },

        // 상태 초기화
        resetState() {
            this.loading = false;
            this.error = '';
            this.sessions = [];
            this.currentSession = null;
            this.currentMessages = [];
            this.waitingForResponse = false;
        },
    },
});
