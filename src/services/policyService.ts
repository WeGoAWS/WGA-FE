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
    analysis_timestamp?: string;
    analysis_comment: string;
    risk_level?: string;
    risk_classification?: string;
    severity?: string;
    summary?: string;
    policy_recommendation: PolicyRecommendation;
    type?: string | null;
}

export interface AnalysisResultList {
    results: AnalysisResult[];
}

export interface PermissionChange {
    action: string;
    apply: boolean;
    reason: string;
}

export interface PolicyUpdates {
    user_arn: string;
    add_permissions: PermissionChange[];
    remove_permissions: PermissionChange[];
}

class PolicyService {
    private apiUrl: string;

    constructor() {
        this.apiUrl = import.meta.env.API_URL || 'http://localhost:8000';
    }

    /**
     * 백엔드 API에서 권한 분석 결과 가져오기
     * @returns 분석 결과 목록
     */
    async getMultipleAnalyses(): Promise<AnalysisResult[]> {
        try {
            const response = await axios.get<AnalysisResult[]>(
                `${this.apiUrl}/policy-recommendation/process-multiple-analyses`,
                { withCredentials: true }
            );

            return response.data;
        } catch (error: any) {
            console.error('Error fetching multiple analyses:', error);
            throw new Error(
                error.response?.data?.detail || 
                '권한 분석 결과를 가져오는 중 오류가 발생했습니다.'
            );
        }
    }

    /**
     * 로그 분석 및 정책 추천 요청 (데모)
     * @returns 분석 결과 객체
     */
    async getDemoAnalysis(): Promise<AnalysisResult[]> {
        try {
            const response = await axios.get<AnalysisResult[]>(
                `${this.apiUrl}/cloudtrail/analyze-logs`,
            );

            return response.data;
        } catch (error: any) {
            console.error('Error getting demo analysis:', error);
            throw new Error(
                error.response?.data?.detail ||
                    '데모 분석 데이터를 가져오는 중 오류가 발생했습니다.',
            );
        }
    }

    /**
     * 특정 사용자의 로그 분석 요청
     * @param username 분석할 사용자 이름
     * @returns 분석 결과 객체
     */
    async analyzeUserLogs(username: string): Promise<AnalysisResult[]> {
        try {
            // 데모 데이터를 가져와서 사용자로 필터링
            const allResults = await this.getDemoAnalysis();
            return allResults.filter((result) => result.user.includes(username));
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
            // 데모 데이터를 가져와서 날짜로 필터링
            const allResults = await this.getDemoAnalysis();
            return allResults.filter((result) => {
                const resultDate = new Date(result.date);
                const start = new Date(startDate);
                const end = new Date(endDate);
                return resultDate >= start && resultDate <= end;
            });
        } catch (error: any) {
            console.error(`Error analyzing logs between ${startDate} and ${endDate}:`, error);
            throw new Error(error.response?.data?.detail || '로그 분석 중 오류가 발생했습니다.');
        }
    }

    /**
     * 분석 결과 저장 (모의 함수)
     * @param result 저장할 분석 결과
     * @returns 저장된 분석 결과 ID
     */
    async saveAnalysisResult(result: AnalysisResult): Promise<string> {
        try {
            // 실제 API가 없으므로 모의 응답 반환
            console.log('분석 결과 저장 요청:', result);

            // 백엔드 API 호출 시뮬레이션 (1초 지연)
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // 모의 ID 반환
            return 'demo-result-' + Math.floor(Math.random() * 10000);
        } catch (error: any) {
            console.error('Error saving analysis result:', error);
            throw new Error('분석 결과 저장 중 오류가 발생했습니다.');
        }
    }

    /**
     * 정책 변경 사항 적용 (모의 함수)
     * @param updates 적용할 정책 업데이트 목록
     * @returns 적용 결과
     */
    async applyPolicyChanges(updates: PolicyUpdates[]): Promise<any> {
        try {
            // 실제 API가 없으므로, 모의 응답을 반환
            console.log('정책 변경 적용 요청:', updates);

            // 백엔드 API 호출 시뮬레이션 (2초 지연)
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // 모의 성공 응답
            return {
                status: 'success',
                message: '정책이 성공적으로 적용되었습니다.',
                applied_changes: updates.length,
                timestamp: new Date().toISOString(),
            };
        } catch (error: any) {
            console.error('Error applying policy changes:', error);
            throw new Error('정책 변경 적용 중 오류가 발생했습니다.');
        }
    }

    /**
     * 정책 변경 사항을 백엔드 API로 전송
     * @param userArn 사용자 ARN
     * @param policyRecommendation 적용할 정책 추천 내용
     * @returns 적용 결과
     */
    async applyPolicyChangesToBackend(userArn: string, policyRecommendation: PolicyRecommendation): Promise<any> {
        try {
            console.log('정책 변경 백엔드 API 요청:', { userArn, policyRecommendation });

            // 백엔드 API 호출
            const response = await axios.post(
                `${this.apiUrl}/policy_recommendation/apply-policy-changes`,
                {
                    user_arn: userArn,
                    policy_recommendation: policyRecommendation
                },
                { withCredentials: true }
            );

            return response.data;
        } catch (error: any) {
            console.error('Error applying policy changes to backend:', error);
            throw new Error(
                error.response?.data?.detail || '정책 변경 적용 중 오류가 발생했습니다.'
            );
        }
    }

    /**
     * 사용자 ARN 목록 가져오기
     * @returns 사용자 ARN 목록
     */
    async getUserArns(): Promise<string[]> {
        try {
            // 분석 결과에서 사용자 ARN 추출
            const results = await this.getMultipleAnalyses();
            const uniqueUsers = [...new Set(results.map((result) => result.user))];
            return uniqueUsers;
        } catch (error: any) {
            console.error('Error fetching user ARNs:', error);
            // 실패 시 빈 배열 반환
            return [];
        }
    }
}

export default new PolicyService();