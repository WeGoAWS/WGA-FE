<!-- src/views/PermissionsPage.vue -->
<template>
    <AppLayout>
        <div class="permissions-container">
            <h1>권한 관리</h1>
            <p class="description">IAM 권한 정책을 관리하고 사용자별 권한을 설정합니다.</p>

            <div class="tabs">
                <button 
                    @click="activeTab = 'general'"
                    :class="{ active: activeTab === 'general' }"
                    class="tab-button"
                >
                    일반 권한 관리
                </button>
                <button 
                    @click="activeTab = 'policy-changes'"
                    :class="{ active: activeTab === 'policy-changes' }"
                    class="tab-button"
                >
                    정책 변경사항 적용
                </button>
            </div>

            <!-- 일반 권한 관리 탭 -->
            <div v-if="activeTab === 'general'" class="tab-content">
                <div v-if="store.error" class="error-message">
                    {{ store.error }}
                </div>

                <!-- 로딩 상태 표시 -->
                <div v-if="store.loading" class="loading-container">
                    <div class="spinner"></div>
                    <p>권한 정보를 불러오는 중입니다...</p>
                </div>

                <!-- 권한 목록이 있을 때 -->
                <div v-else-if="store.hasPermissions" class="permissions-content">
                    <div class="permissions-list">
                        <h2>권한 목록</h2>
                        <div 
                            v-for="permission in store.permissions" 
                            :key="permission.id" 
                            class="permission-item"
                            :class="{ active: store.selectedPermission?.id === permission.id }"
                            @click="selectPermission(permission)"
                        >
                            <div class="permission-name">{{ permission.name }}</div>
                            <div class="permission-description">{{ permission.description }}</div>
                        </div>
                    </div>

                    <div class="permission-details" v-if="store.selectedPermission">
                        <h2>권한 상세 정보</h2>
                        <div class="detail-item">
                            <span class="label">이름:</span>
                            <span class="value">{{ store.selectedPermission.name }}</span>
                        </div>
                        <div class="detail-item">
                            <span class="label">설명:</span>
                            <span class="value">{{ store.selectedPermission.description }}</span>
                        </div>
                        
                        <div class="action-buttons">
                            <button class="edit-button">권한 수정</button>
                            <button class="delete-button" @click="deletePermission">권한 삭제</button>
                        </div>
                    </div>

                    <div class="empty-selection" v-else>
                        <p>왼쪽 목록에서 권한을 선택하세요.</p>
                    </div>
                </div>

                <!-- 권한 목록이 없을 때 -->
                <div v-else class="empty-state">
                    <p>권한 정보가 없습니다.</p>
                    <button class="load-button" @click="fetchPermissions">권한 불러오기</button>
                </div>

                <!-- 권한 추가 버튼 -->
                <div class="add-permission">
                    <button class="add-button">새 권한 추가</button>
                </div>
            </div>

            <!-- 정책 변경사항 적용 탭 -->
            <div v-else-if="activeTab === 'policy-changes'" class="tab-content">
                <div class="apply-changes-container">
                    <h3 class="section-title">정책 변경사항 적용</h3>

                    <div v-if="store.loading" class="loading-spinner">
                        <div class="spinner"></div>
                        <p>처리 중...</p>
                    </div>

                    <div v-else>
                        <div class="policy-description">
                            <p>권한 분석 결과에 따른 권한 변경 추천 사항을 적용합니다.</p>
                            <button @click="fetchAnalysisResults" class="refresh-button">분석 결과 새로고침</button>
                        </div>

                        <div v-if="store.analysisResults.length === 0" class="empty-analysis">
                            <p>권한 분석 결과가 없습니다. 먼저 분석 결과를 가져와주세요.</p>
                            <button @click="fetchAnalysisResults" class="fetch-button">분석 결과 가져오기</button>
                        </div>

                        <div v-else>
                            <div class="user-selection" v-if="store.userArns.length > 0">
                                <!-- 다중 선택 기능을 위한 체크박스 그룹 -->
                                <div class="selection-header">
                                    <h4>사용자 ARN 선택:</h4>
                                    <div class="selection-controls">
                                        <button @click="store.selectAllUsers()" class="select-all-button">
                                            {{ store.isAllSelected ? '전체 해제' : '전체 선택' }}
                                        </button>
                                    </div>
                                </div>
                                
                                <div class="users-container">
                                    <div 
                                        v-for="arn in store.userArns" 
                                        :key="arn" 
                                        class="user-checkbox-item"
                                    >
                                        <input 
                                            type="checkbox" 
                                            :id="`user-${arn}`" 
                                            :value="arn" 
                                            v-model="selectedUserArns"
                                            @change="handleUserSelectionChange"
                                        />
                                        <label :for="`user-${arn}`" class="user-arn-label">{{ formatUserName(arn) }}</label>
                                    </div>
                                </div>
                            </div>

                            <div v-if="selectedUserArns.length > 0" class="changes-info">
                                <p>{{ selectedUserArns.length }}명의 사용자에게 권한 변경사항이 적용됩니다.</p>
                            </div>

                            <div v-if="selectedUserArns.length > 0" class="changes-section">
                                <div class="add-permissions">
                                    <h4>추가할 권한</h4>
                                    <div v-if="store.combinedAddPermissions.length > 0" class="permission-list">
                                        <div
                                            v-for="(perm, index) in store.combinedAddPermissions"
                                            :key="index"
                                            class="permission-item"
                                        >
                                            <input type="checkbox" :id="`add-${index}`" v-model="perm.apply" />
                                            <label :for="`add-${index}`">{{ perm.action }}</label>
                                        </div>
                                    </div>
                                    <p v-else class="empty-message">추가할 권한이 없습니다.</p>
                                </div>

                                <div class="remove-permissions">
                                    <h4>제거할 권한</h4>
                                    <div v-if="store.combinedRemovePermissions.length > 0" class="permission-list">
                                        <div
                                            v-for="(perm, index) in store.combinedRemovePermissions"
                                            :key="index"
                                            class="permission-item"
                                        >
                                            <input type="checkbox" :id="`remove-${index}`" v-model="perm.apply" />
                                            <label :for="`remove-${index}`">{{ perm.action }}</label>
                                        </div>
                                    </div>
                                    <p v-else class="empty-message">제거할 권한이 없습니다.</p>
                                </div>

                                <button
                                    @click="applyChanges"
                                    class="apply-button"
                                    :disabled="!store.hasChangesToApply || store.submitting"
                                >
                                    {{ store.submitting ? '적용 중...' : '변경사항 적용' }}
                                </button>
                            </div>

                            <div v-else-if="store.userArns.length > 0" class="instruction">
                                적용할 사용자를 선택하세요.
                            </div>

                            <div v-else class="empty-message">사용자 ARN 목록을 가져올 수 없습니다.</div>
                        </div>
                    </div>

                    <div v-if="store.error" class="error-message">
                        {{ store.error }}
                    </div>

                    <div v-if="store.successMessage" class="success-message">
                        {{ store.successMessage }}
                    </div>
                </div>
            </div>
        </div>
    </AppLayout>
</template>

<script lang="ts">
    import { defineComponent, onMounted, ref, watch } from 'vue';
    import { useRouter, useRoute } from 'vue-router';
    import AppLayout from '@/layouts/AppLayout.vue';
    import { usePermissionsStore } from '@/stores/permissions';

    export default defineComponent({
        name: 'PermissionsPage',
        components: {
            AppLayout,
        },

        setup() {
            const store = usePermissionsStore();
            const router = useRouter();
            const route = useRoute();
            const activeTab = ref('general');
            const selectedUserArns = ref<string[]>([]);

            // URL 쿼리 파라미터 처리
            try {
                if (route.query && route.query.tab === 'policy-changes') {
                    activeTab.value = 'policy-changes';
                }
            } catch (err) {
                console.error('쿼리 파라미터 처리 오류:', err);
                activeTab.value = 'general';
            }

            onMounted(() => {
                try {
                    // 권한 데이터가 없는 경우에만 가져오기
                    if (!store.hasPermissions && activeTab.value === 'general') {
                        fetchPermissions();
                    }

                    // 정책 변경 탭이 활성화된 경우, 분석 결과 가져오기
                    if (activeTab.value === 'policy-changes' && store.analysisResults.length === 0) {
                        fetchAnalysisResults();
                    }

                    // 스토어에 선택된 사용자들이 있으면 선택
                    if (store.selectedUserArns.length > 0) {
                        selectedUserArns.value = [...store.selectedUserArns];
                    }
                } catch (err) {
                    console.error('컴포넌트 마운트 오류:', err);
                }
            });

            // activeTab 변경 감시
            watch(activeTab, (newValue) => {
                try {
                    // 정책 변경 탭으로 전환된 경우 분석 결과 가져오기
                    if (newValue === 'policy-changes' && store.analysisResults.length === 0) {
                        fetchAnalysisResults();
                    }
                } catch (err) {
                    console.error('탭 변경 감시 오류:', err);
                }
            });

            // selectedUserArns가 변경될 때 store 업데이트
            watch(selectedUserArns, (newValue) => {
                store.selectUserArns([...newValue]);
            });

            // 권한 데이터 가져오기
            const fetchPermissions = () => {
                try {
                    store.fetchPermissions();
                } catch (err) {
                    console.error('권한 데이터 가져오기 오류:', err);
                }
            };

            // 분석 결과 가져오기
            const fetchAnalysisResults = async () => {
                try {
                    await store.fetchAnalysisResults();
                    // 스토어 상태 반영
                    selectedUserArns.value = [...store.selectedUserArns];
                } catch (err) {
                    console.error('분석 결과 가져오기 오류:', err);
                }
            };

            // 권한 선택
            const selectPermission = (permission: any) => {
                try {
                    store.selectPermission(permission);
                } catch (err) {
                    console.error('권한 선택 오류:', err);
                }
            };

            // 권한 삭제
            const deletePermission = () => {
                try {
                    if (store.selectedPermission) {
                        if (confirm('정말 이 권한을 삭제하시겠습니까?')) {
                            store.deletePermission(store.selectedPermission.id);
                        }
                    }
                } catch (err) {
                    console.error('권한 삭제 오류:', err);
                }
            };

            // 사용자 선택 변경 처리
            const handleUserSelectionChange = () => {
                try {
                    store.selectUserArns([...selectedUserArns.value]);
                } catch (err) {
                    console.error('사용자 선택 오류:', err);
                }
            };

            // 정책 변경사항 적용
            const applyChanges = () => {
                try {
                    store.applyPolicyChanges();
                } catch (err) {
                    console.error('변경사항 적용 오류:', err);
                }
            };

            // ARN 형식의 사용자 정보를 보기 좋게 변환
            const formatUserName = (user: string): string => {
                try {
                    if (user && user.startsWith('arn:aws:')) {
                        // ARN에서 역할 이름만 추출
                        const parts = user.split('/');
                        if (parts.length > 1) {
                            return parts[parts.length - 1];
                        }
                    }
                    return user || 'Unknown';
                } catch (err) {
                    console.error('사용자명 포맷 오류:', err);
                    return user || 'Unknown';
                }
            };

            return {
                store,
                activeTab,
                selectedUserArns,
                fetchPermissions,
                fetchAnalysisResults,
                selectPermission,
                deletePermission,
                handleUserSelectionChange,
                applyChanges,
                formatUserName
            };
        },
    });
</script>

<style scoped>
    .permissions-container {
        padding: 20px;
        max-width: 1200px;
        margin: 0 auto;
    }

    .description {
        color: #666;
        margin-bottom: 20px;
    }

    .tabs {
        display: flex;
        margin-bottom: 20px;
        border-bottom: 1px solid #dee2e6;
    }

    .tab-button {
        padding: 10px 20px;
        background-color: transparent;
        border: none;
        cursor: pointer;
        font-size: 1rem;
        color: #495057;
        border-bottom: 3px solid transparent;
        transition: all 0.2s;
    }

    .tab-button.active {
        color: #007bff;
        border-bottom-color: #007bff;
    }

    .tab-content {
        margin-top: 20px;
    }

    .error-message {
        background-color: #fce4e4;
        border: 1px solid #f8b8b8;
        color: #d63301;
        padding: 10px 15px;
        border-radius: 4px;
        margin-bottom: 20px;
    }

    .loading-container, .loading-spinner {
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

    .permissions-content {
        display: grid;
        grid-template-columns: 1fr 2fr;
        gap: 20px;
        margin-bottom: 20px;
    }

    .permissions-list {
        background-color: #f8f9fa;
        border-radius: 8px;
        padding: 20px;
    }

    .permission-item {
        padding: 10px;
        border: 1px solid #e9ecef;
        border-radius: 5px;
        margin-bottom: 10px;
        cursor: pointer;
        transition: all 0.2s;
    }

    .permission-item:hover {
        background-color: #e9ecef;
    }

    .permission-item.active {
        background-color: #007bff;
        color: white;
        border-color: #007bff;
    }

    .permission-name {
        font-weight: bold;
        margin-bottom: 5px;
    }

    .permission-description {
        font-size: 0.9rem;
        color: inherit;
    }

    .permission-details {
        background-color: white;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .detail-item {
        margin-bottom: 15px;
    }

    .label {
        font-weight: bold;
        display: inline-block;
        width: 80px;
    }

    .action-buttons {
        margin-top: 20px;
        display: flex;
        gap: 10px;
    }

    .edit-button, .delete-button, .add-button, .load-button, .fetch-button {
        padding: 8px 15px;
        border-radius: 4px;
        cursor: pointer;
    }

    .edit-button {
        background-color: #007bff;
        color: white;
        border: none;
    }

    .delete-button {
        background-color: #dc3545;
        color: white;
        border: none;
    }

    .empty-selection, .empty-state, .empty-analysis {
        background-color: #f8f9fa;
        padding: 30px;
        text-align: center;
        border-radius: 8px;
    }

    .add-permission {
        margin-top: 20px;
    }

    .add-button, .load-button, .fetch-button {
        background-color: #28a745;
        color: white;
        border: none;
    }

    /* 정책 변경 탭 스타일 */
    .apply-changes-container {
        background-color: white;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .section-title {
        margin-top: 0;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 1px solid #e9ecef;
        color: #333;
    }

    .policy-description {
        margin-bottom: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 20px;
    }

    .refresh-button {
        padding: 8px 15px;
        background-color: #17a2b8;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }

    .selection-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
    }

    .selection-header h4 {
        margin: 0;
    }

    .selection-controls {
        display: flex;
        gap: 10px;
    }

    .select-all-button {
        padding: 4px 8px;
        font-size: 0.9rem;
        background-color: #f8f9fa;
        border: 1px solid #ced4da;
        border-radius: 4px;
        cursor: pointer;
    }

    .select-all-button:hover {
        background-color: #e9ecef;
    }

    .users-container {
        max-height: 200px;
        overflow-y: auto;
        border: 1px solid #ced4da;
        border-radius: 4px;
        padding: 5px;
        margin-bottom: 15px;
    }

    .user-checkbox-item {
        padding: 5px 10px;
        display: flex;
        align-items: center;
        border-bottom: 1px solid #f1f1f1;
    }

    .user-checkbox-item:last-child {
        border-bottom: none;
    }

    .user-arn-label {
        margin-left: 8px;
        cursor: pointer;
    }

    .changes-info {
        background-color: #e8f4fd;
        padding: 10px 15px;
        border-radius: 4px;
        margin-bottom: 15px;
        color: #0066cc;
        font-weight: bold;
    }

    .changes-section {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-bottom: 20px;
    }

    @media (max-width: 768px) {
        .changes-section {
            grid-template-columns: 1fr;
        }
    }

    .add-permissions,
    .remove-permissions {
        background-color: #f8f9fa;
        padding: 15px;
        border-radius: 4px;
    }

    .add-permissions h4 {
        color: #2e7d32;
        margin-top: 0;
    }

    .remove-permissions h4 {
        color: #d63301;
        margin-top: 0;
    }

    .permission-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 300px;
        overflow-y: auto;
    }

    .permission-item {
        display: flex;
        align-items: center;
        padding: 6px 10px;
        background-color: white;
        border-radius: 4px;
        border: 1px solid #dee2e6;
    }

    .permission-item input[type='checkbox'] {
        margin-right: 10px;
    }

    .empty-message {
        color: #6c757d;
        font-style: italic;
    }

    .apply-button {
        padding: 10px 20px;
        background-color: #28a745;
        color: white;
        border: none;
        border-radius: 4px;
        font-weight: bold;
        cursor: pointer;
        margin-top: 15px;
        transition: background-color 0.2s;
    }

    .apply-button:hover:not(:disabled) {
        background-color: #218838;
    }

    .apply-button:disabled {
        background-color: #cccccc;
        cursor: not-allowed;
    }

    .instruction {
        padding: 20px;
        text-align: center;
        color: #6c757d;
        background-color: #f8f9fa;
        border-radius: 4px;
    }

    .success-message {
        background-color: #d4edda;
        border: 1px solid #c3e6cb;
        color: #155724;
        padding: 10px 15px;
        border-radius: 4px;
        margin-top: 15px;
    }
</style>