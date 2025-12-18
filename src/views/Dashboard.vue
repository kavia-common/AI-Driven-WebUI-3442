<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import type { DashboardResponse } from '../types/dashboard';
import { getDashboardData } from '../services/api/dashboard';
import SystemInfo from '../components/dashboard/SystemInfo.vue';
import CpuUsage from '../components/dashboard/CpuUsage.vue';
import MemoryStatus from '../components/dashboard/MemoryStatus.vue';
import WanStatus from '../components/dashboard/WanStatus.vue';
import WifiStatus from '../components/dashboard/WifiStatus.vue';
import EthernetStatus from '../components/dashboard/EthernetStatus.vue';
import { useQA } from '../utils/qa';
const { isQAMode, qa, slug } = useQA();

const { t } = useI18n();
const router = useRouter();
const dashboardData = ref<DashboardResponse | null>(null);
const refreshInterval = ref<number | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

const fetchData = async () => {
  try {
    const data = await getDashboardData();
    dashboardData.value = data;
    error.value = null;
  } catch (err) {
    console.error('Error fetching dashboard data:', err);
    error.value = 'Failed to fetch dashboard data';
    if (err instanceof Error && (err.message.includes('401')||err.message.includes('403'))) {
      router.push('/login');
    }
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchData();
  refreshInterval.value = window.setInterval(fetchData, 3000); // Refresh every 3 seconds
});

onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
  }
});
</script>

<template>
  <div class="page-container">
    <h1 class="page-title" :data-testid="qa('dashboard-title')">{{ t('menu.home') }}</h1>
    
    <div class="status-content" :data-testid="qa('dashboard-content')">
    <div v-if="loading" class="loading-state" :data-testid="qa('dashboard-loading')">
      <div class="loading-spinner"></div>
      <p class="body">Loading dashboard data...</p>
    </div>

    <div v-else-if="error" class="error-state" :data-testid="qa('dashboard-error')">
      <p class="body">{{ error }}</p>
      <button
        @click="fetchData"
        class="retry-button button-text"
        :data-testid="qa('dashboard-retry-button')"
      >
        Retry
      </button>
    </div>
    
    <div v-else class="dashboard-grid" :data-testid="qa('dashboard-grid')">
      <SystemInfo 
        class="dashboard-item"
        :data-testid="qa('dashboard-system-info')"
        :system-info="dashboardData?.Dashboard.System"
      />
      <CpuUsage 
        class="dashboard-item"
        :data-testid="qa('dashboard-cpu-usage')"
        :cpu-info="dashboardData?.Dashboard.CPU"
      />
      <MemoryStatus 
        class="dashboard-item"
        :data-testid="qa('dashboard-memory-status')"
        :memory-info="dashboardData?.Dashboard.Memory"
      />
      <WanStatus 
        class="dashboard-item"
        :data-testid="qa('dashboard-wan-status')"
        :wan-info="dashboardData?.Dashboard.WAN"
      />
      <WifiStatus 
        class="dashboard-item"
        :data-testid="qa('dashboard-wifi-status')"
        :wifi-info="dashboardData?.Dashboard.WiFi"
      />
      <EthernetStatus 
        class="dashboard-item"
        :data-testid="qa('dashboard-ethernet-status')"
        :ethernet-info="dashboardData?.Dashboard.Ethernet"
      />
    </div>
  </div>
  </div>
</template>

<style scoped>
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  padding: 1.5rem;
}

.dashboard-item {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  max-width: 100%;       /* 限制寬度不能被內部撐爆 */
  overflow: hidden;      /* 限制文字外溢 */
  padding: 1.5rem;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem;
  text-align: center;
}

.error-state {
  padding: 2rem;
  text-align: center;
  color: #dc3545;
}

.retry-button {
  margin-top: 1rem;
  padding: 0.5rem 1.5rem;
  background-color: #0070BB;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.retry-button:hover {
  background-color: #005a96;
}

@media (min-width: 1200px) {
  .dashboard-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 767px) {
  .dashboard-grid {
    padding: 1rem;
    gap: 1rem;
  }
}
</style>