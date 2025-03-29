// src/services/policyService.ts
// src/services/policyService.ts
import axios from 'axios';

// 정책 추천 관련 인터페이스
export interface PolicyRecommendation {
    REMOVE: string[];
    ADD: string[];
    Reason: string;
}

export interface AnalysisResult {
    date: string;
    user: string;
    log_count: number;
    analysis_timestamp: string;
    analysis_comment: string;
    policy_recommendation: PolicyRecommendation;
}

export interface AnalysisResponse {
    results: AnalysisResult[];
}

class PolicyService {
    private apiUrl: string;

    constructor() {
        this.apiUrl = import.meta.env.API_URL || 'http://localhost:8000';
    }

    /**
     * 로그 분석 및 정책 추천 요청
     * @returns 분석 결과 객체
     */
    async analyzeCloudTrailLogs(): Promise<AnalysisResult[]> {
        try {
            const response = await axios.post<AnalysisResponse>(
                `${this.apiUrl}/policy-recommendation/process-multiple-analyses`,
            );

            return response.data.results;
        } catch (error: any) {
            console.error('Error analyzing CloudTrail logs:', error);
            throw new Error(error.response?.data?.detail || '로그 분석 중 오류가 발생했습니다.');
        }
    }

    /**
     * 특정 사용자의 로그 분석 요청
     * @param username 분석할 사용자 이름
     * @returns 분석 결과 객체
     */
    async analyzeUserLogs(username: string): Promise<AnalysisResult[]> {
        try {
            const response = await axios.post<AnalysisResponse>(
                `${this.apiUrl}/policy-recommendation/process-multiple-analyses`,
                { username },
            );

            return response.data.results;
        } catch (error: any) {
            console.error(`Error analyzing logs for user ${username}:`, error);
            throw new Error(error.response?.data?.detail || '로그 분석 중 오류가 발생했습니다.');
        }
    }

    /**
     * 날짜 범위로 로그 분석 요청
     * @param startDate 시작 날짜
     * @param endDate 종료 날짜
     * @returns 분석 결과 객체
     */
    async analyzeLogsByDateRange(startDate: string, endDate: string): Promise<AnalysisResult[]> {
        try {
            const response = await axios.post<AnalysisResponse>(
                `${this.apiUrl}/policy-recommendation/process-multiple-analyses`,
                {
                    start_date: startDate,
                    end_date: endDate,
                },
            );

            return response.data.results;
        } catch (error: any) {
            console.error(`Error analyzing logs between ${startDate} and ${endDate}:`, error);
            throw new Error(error.response?.data?.detail || '로그 분석 중 오류가 발생했습니다.');
        }
    }

    /**
     * 분석 결과 저장
     * @param result 저장할 분석 결과
     * @returns 저장된 분석 결과 ID
     */
    async saveAnalysisResult(result: AnalysisResult): Promise<string> {
        try {
            const response = await axios.post<{ id: string }>(
                `${this.apiUrl}/policy-recommendation/save-analysis`,
                result,
            );

            return response.data.id;
        } catch (error: any) {
            console.error('Error saving analysis result:', error);
            throw new Error(
                error.response?.data?.detail || '분석 결과 저장 중 오류가 발생했습니다.',
            );
        }
    }
}

export default new PolicyService();
