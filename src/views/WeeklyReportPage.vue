<!-- src/views/WeeklyReportPage.vue -->
<template>
    <AppLayout>
        <div class="page-container">
            <h1>주간 레포트</h1>
            <p>이 페이지는 주간 레포트를 보여줍니다.</p>
        </div>
    </AppLayout>
</template>

<script lang="ts">
    import { defineComponent } from 'vue';
    import AppLayout from '@/layouts/AppLayout.vue';

    export default defineComponent({
        name: 'WeeklyReportPage',
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
