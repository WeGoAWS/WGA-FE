<!-- src/views/PermissionsPage.vue -->
<template>
    <AppLayout>
        <div class="page-container">
            <h1>권한 관리</h1>
            <p>이 페이지는 권한 관리 기능을 제공합니다.</p>
        </div>
    </AppLayout>
</template>

<script lang="ts">
    import { defineComponent } from 'vue';
    import AppLayout from '@/layouts/AppLayout.vue';

    export default defineComponent({
        name: 'PermissionsPage',
        components: {
            AppLayout,
        },
    });
</script>

<style scoped>
    .page-container {
        padding: 20px;
    }
</style>
