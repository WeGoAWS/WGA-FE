// src/stores/chatbot.ts 수정 (계속)
import { defineStore } from 'pinia';

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
                // API 호출을 통해 채팅 세션 목록을 가져오는 로직
                // 여기서는 간단한 시뮬레이션
                await new Promise((resolve) => setTimeout(resolve, 500));

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
            } catch (err: any) {
                console.error('채팅 세션 목록 가져오기 오류:', err);
                this.error = err.message || '채팅 세션 목록을 불러오는 중 오류가 발생했습니다.';
            } finally {
                this.loading = false;
            }
        },

        // 새 채팅 세션 생성
        createNewSession() {
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
        },

        // 채팅 세션 선택
        selectSession(sessionId: string) {
            const session = this.sessions.find((s) => s.id === sessionId);
            if (session) {
                this.currentSession = session;
            }
        },

        // 메시지 전송
        async sendMessage(text: string) {
            if (!text.trim()) return;

            // 현재 세션이 없으면 새 세션 생성
            if (!this.currentSession) {
                this.createNewSession();
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
                this.currentSession!.title =
                    text.length > 30 ? text.substring(0, 30) + '...' : text;
            }

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

                // 실제 API 호출을 통해 봇 응답을 가져오는 로직
                // 여기서는 간단한 시뮬레이션
                await new Promise((resolve) => setTimeout(resolve, 1000));

                const botResponseText = this.generateBotResponse(text);

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
            } finally {
                this.waitingForResponse = false;
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
        generateBotResponse(userMessage: string): string {
            if (userMessage.toLowerCase().includes('안녕')) {
                return '안녕하세요! 무엇을 도와드릴까요?';
            } else if (
                userMessage.toLowerCase().includes('aws') ||
                userMessage.toLowerCase().includes('클라우드')
            ) {
                return 'AWS 클라우드 서비스에 관한 질문이군요. 보안, 로그 분석, 권한 관리 등 특정 주제에 대해 질문해 주시면 더 자세히 답변드릴 수 있습니다.';
            } else if (
                userMessage.toLowerCase().includes('로그') ||
                userMessage.toLowerCase().includes('분석')
            ) {
                return '로그 분석은 보안 모니터링의 중요한 부분입니다. CloudTrail, CloudWatch Logs 등의 서비스를 활용하여 로그를 수집하고 분석할 수 있습니다. CloudWatch Logs Insights를 사용하면 로그 데이터를 쿼리하여 특정 패턴이나 이벤트를 찾아낼 수 있으며, Athena를 사용하면 S3에 저장된 로그 파일을 SQL로 분석할 수 있습니다.';
            } else if (
                userMessage.toLowerCase().includes('권한') ||
                userMessage.toLowerCase().includes('iam')
            ) {
                return 'AWS IAM(Identity and Access Management)은 AWS 리소스에 대한 접근을 안전하게 제어하는 서비스입니다. 최소 권한 원칙을 따라 필요한 권한만 부여하는 것이 좋습니다. IAM 정책은 JSON 형식으로 작성되며, 사용자, 그룹, 역할에 연결하여 권한을 관리할 수 있습니다. AWS Organizations와 함께 SCP(Service Control Policy)를 사용하면 조직 전체의 권한 경계를 설정할 수 있습니다.';
            } else if (
                userMessage.toLowerCase().includes('s3') ||
                userMessage.toLowerCase().includes('버킷')
            ) {
                return 'S3 버킷의 접근 권한은 여러 계층에서 관리할 수 있습니다. 버킷 정책은 특정 버킷에 대한 접근을 제어하는 리소스 기반 정책입니다. ACL(접근 제어 목록)은 개별 객체에 대한 권한을 설정할 수 있지만, 보안 관리의 복잡성 때문에 가능하면 버킷 정책과 IAM 정책을 사용하는 것이 권장됩니다. 또한 S3 Block Public Access 설정을 활성화하여 실수로 데이터가 공개되는 것을 방지할 수 있습니다.';
            } else if (userMessage.toLowerCase().includes('cloudtrail')) {
                return 'AWS CloudTrail은 AWS 계정의 거버넌스, 규정 준수, 운영 감사, 위험 감사를 지원하는 서비스입니다. CloudTrail은 AWS 계정 활동의 이벤트 기록을 제공하여 보안 분석, 리소스 변경 추적, 규정 준수 감사에 활용할 수 있습니다. CloudTrail 로그는 S3 버킷에 저장되며, CloudWatch Logs로 전송하여 실시간 모니터링 및 알림을 설정할 수 있습니다. 또한 Athena를 사용하여 로그 데이터를 SQL로 분석할 수 있습니다.';
            } else if (
                userMessage.toLowerCase().includes('비용') ||
                userMessage.toLowerCase().includes('cost')
            ) {
                return 'AWS 비용 최적화를 위해서는 Cost Explorer와 AWS Budgets를 활용하는 것이 좋습니다. Cost Explorer는 비용 분석 및 예측 도구로, 서비스별, 리전별, 태그별로 비용을 분석할 수 있습니다. AWS Trusted Advisor는 비용 최적화 권장 사항을 제공하며, 미사용 리소스나 과도하게 프로비저닝된 리소스를 식별하는 데 도움이 됩니다. 리소스에 적절한 태그를 지정하면 비용 할당 및 관리가 용이해집니다. 또한 Savings Plans나 예약 인스턴스를 활용하면 장기 사용 리소스의 비용을 크게 절감할 수 있습니다.';
            } else {
                return '질문해 주셔서 감사합니다. 더 자세한 정보가 필요하시면 질문을 구체적으로 해주시거나, 로그 분석, IAM 권한, 보안 설정 등의 특정 주제에 대해 질문해 주세요. AWS CloudWatch, CloudTrail, GuardDuty, CostExplorer 등에 관한 질문도 도와드릴 수 있습니다.';
            }
        },

        // 채팅 세션 삭제
        deleteSession(sessionId: string) {
            this.sessions = this.sessions.filter((s) => s.id !== sessionId);

            // 현재 선택된 세션이 삭제된 경우
            if (this.currentSession && this.currentSession.id === sessionId) {
                this.currentSession = this.sessions.length > 0 ? this.sessions[0] : null;
            }
        },

        // 채팅 기록 클리어
        clearMessages() {
            if (this.currentSession) {
                this.currentSession.messages = [];
                this.currentSession.updatedAt = new Date().toISOString();
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
