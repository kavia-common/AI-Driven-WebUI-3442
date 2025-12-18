<template>
  <div class="port-forwarding-management">
    <div class="header-row">
      <div class="section-title-sp section-title-text">{{ $t('portForwarding.title') }}</div>
      <button v-if="!isEditing" class="btn btn-primary" @click="handleAdd">
        <span class="material-icons">add</span>
        {{ $t('common.add') }}
      </button>
    </div>

    <div v-if="errorMessage" class="error-banner">
      <span class="material-icons">error</span>
      <span>{{ errorMessage }}</span>
      <button class="close-btn" @click="errorMessage = ''">
        <span class="material-icons">close</span>
      </button>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <span>{{ $t('common.loading') }}</span>
    </div>

    <div v-else-if="!isEditing" class="rule-list">
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>{{ $t('portForwarding.number') }}</th>
              <th>{{ $t('portForwarding.enable') }}</th>
              <th>{{ $t('portForwarding.description') }}</th>
              <th>{{ $t('portForwarding.protocol') }}</th>
              <th>{{ $t('portForwarding.externalPortRange') }}</th>
              <th>{{ $t('portForwarding.internalPortRange') }}</th>
              <th>{{ $t('portForwarding.internalIPAddress') }}</th>
              <th>{{ $t('portForwarding.active') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(rule, index) in rules" :key="rule.No">
              <td>{{ rule.No }}</td>
              <td>
                <span class="status-badge" :class="rule.Enable ? 'enabled' : 'disabled'">
                  {{ rule.Enable ? '1' : '0' }}
                </span>
              </td>
              <td>{{ rule.Description || '-' }}</td>
              <td>{{ rule.Protocol.toLowerCase() }}</td>
              <td>{{ rule.ExternalPortRange }}</td>
              <td>{{ rule.InternalPort }}</td>
              <td>{{ rule.InternalIPAdress }}</td>
              <td>
                <div class="action-buttons">
                  <button class="btn-action" @click="handleEdit(rule)" :title="$t('common.edit')">
                    <span class="material-icons">edit</span>
                  </button>
                  <button class="btn-action" @click="handleDelete(rule)" :title="$t('common.delete')">
                    <span class="material-icons">delete</span>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="rules.length === 0">
              <td colspan="8" class="no-data">{{ $t('portForwarding.noRules') }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mobile-cards">
        <div v-if="rules.length === 0" class="no-data-mobile">
          {{ $t('portForwarding.noRules') }}
        </div>
        <div class="table-card" v-else v-for="rule in rules" :key="rule.No">
          <div class="card-row">
            <span class="card-label">{{ $t('portForwarding.number') }}</span>
            <span class="card-value">{{ rule.No }}</span>
          </div>
          <div class="card-row">
            <span class="card-label">{{ $t('portForwarding.enable') }}</span>
            <span class="card-value">
              <span class="status-badge" :class="rule.Enable ? 'enabled' : 'disabled'">
                {{ rule.Enable ? '1' : '0' }}
              </span>
            </span>
          </div>
          <div class="card-row">
            <span class="card-label">{{ $t('portForwarding.description') }}</span>
            <span class="card-value">{{ rule.Description || '-' }}</span>
          </div>
          <div class="card-row">
            <span class="card-label">{{ $t('portForwarding.protocol') }}</span>
            <span class="card-value">{{ rule.Protocol.toLowerCase() }}</span>
          </div>
          <div class="card-row">
            <span class="card-label">{{ $t('portForwarding.externalPortRange') }}</span>
            <span class="card-value">{{ rule.ExternalPortRange }}</span>
          </div>
          <div class="card-row">
            <span class="card-label">{{ $t('portForwarding.internalPortRange') }}</span>
            <span class="card-value">{{ rule.InternalPort }}</span>
          </div>
          <div class="card-row">
            <span class="card-label">{{ $t('portForwarding.internalIPAddress') }}</span>
            <span class="card-value">{{ rule.InternalIPAdress }}</span>
          </div>
          <div class="card-actions">
            <button class="btn-action" @click="handleEdit(rule)" :title="$t('common.edit')">
              <span class="material-icons">edit</span>
            </button>
            <button class="btn-action" @click="handleDelete(rule)" :title="$t('common.delete')">
              <span class="material-icons">delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <PortForwardingForm
      v-else
      v-if="editingRule"
      :rule="editingRule"
      :wan-list="wanList"
      :proto-list="protoList"
      @update:rule="handleRuleUpdate"
      @save="handleSave"
      @cancel="isEditing = false"
    />

    <ConfirmationDialog
      :is-open="showDeleteDialog"
      :title="$t('portForwarding.deleteRule')"
      :message="$t('portForwarding.deleteConfirmMessage')"
      @confirm="confirmDelete"
      @cancel="showDeleteDialog = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import PortForwardingForm from '../../../components/nat/PortForwardingForm.vue';
import ConfirmationDialog from '../../../components/ConfirmationDialog.vue';
import { portForwardingApi } from '../../../services/api/portForwarding';
import type { PortForwardRule } from '../../../types/portForwarding';

const { t } = useI18n();

const rules = ref<PortForwardRule[]>([]);
const wanList = ref<string[]>([]);
const protoList = ref<string[]>([]);
const isEditing = ref(false);
const editingRule = ref<PortForwardRule | null>(null);
const showDeleteDialog = ref(false);
const ruleToDelete = ref<PortForwardRule | null>(null);
const loading = ref(true);
const errorMessage = ref('');

const fetchRules = async () => {
  loading.value = true;
  try {
    const response = await portForwardingApi.getConfig();
    rules.value = response.PortForwarding.PortForwardList || [];
    wanList.value = response.PortForwarding.WanList || [];
    protoList.value = response.PortForwarding.ProtoList || [];
  } catch (error) {
    console.error('Failed to load port forwarding config:', error);
  } finally {
    loading.value = false;
  }
};

const handleAdd = () => {
  const maxNo = rules.value.length > 0
    ? Math.max(...rules.value.map(r => r.No))
    : 0;

  editingRule.value = {
    No: maxNo + 1,
    Enable: true,
    Description: '',
    Protocol: protoList.value[0] || 'Both',
    Interface: wanList.value[0] || '',
    ExternalPortRange: '',
    InternalPort: '',
    InternalIPAdress: ''
  };
  isEditing.value = true;
};

const handleEdit = (rule: PortForwardRule) => {
  editingRule.value = { ...rule };
  isEditing.value = true;
};

const handleDelete = (rule: PortForwardRule) => {
  ruleToDelete.value = rule;
  showDeleteDialog.value = true;
};

const handleRuleUpdate = (rule: PortForwardRule) => {
  editingRule.value = rule;
};

const handleSave = async () => {
  if (!editingRule.value) return;

  try {
    loading.value = true;
    errorMessage.value = '';

    const existingRule = rules.value.find(r => r.No === editingRule.value!.No);
    let updatedRules: PortForwardRule[];

    if (existingRule) {
      updatedRules = rules.value.map(r => r.No === editingRule.value!.No ? editingRule.value! : r);
    } else {
      updatedRules = [...rules.value, editingRule.value];
    }

    const response = await portForwardingApi.updateConfig({
      PortForwarding: {
        PortForwardList: updatedRules
      }
    });

    if (response.PortForwarding.NOK) {
      errorMessage.value = response.PortForwarding.NOK;
      return;
    }

    await fetchRules();
    isEditing.value = false;
    editingRule.value = null;
  } catch (error) {
    console.error('Failed to save port forwarding rule:', error);
    errorMessage.value = error instanceof Error ? error.message : 'Failed to save port forwarding rule';
  } finally {
    loading.value = false;
  }
};

const confirmDelete = async () => {
  if (!ruleToDelete.value) return;

  try {
    loading.value = true;
    errorMessage.value = '';
    const updatedRules = rules.value.filter(r => r.No !== ruleToDelete.value!.No);

    const response = await portForwardingApi.updateConfig({
      PortForwarding: {
        PortForwardList: updatedRules
      }
    });

    if (response.PortForwarding.NOK) {
      errorMessage.value = response.PortForwarding.NOK;
      showDeleteDialog.value = false;
      return;
    }

    await fetchRules();
    showDeleteDialog.value = false;
    ruleToDelete.value = null;
  } catch (error) {
    console.error('Failed to delete port forwarding rule:', error);
    errorMessage.value = error instanceof Error ? error.message : 'Failed to delete port forwarding rule';
  } finally {
    loading.value = false;
  }
};

onMounted(fetchRules);
</script>

<style scoped>
.port-forwarding-management {
  background-color: white;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-title-sp {
  font-size: 1rem;
  color: var(--text-primary);
  padding: 0.5rem 0;
}

.rule-list {
  padding: 1.5rem;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem;
  color: var(--text-secondary);
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn .material-icons {
  font-size: 1.25rem;
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

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-badge.enabled {
  color: #2e7d32;
}

.status-badge.disabled {
  color: #c62828;
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
  justify-content: center;
}

.no-data {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.no-data-mobile {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
  background-color: var(--bg-secondary);
  border-radius: 4px;
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  margin: 0 1.5rem 1rem;
  background-color: #ffebee;
  border-left: 4px solid #c62828;
  border-radius: 4px;
  color: #c62828;
}

.error-banner .material-icons:first-child {
  font-size: 1.5rem;
}

.error-banner span:not(.material-icons) {
  flex: 1;
  /* Typography handled by global tokens/utilities (e.g., .body-sm, .label). */
}

.error-banner .close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  background: none;
  border: none;
  color: #c62828;
  cursor: pointer;
  border-radius: 4px;
}

.error-banner .close-btn:hover {
  background-color: rgba(198, 40, 40, 0.1);
}

.error-banner .close-btn .material-icons {
  font-size: 1.25rem;
}

.mobile-cards {
  display: none;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .section-title-sp {
    padding: 0;
  }

  .rule-list {
    padding: 1rem;
  }

  .btn {
    width: 100%;
    justify-content: center;
  }

  .loading-state {
    padding: 1rem;
  }

  .error-banner {
    margin: 0 1rem 1rem;
    padding: 0.875rem 1rem;
  }

  .table-container {
    display: none;
  }

  .mobile-cards {
    display: block;
  }

  .card-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1rem;
  }
}
</style>
