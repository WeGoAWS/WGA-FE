<!-- src/views/ServerAccessPage.vue -->
<template>
    <AppLayout>
        <div class="page-container">
            <h1>서버 접근 현황</h1>
            <p>이 페이지는 서버 접근 현황을 보여줍니다.</p>
        </div>
    </AppLayout>
</template>

<script lang="ts">
    import { defineComponent } from 'vue';
    import AppLayout from '@/layouts/AppLayout.vue';

    export default defineComponent({
        name: 'ServerAccessPage',
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
