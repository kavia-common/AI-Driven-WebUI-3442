<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import type { MeshNode } from '../../types/mesh';
import { getMeshMap, applySteeringControl } from '../../services/api/mesh'; 
import MeshNodeTable from '../../components/mesh/MeshNodeTable.vue';
import MeshClientTable from '../../components/mesh/MeshClientTable.vue';
import MeshSteeringModal from '../../components/mesh/MeshSteeringModal.vue';
import MeshTopologyMap from '../../components/mesh/MeshTopologyMap.vue';
import { useQA } from '../../utils/qa';
const { isQAMode, qa, slug } = useQA();

const { t } = useI18n();
const meshData = ref<MeshNode[]>([]);
const showMap = ref(false);
const selectedClient = ref<MeshNode | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const refreshInterval = ref<number | null>(null);

const nodes = computed(() => 
  meshData.value.filter(node => node.Mode !== 'Client')
);

const clients = computed(() => 
  meshData.value.filter(node => node.Mode === 'Client')
);

// Function to check if mesh data has changed
const hasMeshDataChanged = (newData: MeshNode[], oldData: MeshNode[]): boolean => {
  if (newData.length !== oldData.length) return true;
  
  // Create maps for faster lookup
  const oldDataMap = new Map(oldData.map(node => [node.MACAddress, node]));
  
  // Check if any nodes are different
  return newData.some(newNode => {
    const oldNode = oldDataMap.get(newNode.MACAddress);
    if (!oldNode) return true;
    
    // Compare relevant properties
    return (
      newNode.Mode !== oldNode.Mode ||
      newNode.ipv4 !== oldNode.ipv4 ||
      newNode.MediaType !== oldNode.MediaType ||
      newNode.Upstream !== oldNode.Upstream ||
      newNode.SupportedBand !== oldNode.SupportedBand
    );
  });
};

const fetchMeshData = async () => {
  loading.value = true;
  error.value = null;
  try {
    const response = await getMeshMap();
    if ('NOK' in response) {
      error.value = 'Mesh is disabled';
      meshData.value = [];
    } else {
      // Only update if data has changed
      if (hasMeshDataChanged(response.MeshMap, meshData.value)) {
        meshData.value = response.MeshMap;
      }
    }
  } catch (err: unknown) {
    console.error('Error fetching mesh data:', err);
    error.value = 'Failed to fetch mesh data';
    meshData.value = [];
  } finally {
    loading.value = false;
  }
};

const handleAction = (client: MeshNode) => {
  selectedClient.value = client;
};

const handleSteeringApply = async (data: { destination: string; band: string }) => {
  if (!selectedClient.value) return;
  
  try {
    await applySteeringControl({
      stationMac: selectedClient.value.MACAddress,
      targetBssid: data.destination,
      band: data.band
    });
    
    // Refresh mesh data after successful steering
    await fetchMeshData();
    selectedClient.value = null;
  } catch (err) {
    console.error('Error applying steering control:', err);
    error.value = 'Failed to apply steering control';
  }
};

const getPossibleDestinations = () => {
  return nodes.value.filter(node => 
    node.Mode === 'Agent' && node.MACAddress !== selectedClient.value?.Upstream
  );
};

onMounted(() => {
  fetchMeshData();
  // Set up auto-refresh every 5 seconds
  // refreshInterval.value = window.setInterval(fetchMeshData, 5000);
});

onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
  }
});
</script>

<template>
  <div class="page-container">
    <h1 class="page-title" :data-testid="qa('mesh-title')">{{ t('mesh.title') }}</h1>

    <div class="status-content" :data-testid="qa('mesh-content')">
      <!-- Loading State -->
      <div v-if="loading" class="loading-state" :data-testid="qa('mesh-loading')">
        <div class="loading-spinner"></div>
        {{ t('common.loading') }}
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state" :data-testid="qa('mesh-error')">
        {{ error }}
      </div>

      <!-- Content State -->
      <template v-else>
        <!-- Network Information Section -->
        <div class="panel-section" :data-testid="qa('mesh-network-section')">
          <div class="header-row">
            <div class="section-title-sp section-title-text" :data-testid="qa('mesh-network-title')">{{ t('mesh.networkInformation') }}</div>
            <button 
              class="btn btn-primary"
              :data-testid="qa('mesh-toggle-view-button')"
              @click="showMap = !showMap"
            >
              <span class="material-icons">{{ showMap ? 'list' : 'map' }}</span>
              {{ showMap ? t('mesh.list') : t('mesh.map') }}
            </button>
          </div>

          <div class="card-content">
            <template v-if="!showMap" :data-testid="qa('mesh-list-view')">
              <MeshNodeTable :nodes="nodes" />
              <MeshClientTable 
                :clients="clients"
                @action="handleAction"
              />
            </template>
            <template v-else :data-testid="qa('mesh-map-view')">
              <MeshTopologyMap :nodes="meshData" />
            </template>

            <div class="button-group">
              <button 
                class="btn btn-primary"
                :data-testid="qa('mesh-refresh-button')"
                @click="fetchMeshData"
                :disabled="loading"
              >
                <span class="material-icons">refresh</span>
                {{ t('common.refresh') }}
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>

    <MeshSteeringModal
      v-if="selectedClient"
      :data-testid="qa('mesh-steering-modal')"
      :node="selectedClient"
      :destinations="getPossibleDestinations()"
      @close="selectedClient = null"
      @apply="handleSteeringApply"
    />
  </div>
</template>

<style scoped>
.section-title-sp {
  /* Typography handled by global tokens/utilities via .section-title-text. */
  color: var(--text-primary);
  padding: 0.5rem 0rem;
  background-color: white;
}

.button-group {
  display: flex;
  justify-content: center;
  margin-top: 1.5rem;
}

.btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem;
  color: var(--text-secondary);
}

.error-state {
  padding: 2rem;
  text-align: center;
  color: #dc3545;
}

@media (max-width: 768px) {
  .header-row {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }

  .btn {
    width: 100%;
    justify-content: center;
  }
}
</style>