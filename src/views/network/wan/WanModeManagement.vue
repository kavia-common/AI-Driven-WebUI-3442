<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import type { WanModeConfig } from '../../../types/wanManagement';
import { getWanModeManagement, updateWanModeManagement } from '../../../services/api/wanManagement';
import WanModeEdit from './WanModeEdit.vue';
import WanModeDetail from './WanModeDetail.vue';
import { useQA } from '../../../utils/qa';
const { isQAMode, qa, slug } = useQA();

const { t } = useI18n();
const managementData = ref<WanModeConfig[]>([]);
const tempManagementData = ref<WanModeConfig[]>([]);
const loading = ref(false);
const showSuccess = ref(false);
const error = ref<string | null>(null);
const isEditing = ref(false);
const editingMode = ref<WanModeConfig | null>(null);
const viewingMode = ref<WanModeConfig | null>(null);

const fetchManagementData = async () => {
  loading.value = true;
  error.value = null;
  try {
    const response = await getWanModeManagement();
    managementData.value = response.WanModeManagement;
    tempManagementData.value = JSON.parse(JSON.stringify(response.WanModeManagement));
  } catch (err) {
    console.error('Error fetching WAN mode management:', err);
    error.value = 'Failed to fetch WAN mode management';
  } finally {
    loading.value = false;
  }
};

const handleAdd = () => {
  editingMode.value = {
    WANMode: '',
    Status: 'Enabled',
    PhysicalType: 'Ethernet',
    EnableSensing: 1,
    DNSMode: 'Dynamic',
    IPv6DNSMode: 'Dynamic',
    Interfaces: [{
      Interface: 'wan',
      IPv4Mode: 'dhcp4',
      IPv6Mode: 'none',
      PPPoEUserName: '',
      PPPoEPassword: '',
      VLANType: 'untagged',
      VLANID: 100, 
      VLANPriority: 0,  
      StaticIPv4Address: { 
        IPv4Address: '',
        SubnetMask: '',
        DNSServers: '',
        DefaultRouter: ''
      },
      StaticIPv6Address: {
        IPv6Address: '',
        PrefixLength: 0,
        DNSServers: '',
        DefaultRouter: ''
      }
    }]
  };
  isEditing.value = true;
};

const handleEdit = (mode: WanModeConfig) => {
  editingMode.value = JSON.parse(JSON.stringify(mode));
  isEditing.value = true;
};

const handleDelete = async (mode: WanModeConfig) => {
  if (!confirm(t('wanManagement.confirmDelete'))) return;
  
  try {
    const updatedModes = tempManagementData.value.filter(m => m.WANMode !== mode.WANMode);
    tempManagementData.value = updatedModes;
  } catch (err) {
    console.error('Error deleting WAN mode:', err);
    error.value = 'Failed to delete WAN mode';
  }
};

const handleDetail = (mode: WanModeConfig) => {
  viewingMode.value = mode;
};

const handleSave = async (mode: WanModeConfig) => {
  try {
    const updatedModes = editingMode.value?.WANMode
      ? tempManagementData.value.map(m => m.WANMode === editingMode.value?.WANMode ? mode : m)
      : [...tempManagementData.value, mode];

    tempManagementData.value = updatedModes;
    isEditing.value = false;
    editingMode.value = null;
  } catch (err) {
    console.error('Error saving WAN mode:', err);
    error.value = 'Failed to save WAN mode';
  }
};

const showSuccessMessage = () => {
  showSuccess.value = true;
  setTimeout(() => {
    showSuccess.value = false;
  }, 3000);
};

const handleApply = async () => {
  loading.value = true;
  try {
    await updateWanModeManagement({
      WanModeManagement: tempManagementData.value
    });
    managementData.value = JSON.parse(JSON.stringify(tempManagementData.value));
    showSuccessMessage();
  } catch (err) {
    console.error('Error applying WAN mode changes:', err);
    error.value = 'Failed to apply changes';
  } finally {
    loading.value = false;
  }
};

const handleCancel = () => {
  tempManagementData.value = JSON.parse(JSON.stringify(managementData.value));
};

onMounted(fetchManagementData);
</script>

<template>
  <div class="wan-mode-management" :data-testid="qa('wan-mode-management-content')">
    <div v-if="loading" class="loading-state" :data-testid="qa('wan-mode-management-loading')">
      <div class="loading-spinner"></div>
      <span>{{ t('common.loading') }}</span>
    </div>

    <div v-else-if="error" class="error-state" :data-testid="qa('wan-mode-management-error')">
      {{ error }}
    </div>

    <template v-else>
      <div v-if="!isEditing && !viewingMode" class="management-list" :data-testid="qa('wan-mode-management-list')">
        <div class="header-row">
          <!-- Typography: section heading aligned to Backup WAN section title scale -->
          <div class="section-title-sp section-title-text" :data-testid="qa('wan-mode-management-title')">{{ t('wanSetup.modeManagement') }}</div>
          <button class="btn btn-primary" :data-testid="qa('wan-mode-management-add-button')" @click="handleAdd">
            <span class="material-icons">add</span>
            {{ t('wanManagement.addMode') }}
          </button>
        </div>

        <div class="table-container" :data-testid="qa('wan-mode-management-table-container')">
          <table :data-testid="qa('wan-mode-management-table')">
            <thead>
              <tr>
                <th :data-testid="qa('wan-mode-management-header-name')">{{ t('wanManagement.name') }}</th>
                <th :data-testid="qa('wan-mode-management-header-enable-sensing')">{{ t('wanManagement.enableSensing') }}</th>
                <th :data-testid="qa('wan-mode-management-header-ipv4-dns-mode')">{{ t('wanManagement.ipv4DnsMode') }}</th>
                <th :data-testid="qa('wan-mode-management-header-ipv6-dns-mode')">{{ t('wanManagement.ipv6DnsMode') }}</th>
                <th :data-testid="qa('wan-mode-management-header-physical-type')">{{ t('wanManagement.physicalType') }}</th>
                <th :data-testid="qa('wan-mode-management-header-status')">{{ t('wanManagement.status') }}</th>
                <th :data-testid="qa('wan-mode-management-header-action')">{{ t('wanManagement.action') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(mode, modeIndex) in tempManagementData" :key="mode.WANMode" :data-testid="qa(`wan-mode-management-row-${modeIndex}`)">
                <td :data-testid="qa(`wan-mode-management-name-${modeIndex}`)">{{ mode.WANMode }}</td>
                <td :data-testid="qa(`wan-mode-management-enable-sensing-${modeIndex}`)">{{ mode.EnableSensing ? 'True' : 'False' }}</td>
                <td :data-testid="qa(`wan-mode-management-ipv4-dns-mode-${modeIndex}`)">{{ mode.DNSMode }}</td>
                <td :data-testid="qa(`wan-mode-management-ipv6-dns-mode-${modeIndex}`)">{{ mode.IPv6DNSMode }}</td>
                <td :data-testid="qa(`wan-mode-management-physical-type-${modeIndex}`)">{{ mode.PhysicalType }}</td>
                <td :data-testid="qa(`wan-mode-management-status-${modeIndex}`)">{{ mode.Status }}</td>
                <td>
                  <div class="action-buttons" :data-testid="qa(`wan-mode-management-actions-${modeIndex}`)">
                    <button class="btn-action" :data-testid="qa(`wan-mode-management-edit-${modeIndex}`)" @click="handleEdit(mode)" title="Edit">
                      <span class="material-icons">edit</span>
                    </button>
                    <button class="btn-action" :data-testid="qa(`wan-mode-management-delete-${modeIndex}`)" @click="handleDelete(mode)" title="Delete">
                      <span class="material-icons">delete</span>
                    </button>
                    <button class="btn-action" :data-testid="qa(`wan-mode-management-detail-${modeIndex}`)" @click="handleDetail(mode)" title="Detail">
                      <span class="material-icons">info</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mobile-cards" :data-testid="qa('wan-mode-management-mobile')">
          <div class="table-card" v-for="(mode, modeIndex) in tempManagementData" :key="mode.WANMode" :data-testid="qa(`wan-mode-management-card-${modeIndex}`)">
            <div class="card-row">
              <span class="card-label" :data-testid="qa(`wan-mode-management-card-name-label-${modeIndex}`)">{{ t('wanManagement.name') }}</span>
              <span class="card-value" :data-testid="qa(`wan-mode-management-card-name-value-${modeIndex}`)">{{ mode.WANMode }}</span>
            </div>
            <div class="card-row">
              <span class="card-label" :data-testid="qa(`wan-mode-management-card-enable-sensing-label-${modeIndex}`)">{{ t('wanManagement.enableSensing') }}</span>
              <span class="card-value" :data-testid="qa(`wan-mode-management-card-enable-sensing-value-${modeIndex}`)">{{ mode.EnableSensing ? 'True' : 'False' }}</span>
            </div>
            <div class="card-row">
              <span class="card-label" :data-testid="qa(`wan-mode-management-card-ipv4-dns-mode-label-${modeIndex}`)">{{ t('wanManagement.ipv4DnsMode') }}</span>
              <span class="card-value" :data-testid="qa(`wan-mode-management-card-ipv4-dns-mode-value-${modeIndex}`)">{{ mode.DNSMode }}</span>
            </div>
            <div class="card-row">
              <span class="card-label" :data-testid="qa(`wan-mode-management-card-ipv6-dns-mode-label-${modeIndex}`)">{{ t('wanManagement.ipv6DnsMode') }}</span>
              <span class="card-value" :data-testid="qa(`wan-mode-management-card-ipv6-dns-mode-value-${modeIndex}`)">{{ mode.IPv6DNSMode }}</span>
            </div>
            <div class="card-row">
              <span class="card-label" :data-testid="qa(`wan-mode-management-card-physical-type-label-${modeIndex}`)">{{ t('wanManagement.physicalType') }}</span>
              <span class="card-value" :data-testid="qa(`wan-mode-management-card-physical-type-value-${modeIndex}`)">{{ mode.PhysicalType }}</span>
            </div>
            <div class="card-row">
              <span class="card-label" :data-testid="qa(`wan-mode-management-card-status-label-${modeIndex}`)">{{ t('wanManagement.status') }}</span>
              <span class="card-value" :data-testid="qa(`wan-mode-management-card-status-value-${modeIndex}`)">{{ mode.Status }}</span>
            </div>
            <div class="card-actions" :data-testid="qa(`wan-mode-management-card-actions-${modeIndex}`)">
              <button class="btn-action" :data-testid="qa(`wan-mode-management-card-edit-${modeIndex}`)" @click="handleEdit(mode)" title="Edit">
                <span class="material-icons">edit</span>
              </button>
              <button class="btn-action" :data-testid="qa(`wan-mode-management-card-delete-${modeIndex}`)" @click="handleDelete(mode)" title="Delete">
                <span class="material-icons">delete</span>
              </button>
              <button class="btn-action" :data-testid="qa(`wan-mode-management-card-detail-${modeIndex}`)" @click="handleDetail(mode)" title="Detail">
                <span class="material-icons">info</span>
              </button>
            </div>
          </div>
        </div>

        <div class="button-group">
          <button class="btn btn-secondary" :data-testid="qa('wan-mode-management-cancel-button')" @click="handleCancel">
            {{ t('common.cancel') }}
          </button>
          <button class="btn btn-primary" :data-testid="qa('wan-mode-management-apply-button')" @click="handleApply">
            {{ t('common.apply') }}
          </button>
        </div>
      </div>

      <WanModeEdit
        v-else-if="isEditing"
        :data-testid="qa('wan-mode-management-edit')"
        :mode="editingMode"
        @save="handleSave"
        @cancel="isEditing = false"
      />

      <WanModeDetail
        v-else-if="viewingMode"
        :data-testid="qa('wan-mode-management-detail')"
        :mode="viewingMode"
        @back="viewingMode = null"
      />
    </template>

    <div v-if="showSuccess" class="success-message" :data-testid="qa('wan-mode-management-success-message')">
      {{ t('common.apply') }} successful
    </div>
  </div>
</template>

<style scoped>
.section-title-sp {
  color: var(--text-primary);
  padding: 0.5rem 0;
}

.table-container{
  padding:1.5rem;
}

.btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn .material-icons {
  font-size: 1.25rem;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.btn-action {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 4px;
}

.btn-action:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.btn-action .material-icons {
  font-size: 1.25rem;
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

.button-group {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid var(--border-color);
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

@keyframes fadeInOut {
  0% { opacity: 0; transform: translateY(-20px); }
  10% { opacity: 1; transform: translateY(0); }
  90% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-20px); }
}

@media (max-width: 768px) {
  .header-row {
    flex-direction: column;
    gap: 1rem;
  }

  .btn {
    width: 100%;
    justify-content: center;
  }

  .mobile-cards {
    display: block;
    padding: 1.5rem;
  }
  
  .card-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .button-group {
    flex-direction: column;
    padding: 1rem;
  }

  .button-group .btn {
    width: 100%;
  }
}
</style>