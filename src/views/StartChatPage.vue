<!-- src/views/StartChatPage.vue -->
<template>
    <AppLayout>
        <div class="start-chat-container">
            <div class="start-chat-header">
                <h1>AWS Agent</h1>
                <p class="start-chat-description">클라우드 운영 정보 질의응답 서비스</p>
            </div>

            <div class="start-chat-input-container">
                <textarea
                    v-model="messageText"
                    class="start-chat-input"
                    placeholder="AWS 클라우드 운영에 관한 질문을 입력하세요..."
                    @keydown.enter.prevent="startNewChat"
                ></textarea>
                <button @click="startNewChat" class="send-button" :disabled="!messageText.trim()">
                    질문하기
                </button>
            </div>

            <div class="example-questions-container">
                <h2>자주 묻는 질문 예시</h2>
                <div class="example-questions">
                    <div class="question-category">
                        <h3>리소스 모니터링</h3>
                        <button
                            @click="
                                askExampleQuestion(
                                    '지난 24시간 동안 CPU 사용률이 가장 높았던 EC2 인스턴스는 무엇인가요?',
                                )
                            "
                            class="example-question"
                        >
                            지난 24시간 동안 CPU 사용률이 가장 높았던 EC2 인스턴스는 무엇인가요?
                        </button>
                        <button
                            @click="
                                askExampleQuestion(
                                    '이번 달 메모리 사용량이 가장 많은 Lambda 함수 Top 5를 알려주세요.',
                                )
                            "
                            class="example-question"
                        >
                            이번 달 메모리 사용량이 가장 많은 Lambda 함수 Top 5를 알려주세요.
                        </button>
                    </div>

                    <div class="question-category">
                        <h3>보안 감사</h3>
                        <button
                            @click="
                                askExampleQuestion(
                                    '최근 7일간 발생한 보안 이벤트를 심각도 순으로 정리해주세요.',
                                )
                            "
                            class="example-question"
                        >
                            최근 7일간 발생한 보안 이벤트를 심각도 순으로 정리해주세요.
                        </button>
                        <button
                            @click="
                                askExampleQuestion('어제 루트 계정으로 로그인한 기록이 있나요?')
                            "
                            class="example-question"
                        >
                            어제 루트 계정으로 로그인한 기록이 있나요?
                        </button>
                    </div>

                    <div class="question-category">
                        <h3>비용 관리</h3>
                        <button
                            @click="
                                askExampleQuestion(
                                    '지난 달 대비 이번 달 비용이 가장 많이 증가한 서비스 3가지를 알려주세요.',
                                )
                            "
                            class="example-question"
                        >
                            지난 달 대비 이번 달 비용이 가장 많이 증가한 서비스 3가지를 알려주세요.
                        </button>
                        <button
                            @click="
                                askExampleQuestion(
                                    '비용 최적화를 위해 삭제 가능한 미사용 리소스가 있나요?',
                                )
                            "
                            class="example-question"
                        >
                            비용 최적화를 위해 삭제 가능한 미사용 리소스가 있나요?
                        </button>
                    </div>

                    <div class="question-category">
                        <h3>권한 관리</h3>
                        <button
                            @click="
                                askExampleQuestion(
                                    '지난 30일간 IAM 권한이 변경된 사용자 목록을 보여주세요.',
                                )
                            "
                            class="example-question"
                        >
                            지난 30일간 IAM 권한이 변경된 사용자 목록을 보여주세요.
                        </button>
                        <button
                            @click="
                                askExampleQuestion('최소 권한 원칙에 위배되는 IAM 정책이 있나요?')
                            "
                            class="example-question"
                        >
                            최소 권한 원칙에 위배되는 IAM 정책이 있나요?
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </AppLayout>
</template>

<script lang="ts">
    import { defineComponent, ref } from 'vue';
    import { useRouter } from 'vue-router';
    import AppLayout from '@/layouts/AppLayout.vue';
    import { useChatbotStore } from '@/stores/chatbot';

    export default defineComponent({
        name: 'StartChatPage',
        components: {
            AppLayout,
        },

        setup() {
            const router = useRouter();
            const store = useChatbotStore();
            const messageText = ref('');

            const startNewChat = async () => {
                if (!messageText.value.trim()) return;

                // 새 채팅 세션 생성
                store.createNewSession();

                // 메시지 저장 - 세션 생성 후에 메시지를 채팅 스토어에 저장만 하고
                // 실제 전송은 여기서 하지 않음
                sessionStorage.setItem('pendingQuestion', messageText.value);

                // 채팅 페이지로 이동
                router.push('/chatbot');
            };

            const askExampleQuestion = (question: string) => {
                messageText.value = question;
                startNewChat();
            };

            return {
                messageText,
                startNewChat,
                askExampleQuestion,
            };
        },
    });
</script>

<style scoped>
    .start-chat-container {
        max-width: 900px;
        margin: 0 auto;
        padding: 2rem;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .start-chat-header {
        text-align: center;
        margin-bottom: 2rem;
    }

    .start-chat-header h1 {
        font-size: 2.5rem;
        margin-bottom: 0.5rem;
        color: #232f3e;
    }

    .start-chat-description {
        font-size: 1.2rem;
        color: #666;
    }

    .start-chat-input-container {
        width: 100%;
        display: flex;
        margin-bottom: 3rem;
    }

    .start-chat-input {
        flex: 1;
        padding: 1rem;
        font-size: 1rem;
        border: 1px solid #ced4da;
        border-radius: 8px 0 0 8px;
        resize: none;
        height: 60px;
        font-family: inherit;
    }

    .send-button {
        padding: 0 1.5rem;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 0 8px 8px 0;
        cursor: pointer;
        font-size: 1rem;
        font-weight: 500;
    }

    .send-button:disabled {
        background-color: #ccc;
        cursor: not-allowed;
    }

    .example-questions-container {
        width: 100%;
    }

    .example-questions-container h2 {
        text-align: center;
        margin-bottom: 1.5rem;
        color: #232f3e;
    }

    .example-questions {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        gap: 1.5rem;
    }

    .question-category {
        background-color: #f8f9fa;
        border-radius: 8px;
        padding: 1.5rem;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    .question-category h3 {
        margin-bottom: 1rem;
        color: #232f3e;
        font-size: 1.1rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid #dee2e6;
    }

    .example-question {
        display: block;
        width: 100%;
        text-align: left;
        padding: 0.8rem 1rem;
        margin-bottom: 0.75rem;
        background-color: white;
        border: 1px solid #dee2e6;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
        color: #333;
        font-size: 0.95rem;
    }

    .example-question:hover {
        background-color: #e9ecef;
        border-color: #ced4da;
        transform: translateY(-2px);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }

    @media (max-width: 768px) {
        .example-questions {
            grid-template-columns: 1fr;
        }
    }
</style>
