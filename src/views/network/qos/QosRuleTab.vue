<template>
  <div class="qos-rule-tab">
    <BaseCard>
      <div class="rule-header">
        <!-- Typography: card/section header aligned to token heading scale -->
        <h3 class="heading-4">{{ t('qos.qosRuleLists') }}</h3>
        <BaseButton @click="openAddModal" variant="primary">
          {{ t('qos.addRule') }}
        </BaseButton>
      </div>

      <div class="rule-table-container">
        <table class="draggable-table">
          <thead>
            <tr>
              <th></th>
              <th>{{ t('qos.no') }}</th>
              <th>{{ t('qos.type') }}</th>
              <th>{{ t('qos.name') }}</th>
              <th>{{ t('qos.description') }}</th>
              <th>{{ t('qos.priority') }}</th>
              <th>{{ t('qos.action') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, index) in formData.RuleList"
              :key="`rule-${index}`"
              draggable="true"
              @dragstart="handleDragStart($event, index)"
              @dragover="handleDragOver($event, index)"
              @dragenter="handleDragEnter($event, index)"
              @dragleave="handleDragLeave($event)"
              @drop="handleDrop($event, index)"
              @dragend="handleDragEnd"
              :class="{ 'drag-over': dragOverIndex === index }"
            >
              <td class="drag-handle">
                <span class="material-icons">drag_indicator</span>
              </td>
              <td>{{ index + 1 }}</td>
              <td>{{ row.Type }}</td>
              <td>{{ row.Type === 'Application' ? row.ApplicationName : row.DeviceName }}</td>
              <td>{{ formatDescription(row) }}</td>
              <td>{{ row.Priority }}</td>
              <td>
                <div class="action-buttons">
                  <button @click="handleEdit(row, index)" class="icon-btn" :title="t('common.edit')">
                    <span class="material-icons">edit</span>
                  </button>
                  <button @click="handleDelete(index)" class="icon-btn" :title="t('common.delete')">
                    <span class="material-icons">delete</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="button-group">
        <BaseButton @click="handleCancel" variant="secondary">
          {{ t('common.cancel') }}
        </BaseButton>
        <BaseButton @click="handleApply" variant="primary">
          {{ t('common.apply') }}
        </BaseButton>
      </div>
    </BaseCard>

    <BaseModal
      v-model="showAddModal"
      :title="editingIndex !== null ? t('qos.editRule') : t('qos.addQosRule')"
      @close="closeModal"
    >
      <div class="modal-form">
        <div class="form-group">
          <label class="form-label label">{{ t('qos.type') }}</label>
          <BaseSelect
            v-model="currentRule.Type"
            :options="typeOptions"
            @change="handleTypeChange"
          />
        </div>

        <template v-if="currentRule.Type === 'Device'">
          <div class="form-group">
            <label class="form-label label">{{ t('qos.device') }}</label>
            <BaseSelect
              v-model="selectedDevice"
              :options="deviceOptions"
              @change="handleDeviceChange"
            />
          </div>

          <div class="form-group">
            <label class="form-label label">{{ t('qos.macAddress') }}</label>
            <BaseInput
              v-model="currentRule.MACAddress"
              :disabled="true"
            />
          </div>
        </template>

        <template v-if="currentRule.Type === 'Application'">
          <div class="form-group">
            <label class="form-label label">{{ t('qos.applicationType') }}</label>
            <BaseSelect
              v-model="selectedApplicationType"
              :options="applicationTypeOptions"
              @change="handleApplicationTypeChange"
            />
          </div>

          <div class="form-group">
            <label class="form-label label">{{ t('qos.applicationName') }}</label>
            <BaseInput
              v-model="currentRule.ApplicationName"
              :disabled="selectedApplicationType !== 'Self-defined'"
            />
          </div>

          <div class="form-group">
            <label class="form-label label">{{ t('qos.port') }}</label>
            <BaseInput
              v-model="currentRule.Port"
              :disabled="selectedApplicationType !== 'Self-defined'"
              :placeholder="t('qos.portPlaceholder')"
            />
            <div class="field-hint caption">
              {{ t('qos.portHint') }}
            </div>
          </div>

          <div class="form-group">
            <label class="form-label label">{{ t('qos.protocol') }}</label>
            <BaseSelect
              v-model="currentRule.Protocol"
              :options="protocolOptions"
              :disabled="selectedApplicationType !== 'Self-defined'"
            />
          </div>
        </template>

        <div class="form-group">
          <label class="form-label label">{{ t('qos.priority') }}</label>
          <BaseSelect
            v-model="currentRule.Priority"
            :options="priorityOptions"
          />
        </div>

        <div class="modal-actions">
          <BaseButton @click="handleAddOrUpdate" variant="primary">
            {{ editingIndex !== null ? t('common.update') : t('common.add') }}
          </BaseButton>
          <BaseButton @click="closeModal" variant="secondary">
            {{ t('common.cancel') }}
          </BaseButton>
        </div>
      </div>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseCard from '../../../components/common/BaseCard.vue';
import BaseButton from '../../../components/common/BaseButton.vue';
import BaseTable from '../../../components/common/BaseTable.vue';
import BaseModal from '../../../components/common/BaseModal.vue';
import BaseInput from '../../../components/common/BaseInput.vue';
import BaseSelect from '../../../components/common/BaseSelect.vue';
import { qosApi } from '../../../services/api/qos';
import type { QosRule, QosRuleData, QosApplicationType, QosDevice } from '../../../types/qos';

const { t } = useI18n();

const formData = ref<QosRuleData>({
  ApplicationTypeList: [],
  DeviceList: [],
  ProtocolList: [],
  PriorityList: [],
  RuleList: []
});

const originalData = ref<QosRuleData | null>(null);
const showAddModal = ref(false);
const editingIndex = ref<number | null>(null);
const selectedApplicationType = ref('');
const selectedDevice = ref('');
const loading = ref(false);

const draggedIndex = ref<number | null>(null);
const dragOverIndex = ref<number | null>(null);

const currentRule = ref<QosRule>({
  Order: 0,
  Type: 'Application',
  ApplicationName: '',
  DeviceName: '',
  MACAddress: '',
  Port: '',
  Protocol: '',
  Priority: ''
});

const columns = [
  { key: 'no', label: t('qos.no'), slot: 'no' },
  { key: 'type', label: t('qos.type'), slot: 'type' },
  { key: 'name', label: t('qos.name'), slot: 'name' },
  { key: 'description', label: t('qos.description'), slot: 'description' },
  { key: 'priority', label: t('qos.priority'), slot: 'priority' },
  { key: 'action', label: t('qos.action'), slot: 'action', width: '120px' }
];

const typeOptions = computed(() => [
  { value: 'Application', label: t('qos.application') },
  { value: 'Device', label: t('qos.device') }
]);

const applicationTypeOptions = computed(() => {
  return formData.value.ApplicationTypeList.map((app: QosApplicationType) => ({
    value: app.ApplicationType,
    label: app.ApplicationType
  }));
});

const deviceOptions = computed(() => {
  return formData.value.DeviceList.map((device: QosDevice) => ({
    value: device.DeviceName,
    label: device.DeviceName
  }));
});

const protocolOptions = computed(() => {
  return formData.value.ProtocolList.map((protocol: string) => ({
    value: protocol,
    label: protocol
  }));
});

const priorityOptions = computed(() => {
  return formData.value.PriorityList.map((priority: string) => ({
    value: priority,
    label: priority
  }));
});

const formatDescription = (rule: QosRule): string => {
  if (rule.Type === 'Device') {
    return rule.MACAddress;
  } else {
    const parts = [];
    if (rule.Port) parts.push(rule.Port);
    if (rule.Protocol) parts.push(rule.Protocol.toLowerCase());
    return parts.join('/');
  }
};

const handleTypeChange = () => {
  currentRule.value = {
    Order: currentRule.value.Order,
    Type: currentRule.value.Type,
    ApplicationName: '',
    DeviceName: '',
    MACAddress: '',
    Port: '',
    Protocol: '',
    Priority: currentRule.value.Priority
  };
  selectedApplicationType.value = '';
  selectedDevice.value = '';
};

const handleApplicationTypeChange = () => {
  const appType = formData.value.ApplicationTypeList.find(
    (app: QosApplicationType) => app.ApplicationType === selectedApplicationType.value
  );

  if (appType && selectedApplicationType.value !== 'Self-defined') {
    currentRule.value.ApplicationName = appType.ApplicationType;
    currentRule.value.Port = appType.Port;
    currentRule.value.Protocol = appType.Protocol;
  } else if (selectedApplicationType.value === 'Self-defined') {
    currentRule.value.ApplicationName = '';
    currentRule.value.Port = '';
    currentRule.value.Protocol = '';
  }
};

const openAddModal = () => {
  // 這次是新增，不是編輯
  editingIndex.value = null;

  // 從後端帶回來的清單裡挑預設值
  const defaultProtocol =
    formData.value.ProtocolList.includes('TCP,UDP')
      ? 'TCP,UDP'
      : formData.value.ProtocolList[0] || '';

  const defaultPriority =
    formData.value.PriorityList.includes('Medium')
      ? 'Medium'
      : formData.value.PriorityList[0] || '';

  // 初始化這次要新增的 rule
  currentRule.value = {
    Order: 0,
    Type: 'Application',      // 走 Application 分支
    ApplicationName: '',
    DeviceName: '',
    MACAddress: '',
    Port: '',                 // 留空，顯示 placeholder
    Protocol: defaultProtocol,
    Priority: defaultPriority
  };

  // dropdown 的預設值
  selectedApplicationType.value = 'Self-defined'; // Application Type
  selectedDevice.value = '';

  // 打開彈窗
  showAddModal.value = true;
};

const handleDeviceChange = () => {
  const device = formData.value.DeviceList.find(
    (d: QosDevice) => d.DeviceName === selectedDevice.value
  );

  if (device) {
    currentRule.value.DeviceName = device.DeviceName;
    currentRule.value.MACAddress = device.MACAddress;
  }
};

const handleEdit = (rule: QosRule, index: number) => {
  editingIndex.value = index;
  currentRule.value = { ...rule };

  if (rule.Type === 'Application') {
    selectedApplicationType.value = rule.ApplicationName;
  } else {
    selectedDevice.value = rule.DeviceName;
  }

  showAddModal.value = true;
};

const handleDelete = (index: number) => {
  if (confirm(t('qos.confirmDelete'))) {
    formData.value.RuleList.splice(index, 1);
    formData.value.RuleList.forEach((rule, idx) => {
      rule.Order = idx + 1;
    });
  }
};

const handleAddOrUpdate = () => {
  if (!validateRule()) {
    return;
  }

  if (editingIndex.value !== null) {
    formData.value.RuleList[editingIndex.value] = { ...currentRule.value };
  } else {
    currentRule.value.Order = formData.value.RuleList.length + 1;
    formData.value.RuleList.push({ ...currentRule.value });
  }

  closeModal();
};

const validateRule = (): boolean => {
  if (!currentRule.value.Priority) {
    alert(t('qos.priorityRequired'));
    return false;
  }

  if (currentRule.value.Type === 'Application') {
    if (!currentRule.value.ApplicationName) {
      alert(t('qos.applicationNameRequired'));
      return false;
    }
    if (selectedApplicationType.value === 'Self-defined') {
      if (!currentRule.value.Port) {
        alert(t('qos.portRequired'));
        return false;
      }
      if (!currentRule.value.Protocol) {
        alert(t('qos.protocolRequired'));
        return false;
      }
    }
  } else {
    if (!currentRule.value.DeviceName) {
      alert(t('qos.deviceRequired'));
      return false;
    }
  }

  return true;
};

const closeModal = () => {
  showAddModal.value = false;
  editingIndex.value = null;
  selectedApplicationType.value = '';
  selectedDevice.value = '';
  currentRule.value = {
    Order: 0,
    Type: 'Application',
    ApplicationName: '',
    DeviceName: '',
    MACAddress: '',
    Port: '',
    Protocol: '',
    Priority: ''
  };
};

const handleApply = async () => {
  try {
    loading.value = true;
    await qosApi.updateRule({
      QosRule: {
        RuleList: formData.value.RuleList
      }
    });
    originalData.value = JSON.parse(JSON.stringify(formData.value));
    alert(t('common.saveSuccess'));
  } catch (error) {
    console.error('Failed to save QoS rules:', error);
    alert(t('common.saveFailed'));
  } finally {
    loading.value = false;
  }
};

const handleCancel = () => {
  if (originalData.value) {
    formData.value = JSON.parse(JSON.stringify(originalData.value));
  }
};

const loadData = async () => {
  try {
    loading.value = true;
    const response = await qosApi.getRule();
    formData.value = response.QosRule;
    originalData.value = JSON.parse(JSON.stringify(response.QosRule));
  } catch (error) {
    console.error('Failed to load QoS rules:', error);
  } finally {
    loading.value = false;
  }
};

const handleDragStart = (event: DragEvent, index: number) => {
  draggedIndex.value = index;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', String(index));
  }
  const target = event.target as HTMLElement;
  target.style.opacity = '0.4';
};

const handleDragOver = (event: DragEvent, index: number) => {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
};

const handleDragEnter = (event: DragEvent, index: number) => {
  event.preventDefault();
  if (draggedIndex.value !== null && draggedIndex.value !== index) {
    dragOverIndex.value = index;
  }
};

const handleDragLeave = (event: DragEvent) => {
  const relatedTarget = event.relatedTarget as HTMLElement;
  const currentTarget = event.currentTarget as HTMLElement;

  if (!currentTarget.contains(relatedTarget)) {
    dragOverIndex.value = null;
  }
};

const handleDrop = (event: DragEvent, dropIndex: number) => {
  event.preventDefault();
  event.stopPropagation();

  if (draggedIndex.value !== null && draggedIndex.value !== dropIndex) {
    const items = [...formData.value.RuleList];
    const draggedItem = items[draggedIndex.value];

    items.splice(draggedIndex.value, 1);
    items.splice(dropIndex, 0, draggedItem);

    items.forEach((item, idx) => {
      item.Order = idx + 1;
    });

    formData.value.RuleList = items;
  }

  dragOverIndex.value = null;
};

const handleDragEnd = (event: DragEvent) => {
  const target = event.target as HTMLElement;
  target.style.opacity = '1';
  draggedIndex.value = null;
  dragOverIndex.value = null;
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.qos-rule-tab {
  padding: 20px;
}

.rule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.rule-header h3 {
  margin: 0;
  color: var(--text-primary, #1f2937);
}

.rule-table-container {
  width: 100%;
  overflow-x: auto;
  margin-bottom: 20px;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.icon-btn {
  padding: 4px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary, #6b7280);
  transition: color 0.2s;
}

.icon-btn:hover {
  color: var(--primary-color, #2563eb);
}

.icon-btn .material-icons {
  font-size: 20px;
}

.button-group {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  color: var(--text-primary, #1f2937);
}

/* Typography handled by .caption token utility */
.field-hint {
  margin-top: 4px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 8px;
}

.draggable-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

.draggable-table th,
.draggable-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
}

.draggable-table th {
  background: var(--bg-secondary, #f9fafb);
  font-weight: 600;
  color: var(--text-primary, #1f2937);
  font-size: 14px;
}

.draggable-table tbody tr {
  cursor: move;
  transition: background-color 0.2s;
}

.draggable-table tbody tr:hover {
  background-color: var(--bg-hover, #f3f4f6);
}

.draggable-table tbody tr.drag-over {
  background-color: var(--primary-light, #dbeafe);
  border-top: 2px solid var(--primary-color, #2563eb);
}

.drag-handle {
  width: 40px;
  cursor: grab;
  color: var(--text-secondary, #6b7280);
}

.drag-handle:active {
  cursor: grabbing;
}

.drag-handle .material-icons {
  font-size: 20px;
  vertical-align: middle;
}

@media (max-width: 768px) {
  .rule-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .draggable-table {
    font-size: 14px;
  }

  .draggable-table th,
  .draggable-table td {
    padding: 8px;
  }
}
</style>
