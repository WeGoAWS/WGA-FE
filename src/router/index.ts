import type { RouteRecordRaw } from 'vue-router';
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

// 페이지 컴포넌트 가져오기
import LoginPage from '@/views/LoginPage.vue';
import CallbackPage from '@/views/CallbackPage.vue';
import DashboardPage from '@/views/DashboardPage.vue';

const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        redirect: '/login',
    },
    {
        path: '/login',
        name: 'Login',
        component: LoginPage,
        meta: { requiresAuth: false },
    },
    {
        path: '/redirect',
        name: 'Redirect',
        component: CallbackPage,
        meta: { requiresAuth: false },
    },
    {
        path: '/dashboard',
        name: 'Dashboard',
        component: DashboardPage,
        meta: { requiresAuth: true },
    },
    // 페이지를 찾을 수 없을 때
    {
        path: '/:pathMatch(.*)*',
        redirect: '/login',
    },
];

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
});

// 네비게이션 가드
router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore();
    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);

    if (requiresAuth) {
        // 인증 상태 확인 (백엔드와 통신)
        try {
            const isAuthenticated = await authStore.handleTokenFromBackend();

            if (!isAuthenticated) {
                // 인증이 안 되어 있다면 로그인 페이지로
                next('/login');
            } else {
                // 인증 OK
                next();
            }
        } catch (error) {
            console.error('Navigation guard error:', error);
            next('/login');
        }
    } else {
        // 인증이 필요 없는 페이지
        next();
    }
});

export default router;
