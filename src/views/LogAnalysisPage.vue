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
                <button @click="fetchLogAnalysis" class="analyze-button" :disabled="loading">
                    <span v-if="loading">분석 중...</span>
                    <span v-else>로그 분석 시작</span>
                </button>
            </div>

            <div v-if="error" class="error-message">
                {{ error }}
            </div>

            <div v-if="loading" class="loading-container">
                <div class="spinner"></div>
                <p>로그 분석 중입니다. 잠시만 기다려주세요...</p>
            </div>

            <div v-else-if="analysisResults.length > 0">
                <div class="results-container">
                    <PolicyResultCard
                        v-for="(result, index) in analysisResults"
                        :key="index"
                        :result="result"
                        :index="index"
                        :show-save-button="true"
                        @save="saveAnalysisResult"
                    />
                </div>

                <!-- 정책 변경사항 적용 컴포넌트 -->
                <ApplyPermissionChanges :analysis-results="analysisResults" />
            </div>

            <div v-else-if="!loading" class="no-results">
                <p>
                    아직 분석 결과가 없습니다. '로그 분석 시작' 버튼을 클릭하여 분석을 시작하세요.
                </p>
            </div>
        </div>
    </AppLayout>
</template>

<script lang="ts">
    import { defineComponent, onMounted, ref } from 'vue';
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
            const analysisResults = ref<AnalysisResult[]>([]);
            const loading = ref(false);
            const error = ref('');
            const selectedUser = ref<string | null>(null);
            const selectedDateRange = ref<{ startDate: string; endDate: string } | null>(null);
            const cloudProvider = ref<'aws' | 'gcp' | 'azure'>('aws');

            // 페이지 로드 시 자동으로 데이터 불러오기
            onMounted(async () => {
                await fetchLogAnalysis();
            });

            // 클라우드 제공자 설정
            const setCloudProvider = (provider: 'aws' | 'gcp' | 'azure') => {
                cloudProvider.value = provider;
                fetchLogAnalysis();
            };

            // 사용자 필터 처리
            const handleUserFilter = (username: string | null) => {
                selectedUser.value = username;
                fetchLogAnalysis();
            };

            // 날짜 필터 처리
            const handleDateFilter = (dateRange: { startDate: string; endDate: string } | null) => {
                selectedDateRange.value = dateRange;
                fetchLogAnalysis();
            };

            // 백엔드에 로그 분석 요청 함수
            const fetchLogAnalysis = async () => {
                loading.value = true;
                error.value = '';

                try {
                    let results: AnalysisResult[] = [];

                    // 클라우드 제공자에 따른 서비스 호출
                    if (cloudProvider.value === 'aws') {
                        // 필터 적용 로직
                        if (selectedUser.value && selectedDateRange.value) {
                            // 두 필터 모두 적용된 경우
                            results = await policyService.analyzeLogsByDateRange(
                                selectedDateRange.value.startDate,
                                selectedDateRange.value.endDate,
                            );
                            // 유저 필터링은 프론트엔드에서 수행
                            results = results.filter(
                                (result) => result.user === selectedUser.value,
                            );
                        } else if (selectedUser.value) {
                            // 사용자 필터만 적용된 경우
                            results = await policyService.analyzeUserLogs(selectedUser.value);
                        } else if (selectedDateRange.value) {
                            // 날짜 필터만 적용된 경우
                            results = await policyService.analyzeLogsByDateRange(
                                selectedDateRange.value.startDate,
                                selectedDateRange.value.endDate,
                            );
                        } else {
                            // 필터 없음
                            results = await policyService.analyzeCloudTrailLogs();
                        }
                    } else if (cloudProvider.value === 'gcp') {
                        // GCP 로그 분석은 아직 미구현
                        error.value = 'GCP 로그 분석 기능은 현재 개발 중입니다.';
                    } else if (cloudProvider.value === 'azure') {
                        // Azure 로그 분석은 아직 미구현
                        error.value = 'Azure 로그 분석 기능은 현재 개발 중입니다.';
                    }

                    analysisResults.value = results;
                } catch (err: any) {
                    console.error('로그 분석 요청 오류:', err);
                    error.value = err.message || '로그 분석 중 오류가 발생했습니다.';
                } finally {
                    loading.value = false;
                }
            };

            // 분석 결과 저장
            const saveAnalysisResult = async (result: AnalysisResult) => {
                try {
                    // 결과 저장 서비스 호출
                    const savedId = await policyService.saveAnalysisResult(result);
                    alert(`분석 결과가 성공적으로 저장되었습니다. (ID: ${savedId})`);
                } catch (error: any) {
                    console.error('결과 저장 오류:', error);
                    alert(`저장 실패: ${error.message}`);
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
                fetchLogAnalysis,
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

    .analysis-card {
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        overflow: hidden;
    }

    .card-header {
        background-color: #f8f9fa;
        padding: 15px 20px;
        border-bottom: 1px solid #e9ecef;
    }

    .card-header h3 {
        margin: 0 0 10px 0;
        color: #333;
    }

    .metadata {
        display: flex;
        flex-wrap: wrap;
        gap: 15px;
        font-size: 0.9rem;
        color: #666;
    }

    .card-body {
        padding: 20px;
    }

    .analysis-comment {
        margin-bottom: 20px;
    }

    .analysis-comment h4,
    .policy-recommendations h4,
    .recommendation-group h5,
    .reason h5 {
        margin-top: 0;
        margin-bottom: 10px;
        color: #333;
    }

    .policy-recommendations {
        display: flex;
        flex-direction: column;
        gap: 15px;
    }

    .recommendation-group {
        padding: 15px;
        border-radius: 4px;
        background-color: #f8f9fa;
    }

    .remove-title {
        color: #d63301;
    }

    .add-title {
        color: #2e7d32;
    }

    .permission-list {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 10px;
    }

    .permission-item {
        padding: 5px 10px;
        border-radius: 4px;
        font-size: 0.9rem;
    }

    .permission-item.remove {
        background-color: #ffebee;
        color: #d63301;
        border: 1px solid #f8b8b8;
    }

    .permission-item.add {
        background-color: #e8f5e9;
        color: #2e7d32;
        border: 1px solid #a5d6a7;
    }

    .empty-list {
        color: #666;
        font-style: italic;
    }

    .reason {
        margin-top: 10px;
        padding: 15px;
        background-color: #fff8e1;
        border-radius: 4px;
        border-left: 4px solid #ffb300;
    }

    .reason p {
        margin: 0;
        line-height: 1.6;
    }

    .no-results {
        text-align: center;
        padding: 40px;
        color: #666;
        background-color: #f8f9fa;
        border-radius: 8px;
    }
</style>
