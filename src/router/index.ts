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
router.beforeEach((to, from, next) => {
    const authStore = useAuthStore();
    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);

    // isAuthenticated 상태만 확인 (handleTokenFromBackend 호출 없음)
    if (requiresAuth && !authStore.isAuthenticated) {
        // 인증이 필요한 페이지인데 인증이 안 되어 있을 때
        next('/login');
    } else if (to.path === '/login' && authStore.isAuthenticated) {
        // 이미 로그인되어 있으면 대시보드로 리다이렉트
        next('/dashboard');
    } else {
        // 그 외의 경우
        next();
    }
});

export default router;
