// src/stores/permissions.ts
import { defineStore } from 'pinia';
import policyService from '@/services/policyService';
import type { PermissionChange, PolicyRecommendation, AnalysisResult, PolicyUpdates } from '@/services/policyService';

interface PermissionsState {
  loading: boolean;
  error: string;
  permissions: any[]; // 권한 목록을 위한 타입
  selectedPermission: any | null;
  analysisResults: AnalysisResult[];
  userArns: string[];
  selectedUserArns: string[]; // 다중 선택을 위한 배열
  userPermissionsMap: Map<string, {
    add: PermissionChange[];
    remove: PermissionChange[];
  }>;
  combinedAddPermissions: PermissionChange[];
  combinedRemovePermissions: PermissionChange[];
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
    selectedUserArns: [],
    userPermissionsMap: new Map(),
    combinedAddPermissions: [],
    combinedRemovePermissions: [],
    submitting: false,
    successMessage: '',
  }),

  getters: {
    hasPermissions: (state) => state.permissions.length > 0,
    
    // 적용할 변경사항이 있는지 확인
    hasChangesToApply: (state) => {
      return (
        state.combinedAddPermissions.some((p) => p.apply) ||
        state.combinedRemovePermissions.some((p) => p.apply)
      );
    },
    
    // 전체 선택 여부
    isAllSelected: (state) => {
      return state.selectedUserArns.length === state.userArns.length && state.userArns.length > 0;
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
        
        // 모든 사용자의 권한 정보 추출
        this.extractAllUserPermissions();
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

    // 전체 사용자 선택/해제
    selectAllUsers() {
      if (this.isAllSelected) {
        // 전체 해제
        this.selectedUserArns = [];
      } else {
        // 전체 선택
        this.selectedUserArns = [...this.userArns];
      }
      this.updateCombinedPermissions();
    },

    // 사용자 ARN 선택 (다중 선택 지원)
    selectUserArns(userArns: string[]) {
      this.selectedUserArns = userArns;
      this.updateCombinedPermissions();
    },

    // 단일 사용자 ARN 토글
    toggleUserArn(userArn: string) {
      const index = this.selectedUserArns.indexOf(userArn);
      if (index >= 0) {
        this.selectedUserArns.splice(index, 1);
      } else {
        this.selectedUserArns.push(userArn);
      }
      this.updateCombinedPermissions();
    },

    // 모든 사용자의 권한 정보 추출
    // 모든 사용자의 권한 정보 추출 (정확한 이름 매칭 사용)
    extractAllUserPermissions() {
      // 사용자별 권한 맵 초기화
      this.userPermissionsMap.clear();
      
      // 각 사용자에 대한 권한 추출
      this.userArns.forEach(userArn => {
        // 정확한 사용자 이름 매칭을 위한 함수
        const exactUserMatch = (resultUser: string, targetUserArn: string): boolean => {
          // 정확히 일치하는 경우
          if (resultUser === targetUserArn) return true;
          
          // ARN 형식에서 사용자/역할 이름 추출 (마지막 부분)
          // 예: "arn:aws:iam::123456789012:user/username" -> "username"
          const getExactUserName = (arn: string): string => {
            const parts = arn.split('/');
            return parts.length > 1 ? parts[parts.length - 1] : arn;
          };
          
          // 추출된 정확한 사용자/역할 이름 비교
          const resultUserName = getExactUserName(resultUser);
          const targetUserName = getExactUserName(targetUserArn);
          
          return resultUserName === targetUserName;
        };
        
        // 정확한 매칭으로 해당 사용자의 결과만 필터링
        const userResults = this.analysisResults.filter(
          (result: AnalysisResult) => {
            if (!result || !result.user) return false;
            return exactUserMatch(result.user, userArn);
          }
        );

        if (userResults.length === 0) {
          this.userPermissionsMap.set(userArn, { add: [], remove: [] });
          return;
        }

        // 권한 목록 초기화
        const addPerms: PermissionChange[] = [];
        const removePerms: PermissionChange[] = [];

        // 각 분석 결과에서 권한 추출
        userResults.forEach((result: AnalysisResult) => {
          if (result.policy_recommendation) {
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

        // 사용자별 권한 맵에 저장
        this.userPermissionsMap.set(userArn, { add: addPerms, remove: removePerms });
      });
    },

    // 선택된 사용자들의 권한 조합 업데이트
    updateCombinedPermissions() {
      if (this.selectedUserArns.length === 0) {
        this.combinedAddPermissions = [];
        this.combinedRemovePermissions = [];
        return;
      }
      
      // 선택된 첫 번째 사용자의 권한만 표시 (각 사용자의 권한을 개별적으로 보여주기 위함)
      if (this.selectedUserArns.length === 1) {
        const userArn = this.selectedUserArns[0];
        const userPerms = this.userPermissionsMap.get(userArn);
        
        if (userPerms) {
          // 깊은 복사를 사용하여 원본 객체 변경 방지
          this.combinedAddPermissions = userPerms.add.map(perm => ({...perm}));
          this.combinedRemovePermissions = userPerms.remove.map(perm => ({...perm}));
        } else {
          this.combinedAddPermissions = [];
          this.combinedRemovePermissions = [];
        }
        return;
      }
      
      // 여러 사용자가 선택된 경우, UI에서는 탭으로 처리하므로 combinedPermissions 비워둠
      // 실제 적용시에는 각 사용자마다 개별적인 권한을 사용함
      this.combinedAddPermissions = [];
      this.combinedRemovePermissions = [];
    },

    // 정책 변경사항 적용 (다중 사용자 지원)
    async applyPolicyChanges() {
      if (this.selectedUserArns.length === 0) return;

      this.submitting = true;
      this.error = '';
      this.successMessage = '';

      try {
        // 각 사용자별로 개별 변경사항을 적용
        const policyUpdates: PolicyUpdates[] = [];
        
        // 각 사용자마다 해당 사용자의 권한 변경사항을 찾아서 적용
        for (const userArn of this.selectedUserArns) {
          const userPermissions = this.userPermissionsMap.get(userArn);
          
          if (userPermissions) {
            // 해당 사용자의 권한 중 적용할 항목만 필터링
            const addSelected = userPermissions.add.filter((p) => p.apply);
            const removeSelected = userPermissions.remove.filter((p) => p.apply);
            
            // 적용할 권한이 있는 경우에만 업데이트 목록에 추가
            if (addSelected.length > 0 || removeSelected.length > 0) {
              policyUpdates.push({
                user_arn: userArn,
                add_permissions: addSelected,
                remove_permissions: removeSelected,
              });
            }
          }
        }

        // 적용할 변경사항이 하나라도 있는 경우에만 API 호출
        if (policyUpdates.length > 0) {
          // 백엔드로 변경사항 전송
          const result = await policyService.applyPolicyChanges(policyUpdates);

          this.successMessage = `${policyUpdates.length}명의 사용자에게 권한 변경사항이 성공적으로 적용되었습니다.`;
          
          // 성공 후 해당 사용자들의 체크박스 초기화
          for (const userArn of this.selectedUserArns) {
            const userPermissions = this.userPermissionsMap.get(userArn);
            if (userPermissions) {
              userPermissions.add.forEach((p) => (p.apply = false));
              userPermissions.remove.forEach((p) => (p.apply = false));
            }
          }
          
          // 조합된 권한 목록도 초기화
          this.combinedAddPermissions.forEach((p) => (p.apply = false));
          this.combinedRemovePermissions.forEach((p) => (p.apply = false));
        } else {
          this.error = "적용할 권한 변경사항이 없습니다. 변경할 권한을 선택해주세요.";
        }
      } catch (err: any) {
        console.error('권한 변경 적용 오류:', err);
        this.error = err.message || '정책 변경 적용 중 오류가 발생했습니다.';
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
      this.selectedUserArns = [];
      this.userPermissionsMap.clear();
      this.combinedAddPermissions = [];
      this.combinedRemovePermissions = [];
      this.submitting = false;
      this.successMessage = '';
    }
  }
});