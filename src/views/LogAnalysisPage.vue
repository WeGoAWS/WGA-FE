<!-- src/views/LogAnalysisPage.vue -->
<template>
    <AppLayout>
        <div class="log-analysis-container">
            <div class="page-header">
                <h1>로그분석</h1>
                <p class="description">
                    AWS CloudTrail, GCP, Azure 로그를 분석하여 IAM 정책 권한 추천을 제공합니다.
                </p>
                <div class="cloud-selector">
                    <button
                        @click="setCloudProvider('aws')"
                        class="cloud-button"
                        :class="{ active: cloudProvider === 'aws' }"
                    >
                        AWS
                    </button>
                    <button
                        @click="setCloudProvider('gcp')"
                        class="cloud-button"
                        :class="{ active: cloudProvider === 'gcp' }"
                    >
                        GCP
                    </button>
                    <button
                        @click="setCloudProvider('azure')"
                        class="cloud-button"
                        :class="{ active: cloudProvider === 'azure' }"
                    >
                        Azure
                    </button>
                </div>
            </div>

            <div class="controls">
                <div class="filter-section">
                    <DateRangeFilter :loading="loading" @filter="handleDateFilter" />
                    <UserFilter :loading="loading" @filter="handleUserFilter" />
                </div>
                <button @click="testFunction" class="analyze-button" :disabled="loading">
                    <span v-if="loading">분석 중...</span>
                    <span v-else>로그 분석 시작</span>
                </button>
            </div>

            <div v-if="error" class="error-message">
                {{ error }}
            </div>

            <!-- 로딩 상태 표시 -->
            <div v-if="loading" class="loading-container">
                <div class="spinner"></div>
                <p>로그 분석 중입니다. 잠시만 기다려주세요...</p>
            </div>

            <!-- 결과가 있을 때 -->
            <div v-if="showResults" class="results-container">
                <div v-for="(result, index) in analysisResults" :key="index">
                    <PolicyResultCard
                        :result="result"
                        :index="index"
                        :show-save-button="true"
                        @save="saveAnalysisResult"
                    />
                </div>

                <!-- 정책 변경사항 적용 컴포넌트 -->
                <ApplyPermissionChanges
                    v-if="analysisResults.length > 0"
                    :analysis-results="analysisResults"
                />
            </div>

            <!-- 결과가 없을 때 -->
            <div v-if="!loading && !showResults" class="no-results">
                <p>
                    아직 분석 결과가 없습니다. '로그 분석 시작' 버튼을 클릭하여 분석을 시작하세요.
                </p>
            </div>
        </div>
    </AppLayout>
</template>

<script lang="ts">
    import { computed, defineComponent, ref } from 'vue';
    import AppLayout from '@/layouts/AppLayout.vue';
    import DateRangeFilter from '@/components/DateRangeFilter.vue';
    import UserFilter from '@/components/UserFilter.vue';
    import PolicyResultCard from '@/components/PolicyResultCard.vue';
    import ApplyPermissionChanges from '@/components/ApplyPermissionChanges.vue';
    import type { AnalysisResult } from '@/services/policyService';
    import policyService from '@/services/policyService';

    export default defineComponent({
        name: 'LogAnalysisPage',
        components: {
            AppLayout,
            DateRangeFilter,
            UserFilter,
            PolicyResultCard,
            ApplyPermissionChanges,
        },

        setup() {
            // 상태 변수들
            const analysisResults = ref<AnalysisResult[]>([]);
            const loading = ref(false);
            const error = ref('');
            const selectedUser = ref<string | null>(null);
            const selectedDateRange = ref<{ startDate: string; endDate: string } | null>(null);
            const cloudProvider = ref<'aws' | 'gcp' | 'azure'>('aws');

            // 결과가 있는지 계산 (템플릿 조건부 렌더링용)
            const showResults = computed(() => {
                return analysisResults.value && analysisResults.value.length > 0;
            });

            // 테스트 함수 - 간단한 경고창 표시
            const testFunction = () => {
                console.log('분석 요청 호출됨');
                getAnalysisData();
            };

            // 분석 데이터 가져오기
            const getAnalysisData = async () => {
                console.log('분석 데이터 요청 시작');
                loading.value = true;
                error.value = '';

                try {
                    // 테스트를 위해 간단한 지연 추가
                    await new Promise((resolve) => setTimeout(resolve, 1000));

                    // 실제 API 호출
                    const results = await policyService.getDemoAnalysis();
                    analysisResults.value = results;
                    console.log('결과 받음:', results);
                } catch (err: any) {
                    console.error('API 호출 오류:', err);
                    error.value = err.message || '데이터를 가져오는 중 오류가 발생했습니다.';
                } finally {
                    loading.value = false;
                }
            };

            // 클라우드 제공자 설정
            const setCloudProvider = (provider: 'aws' | 'gcp' | 'azure') => {
                cloudProvider.value = provider;
            };

            // 사용자 필터 처리
            const handleUserFilter = (username: string | null) => {
                selectedUser.value = username;
            };

            // 날짜 필터 처리
            const handleDateFilter = (dateRange: { startDate: string; endDate: string } | null) => {
                selectedDateRange.value = dateRange;
            };

            // 분석 결과 저장
            const saveAnalysisResult = async (result: AnalysisResult) => {
                try {
                    // 저장 로직
                    console.log('결과 저장:', result);
                    alert('결과가 저장되었습니다.');
                } catch (error: any) {
                    console.error('저장 오류:', error);
                }
            };

            // 날짜 포맷팅 함수
            const formatDate = (dateString: string): string => {
                try {
                    const date = new Date(dateString);
                    return date.toLocaleString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                    });
                } catch (e) {
                    return dateString;
                }
            };

            return {
                analysisResults,
                loading,
                error,
                cloudProvider,
                showResults,
                testFunction,
                formatDate,
                handleUserFilter,
                handleDateFilter,
                setCloudProvider,
                saveAnalysisResult,
            };
        },
    });
</script>

<style scoped>
    .log-analysis-container {
        padding: 20px;
        max-width: 1200px;
        margin: 0 auto;
    }

    .page-header {
        margin-bottom: 24px;
    }

    .page-header h1 {
        margin-bottom: 8px;
        color: #333;
    }

    .description {
        color: #666;
        line-height: 1.5;
    }

    .cloud-selector {
        display: flex;
        gap: 10px;
        margin-top: 15px;
    }

    .cloud-button {
        padding: 8px 16px;
        border: 1px solid #dee2e6;
        border-radius: 4px;
        background-color: #f8f9fa;
        color: #495057;
        cursor: pointer;
        transition: all 0.2s;
    }

    .cloud-button:hover {
        background-color: #e9ecef;
    }

    .cloud-button.active {
        background-color: #007bff;
        color: white;
        border-color: #007bff;
    }

    .filter-section {
        display: flex;
        gap: 20px;
        margin-bottom: 20px;
    }

    @media (max-width: 768px) {
        .filter-section {
            flex-direction: column;
        }
    }

    .controls {
        margin-bottom: 20px;
    }

    .analyze-button {
        background-color: #ff9900;
        border: none;
        color: #232f3e;
        padding: 10px 20px;
        border-radius: 4px;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .analyze-button:hover {
        background-color: #ffa928;
    }

    .analyze-button:disabled {
        background-color: #ccc;
        cursor: not-allowed;
    }

    .error-message {
        background-color: #fce4e4;
        border: 1px solid #f8b8b8;
        color: #d63301;
        padding: 10px 15px;
        border-radius: 4px;
        margin-bottom: 20px;
    }

    .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 40px;
    }

    .spinner {
        width: 50px;
        height: 50px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #ff9900;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 20px;
    }

    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }

    .results-container {
        display: flex;
        flex-direction: column;
        gap: 20px;
    }

    .no-results {
        text-align: center;
        padding: 40px;
        color: #666;
        background-color: #f8f9fa;
        border-radius: 8px;
    }
</style>
