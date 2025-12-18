<template>
  <div class="page-container">
    <h1 class="page-title">{{ $t('backupWan.title') }}</h1>

    <div class="page-content">
      <div v-if="showSuccess" class="success-message">
        {{ $t('common.saveSuccess') }}
      </div>
      <div v-if="loading" class="loading-container">
        <BaseSpinner />
      </div>

      <form v-else @submit.prevent="handleSubmit" class="backup-wan-form">
        <div class="panel-section">
          <div class="card-content">
            <div class="form-group">
              <div class="switch-label">
                <span>{{ $t('backupWan.backupWan') }}</span>
                <label class="switch">
                  <input
                    type="checkbox"
                    v-model="formData.Enable"
                    @change="handleBackupWanToggle"
                  />
                  <span class="slider"></span>
                </label>
              </div>
            </div>

            <div class="form-group">
              <label>{{ $t('backupWan.physicalType') }}</label>
              <BaseSelect
                v-model="formData.PhysicalType"
                :options="physicalTypeOptions"
                :disabled="!formData.Enable"
              />
            </div>

            <div class="form-group">
              <label>{{ $t('backupWan.interface') }}</label>
              <BaseSelect
                v-model="formData.PhysicalInterface"
                :options="interfaceOptions"
                :disabled="!formData.Enable"
              />
            </div>

            <div v-if="formData.Enable" class="form-group">
              <div class="switch-label">
                <span>{{ $t('backupWan.wanHealthCheck') }}</span>
                <label class="switch">
                  <input
                    type="checkbox"
                    v-model="formData.WHCEnable"
                  />
                  <span class="slider"></span>
                </label>
              </div>
            </div>

            <div v-if="formData.WHCEnable" class="health-check-configs">
              <div
                v-for="(healthCheck, index) in formData.WANHealthCheck"
                :key="index"
                class="panel-section"
              >
                <div class="section-title">
                  {{ index === 0 ? $t('backupWan.primaryWan') : $t('backupWan.backupWanLabel') }}
                </div>
                <div class="card-content">
                  <div class="form-group">
                    <label>{{ $t('backupWan.checkCount') }}</label>
                    <BaseInput
                      v-model.number="healthCheck.CheckCount"
                      type="number"
                      :min="3"
                      :max="9999"
                    />
                    <span class="help-text">
                      {{ $t('backupWan.checkCountHint') }}
                    </span>
                  </div>

                  <div class="form-group">
                    <label>{{ $t('backupWan.checkPeriod') }}</label>
                    <BaseInput
                      v-model.number="healthCheck.CheckPeriod"
                      type="number"
                      :min="3"
                      :max="9999999"
                    />
                    <span class="help-text">
                      {{ $t('backupWan.checkPeriodHint') }}
                    </span>
                  </div>

                  <div class="form-group">
                    <div class="radio-group">
                      <label class="radio-label">
                        <input
                          type="radio"
                          :name="`checkMethod${index}`"
                          value="Ping"
                          v-model="healthCheck.CheckMethod"
                        />
                        <span>{{ $t('backupWan.pingDetection') }}</span>
                      </label>
                      <div class="nested-field">
                        <label>{{ $t('backupWan.ipAddress') }}</label>
                        <BaseInput
                          v-model="healthCheck.PingAddress"
                          placeholder="8.8.8.8"
                        />
                      </div>
                    </div>

                    <div class="radio-group">
                      <label class="radio-label">
                        <input
                          type="radio"
                          :name="`checkMethod${index}`"
                          value="DNS"
                          v-model="healthCheck.CheckMethod"
                        />
                        <span>{{ $t('backupWan.dnsDetection') }}</span>
                      </label>
                      <div class="nested-field">
                        <label>{{ $t('backupWan.dnsServer') }}</label>
                        <BaseInput
                          v-model="healthCheck.DNSAddress"
                          placeholder="www.google.com"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="form-actions">
              <BaseButton type="button" variant="secondary" @click="handleCancel">
                {{ $t('common.cancel') }}
              </BaseButton>
              <BaseButton type="submit" variant="primary" :disabled="loading">
                {{ $t('common.apply') }}
              </BaseButton>
            </div>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { backupWanApi } from '../../../services/api/backupWan';
import type { BackupWANConfig, BackupWANRequest } from '../../../types/backupWan';
import { BaseCard, BaseButton, BaseInput, BaseSelect, BaseSpinner } from '../../../components/common';

const router = useRouter();
const loading = ref(false);
const originalData = ref<BackupWANConfig | null>(null);
const showSuccess = ref(false);

const showSuccessMessage = () => {
  showSuccess.value = true;
  setTimeout(() => {
    showSuccess.value = false;
  }, 3000);
};

const formData = ref<BackupWANConfig>({
  PhysicalInterface: 'lan1',
  SupportedPhysicalInterface: ['lan1', 'wwan0'],
  Enable: false,
  WHCEnable: false,
  PhysicalType: 'Ethernet',
  WANHealthCheck: [
    {
      Alias: 'primary_wan',
      CheckMethod: 'Ping',
      CheckPeriod: 3,
      Name: 'eth0',
      DNSAddress: 'www.google.com',
      PingAddress: '8.8.8.8',
      CheckCount: 3
    },
    {
      Alias: 'backup_wan',
      CheckMethod: 'Ping',
      CheckPeriod: 3,
      Name: 'lan1',
      DNSAddress: 'www.google.com',
      PingAddress: '8.8.8.8',
      CheckCount: 3
    }
  ]
});

const physicalTypeOptions = computed(() => [
  { label: 'Ethernet / Cellular', value: 'Ethernet' },
  { label: 'Cellular', value: 'Cellular' }
]);

const interfaceOptions = computed(() =>
  formData.value.SupportedPhysicalInterface.map(iface => ({
    label: iface,
    value: iface
  }))
);

const handleBackupWanToggle = () => {
  if (!formData.value.Enable) {
    formData.value.WHCEnable = false;
  }
};

const loadConfig = async () => {
  loading.value = true;
  try {
    const response = await backupWanApi.getConfig();
    if (response?.BackupWAN) {
      const config = response.BackupWAN;
      formData.value = {
        ...config,
        Enable: Boolean(config.Enable),
        WHCEnable: Boolean(config.WHCEnable)
      };
      originalData.value = JSON.parse(JSON.stringify(formData.value));
    }
  } catch (error) {
    console.error('Failed to load Backup WAN config:', error);
  } finally {
    loading.value = false;
  }
};

const handleSubmit = async () => {
  loading.value = true;
  try {
    const requestData: BackupWANRequest = {
      BackupWAN: {
        Enable: Boolean(formData.value.Enable),
        PhysicalType: formData.value.PhysicalType,
        PhysicalInterface: formData.value.PhysicalInterface,
        WHCEnable: Boolean(formData.value.WHCEnable),
        WANHealthCheck: formData.value.WANHealthCheck.map(hc => ({
          Alias: hc.Alias,
          CheckMethod: hc.CheckMethod,
          CheckCount: hc.CheckCount,
          CheckPeriod: hc.CheckPeriod,
          PingAddress: hc.PingAddress,
          DNSAddress: hc.DNSAddress
        }))
      }
    };

    const res = await backupWanApi.updateConfig(requestData);

    const err = res?.BackupWAN?.NOK ?? res?.NOK;
    if (err) {
      console.warn('Failed to update Backup WAN config:', err);
      alert(err);
    } else {
      showSuccessMessage();
      await loadConfig();
    }
  } catch (error) {
    console.error('Failed to update Backup WAN config:', error);
   // alert('Failed to update Backup WAN configuration');
  } finally {
    loading.value = false;
  }
};

const handleCancel = () => {
  if (originalData.value) {
    formData.value = JSON.parse(JSON.stringify(originalData.value));
  }
  router.back();
};

onMounted(() => {
  loadConfig();
});
</script>

<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.page-content {
  padding: 1.5rem;
}

.backup-wan-form {
  display: flex;
  flex-direction: column;
}

.panel-section {
  background-color: white;
  border-radius: 4px;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.2);
}

.section-title {
  padding: 1rem 1.5rem;
  font-size: var(--font-size-h6);
  line-height: var(--line-height-body);
  color: var(--text-primary);
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.card-content {
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

.switch-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--text-primary);
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

.help-text {
  font-size: var(--font-size-body-sm);
  line-height: var(--line-height-caption);
  color: var(--text-secondary);
  margin-top: 0.5rem;
}

.help-text.warning {
  color: #ff6b00;
}

.health-check-configs {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.radio-group:last-child {
  margin-bottom: 0;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: 500;
  color: var(--text-primary);
}

.radio-label input[type="radio"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.nested-field {
  margin-left: 1.75rem;
  margin-top: 0.5rem;
}

.nested-field label {
  margin-bottom: 0.5rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
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
  z-index: 1100;
}

@keyframes fadeInOut {
  0% { opacity: 0; transform: translateY(-20px); }
  10% { opacity: 1; transform: translateY(0); }
  90% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-20px); }
}

@media (max-width: 768px) {
  .page-content {
    padding: 1rem;
  }

  .form-actions {
    flex-direction: column;
  }

  .form-actions button {
    width: 100%;
  }

  .nested-field {
    margin-left: 1rem;
  }
}
</style>
