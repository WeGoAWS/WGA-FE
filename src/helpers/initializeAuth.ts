// src/helpers/initializeAuth.ts
// 애플리케이션의 인증 상태를 초기화하는 헬퍼 파일

import { useAuthStore } from '@/stores/auth';
import { useChatbotStore } from '@/stores/chatbotWithPersistence';

/**
 * 애플리케이션의 인증 및 사용자 관련 데이터를 초기화합니다.
 * 앱 시작 시 호출되어야 합니다.
 */
export async function initializeAppData() {
    try {
        // 인증 스토어 초기화
        const authStore = useAuthStore();
        await authStore.initializeAuth();

        // 인증이 성공하면 채팅 데이터 초기화
        if (authStore.isAuthenticated) {
            const chatbotStore = useChatbotStore();
            await chatbotStore.fetchSessions();
        }

        return true;
    } catch (error) {
        console.error('앱 초기화 중 오류 발생:', error);
        return false;
    }
}

/**
 * 로그아웃 시 애플리케이션 데이터 정리
 */
export async function clearAppData() {
    try {
        const chatbotStore = useChatbotStore();
        chatbotStore.resetState();

        return true;
    } catch (error) {
        console.error('앱 데이터 정리 중 오류 발생:', error);
        return false;
    }
}

export default {
    initializeAppData,
    clearAppData,
};
