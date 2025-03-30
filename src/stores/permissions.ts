// src/stores/permissions.ts
import { defineStore } from 'pinia';
import policyService from '@/services/policyService';
import type { PermissionChange, PolicyRecommendation, AnalysisResult } from '@/services/policyService';

interface PermissionsState {
  loading: boolean;
  error: string;
  permissions: any[]; // 권한 목록을 위한 타입
  selectedPermission: any | null;
  analysisResults: AnalysisResult[];
  userArns: string[];
  selectedUserArn: string;
  addPermissions: PermissionChange[];
  removePermissions: PermissionChange[];
  submitting: boolean;
  successMessage: string;
}

export const usePermissionsStore = defineStore('permissions', {
  state: (): PermissionsState => ({
    loading: false,
    error: '',
    permissions: [],
    selectedPermission: null,
    analysisResults: [],
    userArns: [],
    selectedUserArn: '',
    addPermissions: [],
    removePermissions: [],
    submitting: false,
    successMessage: '',
  }),

  getters: {
    hasPermissions: (state) => state.permissions.length > 0,
    
    // 적용할 변경사항이 있는지 확인
    hasChangesToApply: (state) => {
      return (
        state.addPermissions.some((p) => p.apply) ||
        state.removePermissions.some((p) => p.apply)
      );
    },
  },

  actions: {
    // 권한 데이터 가져오기
    async fetchPermissions() {
      this.loading = true;
      this.error = '';

      try {
        // API 호출을 통해 권한 데이터를 가져오는 로직
        // 여기서는 간단한 시뮬레이션
        await new Promise(resolve => setTimeout(resolve, 500));
        
        this.permissions = [
          { id: 1, name: '읽기 권한', description: '데이터 읽기 권한' },
          { id: 2, name: '쓰기 권한', description: '데이터 쓰기 권한' },
          { id: 3, name: '관리자 권한', description: '모든 시스템에 대한 관리자 권한' },
        ];
      } catch (err: any) {
        console.error('권한 데이터 가져오기 오류:', err);
        this.error = err.message || '권한 데이터를 불러오는 중 오류가 발생했습니다.';
      } finally {
        this.loading = false;
      }
    },

    // 권한 선택
    selectPermission(permission: any) {
      this.selectedPermission = permission;
    },

    // 권한 추가
    addPermission(permission: any) {
      this.permissions.push(permission);
    },

    // 권한 수정
    updatePermission(updatedPermission: any) {
      const index = this.permissions.findIndex(p => p.id === updatedPermission.id);
      if (index !== -1) {
        this.permissions[index] = { ...updatedPermission };
      }
    },

    // 권한 삭제
    deletePermission(permissionId: number) {
      this.permissions = this.permissions.filter(p => p.id !== permissionId);
      if (this.selectedPermission?.id === permissionId) {
        this.selectedPermission = null;
      }
    },

    // 백엔드 API에서 분석 결과 가져오기
    async fetchAnalysisResults() {
      this.loading = true;
      this.error = '';
      
      try {
        // 백엔드 API에서 분석 결과 가져오기
        const results = await policyService.getMultipleAnalyses();
        this.analysisResults = Array.isArray(results) ? results : [];
        
        // 사용자 ARN 목록 생성
        this.extractUserArns();
      } catch (err: any) {
        console.error('분석 결과 가져오기 오류:', err);
        this.error = err.message || '분석 결과를 불러오는 중 오류가 발생했습니다.';
        this.analysisResults = [];
      } finally {
        this.loading = false;
      }
    },

    // 분석 결과에서 사용자 ARN 추출
    extractUserArns() {
      try {
        const uniqueUsers = new Set<string>();
        
        this.analysisResults.forEach(result => {
          if (result && result.user) {
            uniqueUsers.add(result.user);
          }
        });
        
        this.userArns = Array.from(uniqueUsers);
      } catch (err) {
        console.error('사용자 ARN 추출 오류:', err);
        this.userArns = [];
      }
    },

    // 사용자 ARN 선택
    selectUserArn(userArn: string) {
      if (!userArn) return;
      
      this.selectedUserArn = userArn;
      this.extractPermissionsFromResults(userArn);
    },

    // 분석 결과에서 권한 추출
    extractPermissionsFromResults(userArn: string) {
      if (!userArn) {
        this.addPermissions = [];
        this.removePermissions = [];
        return;
      }
      
      try {
        // 선택된 사용자와 관련된 결과만 필터링
        const userResults = this.analysisResults.filter(
          (result: AnalysisResult) => {
            if (!result || !result.user) return false;
            return result.user === userArn || result.user.includes(userArn);
          }
        );

        if (userResults.length === 0) {
          this.addPermissions = [];
          this.removePermissions = [];
          return;
        }

        // 권한 목록 초기화
        const addPerms: PermissionChange[] = [];
        const removePerms: PermissionChange[] = [];

        // 각 분석 결과에서 권한 추출
        userResults.forEach((result: AnalysisResult) => {
          if (result && result.policy_recommendation) {
            // 추가 권한
            if (result.policy_recommendation.ADD && Array.isArray(result.policy_recommendation.ADD)) {
              result.policy_recommendation.ADD.forEach((action: string) => {
                if (!addPerms.some((p) => p.action === action)) {
                  addPerms.push({
                    action,
                    apply: false,
                    reason: result.policy_recommendation.Reason || '',
                  });
                }
              });
            }

            // 제거 권한
            if (result.policy_recommendation.REMOVE && Array.isArray(result.policy_recommendation.REMOVE)) {
              result.policy_recommendation.REMOVE.forEach((action: string) => {
                if (!removePerms.some((p) => p.action === action)) {
                  removePerms.push({
                    action,
                    apply: false,
                    reason: result.policy_recommendation.Reason || '',
                  });
                }
              });
            }
          }
        });

        this.addPermissions = addPerms;
        this.removePermissions = removePerms;
      } catch (err) {
        console.error('권한 추출 오류:', err);
        this.addPermissions = [];
        this.removePermissions = [];
      }
    },

    // 정책 변경사항 적용
    async applyPolicyChanges() {
      if (!this.selectedUserArn || !this.hasChangesToApply) return;

      this.submitting = true;
      this.error = '';
      this.successMessage = '';

      try {
        // 선택된 권한들만 필터링
        const addSelected = this.addPermissions.filter((p) => p.apply);
        const removeSelected = this.removePermissions.filter((p) => p.apply);

        // 백엔드 API 요청 형식에 맞게 데이터 변환
        const policyRecommendation: PolicyRecommendation = {
          REMOVE: removeSelected.map(p => p.action),
          ADD: addSelected.map(p => p.action),
          Reason: "사용자에 의해 선택된 권한 변경사항"
        };

        // 백엔드로 변경사항 전송
        const result = await policyService.applyPolicyChangesToBackend(this.selectedUserArn, policyRecommendation);

        this.successMessage = '권한 변경사항이 성공적으로 적용되었습니다.';

        // 성공 후 체크박스 초기화
        this.addPermissions.forEach((p) => (p.apply = false));
        this.removePermissions.forEach((p) => (p.apply = false));
      } catch (err: any) {
        console.error('권한 변경 적용 오류:', err);
        this.error = err.message || '권한 변경 적용 중 오류가 발생했습니다.';
      } finally {
        this.submitting = false;
      }
    },

    // 상태 초기화
    resetState() {
      this.loading = false;
      this.error = '';
      this.permissions = [];
      this.selectedPermission = null;
      this.analysisResults = [];
      this.userArns = [];
      this.selectedUserArn = '';
      this.addPermissions = [];
      this.removePermissions = [];
      this.submitting = false;
      this.successMessage = '';
    }
  }
});