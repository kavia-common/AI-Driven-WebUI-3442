<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter, useRoute } from 'vue-router';
import { getWlanMesh, updateWlanMesh } from '../../../services/api/wireless';
import type { WlanMeshResponse } from '../../../types/wireless';
import BlockingOverlay from '../../../components/BlockingOverlay.vue';
import { useQA } from '../../../utils/qa';
const { isQAMode, qa, slug } = useQA();

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const meshData = ref<WlanMeshResponse | null>(null);
const loading = ref(false);
const showSuccess = ref(false);
const error = ref<string | null>(null);
const showBlockingOverlay = ref(false);

// Computed property to check if Mesh is disabled by MLO
const isMeshDisabledByMLO = computed(() => {
  return meshData.value?.WlanMesh.MLOEnable === 1;
});

const fetchMeshConfig = async () => {
  loading.value = true;
  error.value = null;
  try {
    meshData.value = await getWlanMesh();
  } catch (err) {
    console.error('Error fetching mesh config:', err);
    error.value = 'Failed to fetch mesh config';
  } finally {
    loading.value = false;
  }
};

const showSuccessMessage = () => {
  showSuccess.value = true;
  setTimeout(() => {
    showSuccess.value = false;
  }, 3000);
};

const handleBlockingComplete = () => {
  showBlockingOverlay.value = false;
  // 保持在 mesh 分頁並重新載入頁面
  const currentPath = route.path;
  router.replace({ path: currentPath, query: { tab: 'mesh' } }).then(() => {
    router.go(0);
  });
};

const handleSubmit = async () => {
  if (!meshData.value) return;
  showBlockingOverlay.value = true;
  loading.value = true;
  try {
    await updateWlanMesh({
      WlanMesh: {
        MeshEnable: Number(meshData.value.WlanMesh.MeshEnable),
        CommonSSID: meshData.value.WlanMesh.CommonSSID
      }
    });
    showSuccessMessage();
    
    // Show blocking overlay instead of immediate refresh
  } catch (err) {
    console.error('Error updating mesh config:', err);
    error.value = 'Failed to update mesh config';
  } finally {
    loading.value = false;
  }
};

onMounted(fetchMeshConfig);
</script>

<template>
  <div class="mesh-config" :data-testid="qa('wireless-mesh-config-content')">
    <div v-if="loading" class="loading-state" :data-testid="qa('wireless-mesh-config-loading')">
      <div class="loading-spinner"></div>
      <span>{{ t('common.loading') }}</span>
    </div>

    <div v-else-if="error" class="error-state" :data-testid="qa('wireless-mesh-config-error')">
      {{ error }}
    </div>

    <template v-else-if="meshData">
      <!-- Show info banner when Mesh is disabled by MLO -->
      <div v-if="isMeshDisabledByMLO" class="mlo-status" :data-testid="qa('wireless-mesh-config-mlo-status')">
        <div class="info-banner" :data-testid="qa('wireless-mesh-config-mlo-info-banner')">
          <span class="material-icons">info</span>
          <span class="body-sm">{{ t('wireless.mloMeshWarning') }}</span>
        </div>
      </div>

      <div class="switch-label">
        <span :data-testid="qa('wireless-mesh-config-enable-label')">{{ t('wireless.easyMesh') }}</span>
        <label class="switch">
          <input
            type="checkbox"
            :data-testid="qa('wireless-mesh-config-enable-toggle')"
            v-model="meshData.WlanMesh.MeshEnable"
            :true-value="1"
            :false-value="0"
          >
          <span class="slider"></span>
        </label>
      </div>

      <div class="common-ssid" v-if="meshData.WlanMesh.MeshEnable === 1" :data-testid="qa('wireless-mesh-config-ssid-section')">
        <div class="section-title section-title-text" :data-testid="qa('wireless-mesh-config-ssid-title')">{{ t('wireless.commonSsidConfig') }}</div>
        <div class="ssid-content" :data-testid="qa('wireless-mesh-config-ssid-content')">
          <div class="form-group">
            <label :data-testid="qa('wireless-mesh-config-ssid-label')">SSID</label>
            <input
              type="text"
              :data-testid="qa('wireless-mesh-config-ssid-input')"
              v-model="meshData.WlanMesh.CommonSSID"
              required
            />
          </div>
        </div>
      </div>

      <div class="button-group" :data-testid="qa('wireless-mesh-config-button-group')">
        <button class="btn btn-secondary" :data-testid="qa('wireless-mesh-config-cancel-button')" @click="fetchMeshConfig" :disabled="loading">
          {{ t('common.cancel') }}
        </button>
        <button class="btn btn-primary" :data-testid="qa('wireless-mesh-config-apply-button')" @click="handleSubmit" :disabled="loading">
          {{ t('common.apply') }}
        </button>
      </div>
    </template>

    <div v-if="showSuccess" class="success-message" :data-testid="qa('wireless-mesh-config-success-message')">
      {{ t('common.apply') }} successful
    </div>

    <!-- Blocking Overlay -->
    <BlockingOverlay
      :data-testid="qa('wireless-mesh-config-blocking-overlay')"
      :is-visible="showBlockingOverlay"
      message="Applying WiFi Mesh Settings..."
      :duration="30"
      @complete="handleBlockingComplete"
    />
  </div>
</template>

<style scoped>
.mesh-config {
  padding: 1.5rem;
}

.mlo-status {
  margin-bottom: 1.5rem;
}

.info-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background-color: #e3f2fd;
  border-left: 4px solid #0070BB;
  border-radius: 4px;
  color: #0070BB;
}

.info-banner .material-icons {
  font-size: 1.25rem;
}

.switch-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--text-primary);
  margin-bottom: 1.5rem;
}

.switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;
  flex-shrink: 0;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 34px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 26px;
  width: 26px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--primary-color);
}

input:checked + .slider:before {
  transform: translateX(26px);
}

input:disabled + .slider {
  opacity: 0.6;
  cursor: not-allowed;
}

.common-ssid {
  background-color: white;
  border-radius: 4px;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.2);
}

.ssid-content {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  /* Typography handled globally (token-driven). */
}

.button-group {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}

.success-message {
  position: fixed;
  top: 20px;
  right: 20px;
  background-color: #4caf50;
  color: white;
  padding: 1rem 2rem;
  border-radius: 4px;
  animation: fadeInOut 3s ease-in-out;
  z-index: 100;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem;
  background-color: white;
  border-radius: 4px;
  box-shadow: var(--shadow-sm);
}

.error-state {
  padding: 2rem;
  text-align: center;
  color: #dc3545;
  background-color: white;
  border-radius: 4px;
  box-shadow: var(--shadow-sm);
}

@keyframes fadeInOut {
  0% { opacity: 0; transform: translateY(-20px); }
  10% { opacity: 1; transform: translateY(0); }
  90% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-20px); }
}

@media (max-width: 768px) {
  .mesh-config {
    padding: 1rem;
  }

  .ssid-content {
    padding: 1rem;
  }

  .button-group {
    flex-direction: column;
  }

  .button-group .btn {
    width: 100%;
  }
}
</style>
