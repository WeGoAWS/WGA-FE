// src/stores/auth.ts
import { defineStore } from 'pinia';
import axios from 'axios';

interface AuthState {
    isAuthenticated: boolean;
    user: any | null;
    tokens: {
        idToken: string | null;
        accessToken: string | null;
        refreshToken: string | null;
    };
    loading: boolean;
    error: string | null;
}

export const useAuthStore = defineStore('auth', {
    state: (): AuthState => ({
        isAuthenticated: false,
        user: null,
        tokens: {
            idToken: null,
            accessToken: null,
            refreshToken: null,
        },
        loading: false,
        error: null,
    }),

    getters: {
        getUser: (state) => state.user,
        getIsAuthenticated: (state) => state.isAuthenticated,
        getLoading: (state) => state.loading,
        getError: (state) => state.error,
    },

    actions: {
        // AWS Cognito로 직접 OAuth 로그인 시작
        initiateLogin() {
            this.loading = true;
            this.error = null;

            try {
                const clientId = import.meta.env.COGNITO_CLIENT_ID;
                const redirectUri = import.meta.env.COGNITO_REDIRECT_URI;
                const responseType = 'code';
                const scope = 'openid profile email';

                // Cognito OAuth 로그인 URL 구성
                // 중요: AWS 호스팅 UI 도메인을 사용
                const cognitoDomain = import.meta.env.COGNITO_DOMAIN;

                if (!cognitoDomain) {
                    throw new Error(
                        'Cognito 도메인이 설정되지 않았습니다. COGNITO_DOMAIN 환경 변수를 확인하세요.',
                    );
                }

                // AWS Cognito 호스팅 UI URL 형식 사용
                const authUrl = `https://${cognitoDomain}.auth.us-east-1.amazoncognito.com/login?response_type=${responseType}&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;

                console.log('Auth URL:', authUrl);

                // Cognito 로그인 페이지로 리다이렉트
                window.location.href = authUrl;
            } catch (error: any) {
                this.error = error.message || '로그인 시작 중 오류가 발생했습니다';
                console.error('Login initiation error:', error);
            } finally {
                this.loading = false;
            }
        },

        // Cognito에서 받은 인증 코드를 토큰으로 교환
        async exchangeCodeForTokens(authCode: string) {
            this.loading = true;
            this.error = null;

            try {
                const clientId = import.meta.env.COGNITO_CLIENT_ID;
                const redirectUri = import.meta.env.COGNITO_REDIRECT_URI;
                const clientSecret = import.meta.env.COGNITO_CLIENT_SECRET || '';

                // 토큰 엔드포인트 URL 구성
                const cognitoDomain = import.meta.env.COGNITO_DOMAIN;

                if (!cognitoDomain) {
                    throw new Error(
                        'Cognito 도메인이 설정되지 않았습니다. COGNITO_DOMAIN 환경 변수를 확인하세요.',
                    );
                }

                // AWS Cognito 호스팅 UI 토큰 엔드포인트
                const tokenEndpoint = `https://${cognitoDomain}.auth.us-east-1.amazoncognito.com/oauth2/token`;

                // 토큰 교환 요청
                const headers: Record<string, string> = {
                    'Content-Type': 'application/x-www-form-urlencoded',
                };

                // 클라이언트 인증 정보
                if (clientSecret) {
                    const auth = btoa(`${clientId}:${clientSecret}`);
                    headers['Authorization'] = `Basic ${auth}`;
                }

                const params = new URLSearchParams();
                params.append('grant_type', 'authorization_code');
                params.append('client_id', clientId);
                params.append('code', authCode);
                params.append('redirect_uri', redirectUri);

                console.log('Token exchange request:', tokenEndpoint);
                const response = await axios.post(tokenEndpoint, params, { headers });

                // 토큰 정보 저장
                this.tokens = {
                    idToken: response.data.id_token,
                    accessToken: response.data.access_token,
                    refreshToken: response.data.refresh_token || null,
                };

                // JWT 파싱하여 사용자 정보 추출
                this.user = this.parseJwt(response.data.id_token);
                this.isAuthenticated = true;

                // 백엔드로 토큰 검증 요청
                await this.verifyTokenWithBackend();

                return true;
            } catch (error: any) {
                this.error = error.message || '인증 코드 교환 중 오류가 발생했습니다';
                console.error('Token exchange error:', error);
                return false;
            } finally {
                this.loading = false;
            }
        },

        // JWT 토큰 디코딩 함수
        parseJwt(token: string) {
            try {
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(
                    atob(base64)
                        .split('')
                        .map(function (c) {
                            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                        })
                        .join(''),
                );

                return JSON.parse(jsonPayload);
            } catch (error) {
                console.error('JWT parsing error:', error);
                return null;
            }
        },

        // 백엔드로 토큰 전송 및 검증
        async verifyTokenWithBackend() {
            try {
                const apiUrl = import.meta.env.API_URL || 'http://localhost:8000';

                // 백엔드에 토큰 검증 요청
                const response = await axios.post(
                    `${apiUrl}/auth/verify-token`,
                    {
                        id_token: this.tokens.idToken,
                        access_token: this.tokens.accessToken,
                        refresh_token: this.tokens.refreshToken,
                        provider: 'cognito',
                    },
                    {
                        withCredentials: true,
                    },
                );

                console.log('Token verification response:', response.data);
                return response.data && response.data.status === 'success';
            } catch (error: any) {
                console.error('Backend token verification error:', error);
                // 백엔드 검증 실패는 인증 상태에 영향을 주지 않음 (선택적)
                return false;
            }
        },

        // 로그아웃
        logout() {
            const clientId = import.meta.env.COGNITO_CLIENT_ID;
            const redirectUri = import.meta.env.COGNITO_REDIRECT_URI;

            // 상태 초기화
            this.user = null;
            this.tokens = {
                idToken: null,
                accessToken: null,
                refreshToken: null,
            };
            this.isAuthenticated = false;

            // Cognito 로그아웃 URL 구성
            const cognitoDomain = import.meta.env.COGNITO_DOMAIN;

            if (!cognitoDomain) {
                console.error('Cognito 도메인이 설정되지 않았습니다. 로컬 로그아웃만 수행합니다.');
                window.location.href = redirectUri;
                return;
            }

            // AWS Cognito 호스팅 UI 로그아웃 URL
            const logoutUrl = `https://${cognitoDomain}.auth.us-east-1.amazoncognito.com/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(redirectUri)}`;

            // 로그아웃 리다이렉트
            window.location.href = logoutUrl;
        },
    },
});
