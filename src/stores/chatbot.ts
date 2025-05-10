// frontend/src/stores/chatbot.ts
import { defineStore } from 'pinia';
import axios from 'axios';
import { useAuthStore } from '@/stores/auth';

interface ChatMessage {
    id: string;
    sender: 'user' | 'bot';
    text: string;
    displayText?: string; // 타이핑 애니메이션을 위한 표시 텍스트
    timestamp: string;
    isTyping?: boolean; // 타이핑 중인지 여부
    animationState?: 'appear' | 'typing' | 'complete'; // 애니메이션 상태
}

interface ChatSession {
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: string;
    updatedAt: string;
}

interface ChatbotState {
    loading: boolean;
    error: string;
    sessions: ChatSession[];
    currentSession: ChatSession | null;
    waitingForResponse: boolean;
}

interface RankItem {
    context: string;
    rank_order: number;
    title: string;
    url: string;
}

// 유니크 ID 생성 함수
const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export const useChatbotStore = defineStore('chatbot', {
    state: (): ChatbotState => ({
        loading: false,
        error: '',
        sessions: [],
        currentSession: null,
        waitingForResponse: false,
    }),

    getters: {
        hasSessions: (state) => state.sessions.length > 0,

        currentMessages: (state) => {
            return state.currentSession?.messages || [];
        },
    },

    actions: {
        // 채팅 세션 목록 불러오기
        async fetchSessions() {
            this.loading = true;
            this.error = '';

            try {
                const authStore = useAuthStore();
                const apiUrl = import.meta.env.VITE_API_URL || '/api';

                // 로그인 여부 확인
                if (!authStore.isAuthenticated) {
                    throw new Error('로그인이 필요합니다.');
                }

                // API 호출을 통해 채팅 세션 목록을 가져옴
                const response = await axios.get(`${apiUrl}/sessions`, {
                    params: { userId: authStore.user?.sub || authStore.user?.id },
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${authStore.tokens.idToken}`,
                    },
                });

                if (response.data && response.data.sessions) {
                    this.sessions = response.data.sessions;

                    // 현재 세션이 없고, 세션이 존재하면 첫번째 세션을 현재 세션으로 설정
                    if (!this.currentSession && this.sessions.length > 0) {
                        await this.selectSession(this.sessions[0].id);
                    }
                }
            } catch (err: any) {
                console.error('채팅 세션 목록 가져오기 오류:', err);
                this.error = err.message || '채팅 세션 목록을 불러오는 중 오류가 발생했습니다.';

                // API 실패 시 로컬 데이터로 폴백 (개발 환경에서 사용)
                if (import.meta.env.DEV) {
                    const now = new Date().toISOString();
                    const yesterday = new Date(Date.now() - 86400000).toISOString();

                    if (this.sessions.length === 0) {
                        this.sessions = [
                            {
                                id: 'session-1',
                                title: '보안 정책 질문',
                                messages: [
                                    {
                                        id: 'msg-1',
                                        sender: 'user',
                                        text: 'AWS S3 버킷 접근 권한 설정은 어떻게 하나요?',
                                        timestamp: yesterday,
                                    },
                                    {
                                        id: 'msg-2',
                                        sender: 'bot',
                                        text: 'AWS S3 버킷의 접근 권한은 버킷 정책과 IAM 정책을 통해 설정할 수 있습니다. 버킷 정책은 특정 버킷에 대한 접근을 제어하는 JSON 문서입니다. IAM 정책은 사용자, 그룹 또는 역할에 연결되어 AWS 리소스에 대한 접근을 제어합니다.',
                                        timestamp: yesterday,
                                    },
                                ],
                                createdAt: yesterday,
                                updatedAt: yesterday,
                            },
                            {
                                id: 'session-2',
                                title: '로그 분석 도구 추천',
                                messages: [
                                    {
                                        id: 'msg-3',
                                        sender: 'user',
                                        text: 'AWS 로그 분석에 좋은 도구가 무엇인가요?',
                                        timestamp: now,
                                    },
                                    {
                                        id: 'msg-4',
                                        sender: 'bot',
                                        text: 'AWS 로그 분석을 위해 여러 도구를 사용할 수 있습니다. AWS 자체 서비스로는 CloudWatch Logs Insights, Amazon Athena, Amazon OpenSearch Service 등이 있습니다. 서드파티 도구로는 Splunk, ELK Stack(Elasticsearch, Logstash, Kibana), Datadog 등이 인기가 있습니다.',
                                        timestamp: now,
                                    },
                                ],
                                createdAt: now,
                                updatedAt: now,
                            },
                        ];
                    }
                }
            } finally {
                this.loading = false;
            }
        },

        // 새 채팅 세션 생성
        async createNewSession() {
            try {
                const authStore = useAuthStore();
                const apiUrl = import.meta.env.VITE_API_URL || '/api';
                const now = new Date().toISOString();

                // 로그인 여부 확인
                if (!authStore.isAuthenticated) {
                    // 개발 환경에서는 로컬 데이터 사용
                    if (import.meta.env.DEV) {
                        const newSession: ChatSession = {
                            id: generateId(),
                            title: '새 대화',
                            messages: [],
                            createdAt: now,
                            updatedAt: now,
                        };

                        this.sessions.unshift(newSession);
                        this.currentSession = newSession;

                        return newSession;
                    }

                    throw new Error('로그인이 필요합니다.');
                }

                // API 호출을 통해 새 세션 생성
                const response = await axios.post(
                    `${apiUrl}/sessions`,
                    {
                        userId: authStore.user?.sub || authStore.user?.id,
                        title: '새 대화',
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${authStore.tokens.idToken}`,
                        },
                    },
                );

                if (response.data) {
                    const newSession: ChatSession = {
                        id: response.data.sessionId,
                        title: response.data.title,
                        messages: [],
                        createdAt: response.data.createdAt,
                        updatedAt: response.data.updatedAt,
                    };

                    this.sessions.unshift(newSession);
                    this.currentSession = newSession;

                    return newSession;
                }

                throw new Error('새 세션 생성에 실패했습니다.');
            } catch (err: any) {
                console.error('새 세션 생성 오류:', err);
                this.error = err.message || '새 세션을 생성하는 중 오류가 발생했습니다.';

                // 오류 발생 시 로컬 세션 생성 (개발 환경)
                if (import.meta.env.DEV) {
                    const now = new Date().toISOString();
                    const newSession: ChatSession = {
                        id: generateId(),
                        title: '새 대화',
                        messages: [],
                        createdAt: now,
                        updatedAt: now,
                    };

                    this.sessions.unshift(newSession);
                    this.currentSession = newSession;

                    return newSession;
                }

                return null;
            }
        },

        // 채팅 세션 선택
        async selectSession(sessionId: string) {
            try {
                const authStore = useAuthStore();
                const apiUrl = import.meta.env.VITE_API_URL || '/api';

                // 로컬에서 세션 찾기
                const localSession = this.sessions.find((s) => s.id === sessionId);
                if (!localSession) {
                    throw new Error('선택한 세션을 찾을 수 없습니다.');
                }

                // 개발 환경이거나 세션에 메시지가 이미 있으면 로컬 데이터 사용
                if (
                    import.meta.env.DEV ||
                    (localSession.messages && localSession.messages.length > 0)
                ) {
                    this.currentSession = localSession;
                    return;
                }

                // API 호출을 통해 세션 메시지 가져오기
                const response = await axios.get(`${apiUrl}/sessions/${sessionId}/messages`, {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${authStore.tokens.idToken}`,
                    },
                });

                if (response.data && response.data.messages) {
                    // 응답에서 받은 메시지로 세션 업데이트
                    localSession.messages = response.data.messages;
                    this.currentSession = localSession;
                } else {
                    // 메시지가 없는 경우 빈 배열로 설정
                    localSession.messages = [];
                    this.currentSession = localSession;
                }
            } catch (err: any) {
                console.error('세션 선택 오류:', err);
                this.error = err.message || '세션을 선택하는 중 오류가 발생했습니다.';

                // 오류 발생 시 로컬 세션 선택 (개발 환경)
                if (import.meta.env.DEV) {
                    const session = this.sessions.find((s) => s.id === sessionId);
                    if (session) {
                        this.currentSession = session;
                    }
                }
            }
        },

        // 메시지 전송
        async sendMessage(text: string) {
            if (!text.trim()) return;

            // 현재 세션이 없으면 새 세션 생성
            if (!this.currentSession) {
                await this.createNewSession();
            }

            const now = new Date().toISOString();

            // 사용자 메시지 추가 (애니메이션 상태 포함)
            const userMessage: ChatMessage = {
                id: generateId(),
                sender: 'user',
                text: text,
                timestamp: now,
                animationState: 'appear',
            };

            this.currentSession!.messages.push(userMessage);
            this.currentSession!.updatedAt = now;

            // 첫 메시지인 경우 세션 제목 업데이트
            if (this.currentSession!.messages.length === 1) {
                const title = text.length > 30 ? text.substring(0, 30) + '...' : text;
                this.currentSession!.title = title;

                // API를 통해 세션 제목 업데이트
                this.updateSessionTitle(this.currentSession!.id, title);
            }

            // API로 메시지 저장
            this.saveMessage(this.currentSession!.id, userMessage);

            // 봇 응답 처리
            this.waitingForResponse = true;

            try {
                // 로딩 중 표시 (타이핑 중 표시)
                const loadingMessage: ChatMessage = {
                    id: generateId(),
                    sender: 'bot',
                    text: '...',
                    timestamp: new Date().toISOString(),
                    isTyping: true,
                };

                this.currentSession!.messages.push(loadingMessage);

                // API 호출하여 봇 응답 가져오기
                const botResponseText = await this.generateBotResponse(text);

                // 로딩 메시지 제거
                this.currentSession!.messages = this.currentSession!.messages.filter(
                    (msg) => msg.id !== loadingMessage.id,
                );

                // 실제 타이핑 효과를 위한 봇 메시지 추가
                const botMessage: ChatMessage = {
                    id: generateId(),
                    sender: 'bot',
                    text: botResponseText,
                    displayText: '', // 초기에는 빈 문자열로 시작
                    timestamp: new Date().toISOString(),
                    animationState: 'typing',
                };

                this.currentSession!.messages.push(botMessage);
                this.currentSession!.updatedAt = botMessage.timestamp;

                // API로 봇 메시지 저장
                this.saveMessage(this.currentSession!.id, botMessage);

                // 타이핑 애니메이션
                await this.simulateTyping(botMessage.id, botResponseText);
            } catch (err: any) {
                console.error('봇 응답 가져오기 오류:', err);

                // 오류 메시지 추가
                const errorMessage: ChatMessage = {
                    id: generateId(),
                    sender: 'bot',
                    text: '죄송합니다. 응답을 처리하는 중에 오류가 발생했습니다. 다시 시도해 주세요.',
                    timestamp: new Date().toISOString(),
                    animationState: 'appear',
                };

                this.currentSession!.messages.push(errorMessage);
                this.currentSession!.updatedAt = errorMessage.timestamp;

                // API로 오류 메시지 저장
                this.saveMessage(this.currentSession!.id, errorMessage);
            } finally {
                this.waitingForResponse = false;
            }
        },

        // API를 통해 세션 제목 업데이트
        async updateSessionTitle(sessionId: string, title: string) {
            try {
                const authStore = useAuthStore();
                const apiUrl = import.meta.env.VITE_API_URL || '/api';

                // 개발 환경에서는 API 호출 스킵
                if (import.meta.env.DEV) {
                    return;
                }

                // API 호출을 통해 세션 제목 업데이트
                await axios.put(
                    `${apiUrl}/sessions/${sessionId}`,
                    {
                        title: title,
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${authStore.tokens.idToken}`,
                        },
                    },
                );
            } catch (err) {
                console.error('세션 제목 업데이트 오류:', err);
                // 실패해도 UI에는 영향 없음
            }
        },

        // API를 통해 메시지 저장
        async saveMessage(sessionId: string, message: ChatMessage) {
            try {
                const authStore = useAuthStore();
                const apiUrl = import.meta.env.VITE_API_URL || '/api';

                // 개발 환경에서는 API 호출 스킵
                if (import.meta.env.DEV) {
                    return;
                }

                // API 호출을 통해 메시지 저장
                await axios.post(
                    `${apiUrl}/sessions/${sessionId}/messages`,
                    {
                        sender: message.sender,
                        text: message.text,
                        timestamp: message.timestamp,
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${authStore.tokens.idToken}`,
                        },
                    },
                );
            } catch (err) {
                console.error('메시지 저장 오류:', err);
                // 실패해도 UI에는 영향 없음
            }
        },

        // 타이핑 애니메이션 시뮬레이션
        async simulateTyping(messageId: string, fullText: string) {
            if (!this.currentSession) return;

            const message = this.currentSession.messages.find((m) => m.id === messageId);
            if (!message) return;

            const typingSpeed = 10; // 문자당 타이핑 시간 (밀리초)
            const maxTypingTime = 2000; // 최대 타이핑 시간 (밀리초)

            // 최대 타이핑 시간에 맞춰 속도 조절
            const totalTypingTime = Math.min(fullText.length * typingSpeed, maxTypingTime);
            const charInterval = totalTypingTime / fullText.length;

            message.displayText = '';

            for (let i = 0; i < fullText.length; i++) {
                await new Promise((resolve) => setTimeout(resolve, charInterval));

                // 메시지가 여전히 존재하는지 확인 (삭제되었을 수 있음)
                const updatedMessage = this.currentSession?.messages.find(
                    (m) => m.id === messageId,
                );
                if (!updatedMessage) return;

                // 다음 글자 추가
                updatedMessage.displayText = fullText.substring(0, i + 1);
            }

            // 애니메이션 완료 상태로 변경
            const completedMessage = this.currentSession.messages.find((m) => m.id === messageId);
            if (completedMessage) {
                completedMessage.animationState = 'complete';
            }
        },

        // 간단한 봇 응답 생성 함수 (실제 구현에서는 API 호출로 대체)
        async generateBotResponse(userMessage: string): Promise<string> {
            try {
                // API URL 설정 - 환경변수나 설정에서 가져오는 것이 좋습니다
                const apiUrl = import.meta.env.VITE_API_URL || '/api';

                console.log('API 요청 전송:', userMessage);

                // API 호출
                const response = await axios.post(
                    `${apiUrl}/llm1`,
                    {
                        text: userMessage,
                        sessionId: this.currentSession?.id,
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
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
                            (a: RankItem, b: RankItem) => a.rank_order - b.rank_order,
                        );

                        // 배열을 문자열로 변환
                        return sortedItems
                            .map((item: RankItem) => `${item.context}\n${item.title}\n${item.url}`)
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
                const authStore = useAuthStore();
                const apiUrl = import.meta.env.VITE_API_URL || '/api';

                // 개발 환경이 아닌 경우 API 호출
                if (!import.meta.env.DEV) {
                    await axios.delete(`${apiUrl}/sessions/${sessionId}`, {
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${authStore.tokens.idToken}`,
                        },
                    });
                }

                // 로컬 상태 업데이트
                this.sessions = this.sessions.filter((s) => s.id !== sessionId);

                // 현재 선택된 세션이 삭제된 경우
                if (this.currentSession && this.currentSession.id === sessionId) {
                    this.currentSession = this.sessions.length > 0 ? this.sessions[0] : null;

                    // 새 세션을 선택한 경우 해당 세션의 메시지 로드
                    if (this.currentSession) {
                        await this.selectSession(this.currentSession.id);
                    }
                }
            } catch (err) {
                console.error('세션 삭제 오류:', err);
                this.error = '세션을 삭제하는 중 오류가 발생했습니다.';
            }
        },

        // 채팅 기록 클리어
        async clearMessages() {
            if (this.currentSession) {
                try {
                    // 세션은 유지하고 메시지만 삭제
                    const sessionId = this.currentSession.id;
                    const title = this.currentSession.title;
                    const createdAt = this.currentSession.createdAt;
                    const updatedAt = new Date().toISOString();

                    // 로컬 상태 업데이트
                    this.currentSession.messages = [];
                    this.currentSession.updatedAt = updatedAt;

                    // 개발 환경이 아닌 경우 API 호출 (세션 업데이트)
                    if (!import.meta.env.DEV) {
                        const authStore = useAuthStore();
                        const apiUrl = import.meta.env.VITE_API_URL || '/api';

                        // 기존 세션 삭제 후 새 세션 생성
                        await axios.delete(`${apiUrl}/sessions/${sessionId}`, {
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${authStore.tokens.idToken}`,
                            },
                        });

                        // 동일한 ID로 새 세션 생성
                        await axios.post(
                            `${apiUrl}/sessions`,
                            {
                                userId: authStore.user?.sub || authStore.user?.id,
                                title: title,
                            },
                            {
                                headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${authStore.tokens.idToken}`,
                                },
                            },
                        );
                    }
                } catch (err) {
                    console.error('채팅 기록 클리어 오류:', err);
                    this.error = '채팅 기록을 지우는 중 오류가 발생했습니다.';
                }
            }
        },

        // 상태 초기화
        resetState() {
            this.loading = false;
            this.error = '';
            this.sessions = [];
            this.currentSession = null;
            this.waitingForResponse = false;
        },
    },
});
