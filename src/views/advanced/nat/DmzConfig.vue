<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import type { DmzResponse } from '../../../types/dmz';
import { getDmz, updateDmz } from '../../../services/api/dmz';
import { useQA } from '../../../utils/qa';
const { isQAMode, qa, slug } = useQA();

const { t } = useI18n();
const dmzData = ref<DmzResponse | null>(null);
const loading = ref(false);
const showSuccess = ref(false);
const error = ref<string | null>(null);

const fetchDmz = async () => {
  loading.value = true;
  error.value = null;
  try {
    dmzData.value = await getDmz();
  } catch (err) {
    console.error('Error fetching DMZ settings:', err);
    error.value = 'Failed to fetch DMZ settings';
  } finally {
    loading.value = false;
  }
};

// Validation function for IP address
const isValidIPv4 = (ip: string): boolean => {
  if (ip === "0.0.0.0") return true;
  
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Regex.test(ip)) return false;
  
  const parts = ip.split('.');
  return parts.every(part => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255;
  });
};

const showSuccessMessage = () => {
  showSuccess.value = true;
  setTimeout(() => {
    showSuccess.value = false;
  }, 3000);
};

const handleSubmit = async () => {
  if (!dmzData.value) return;
  
  error.value = null;
  
  // Validate IP address if DMZ is enabled
  if (dmzData.value.AdvancedDmz.Enable && !isValidIPv4(dmzData.value.AdvancedDmz.IPAddress)) {
    error.value = 'Invalid IP address format';
    return;
  }

  loading.value = true;
  try {
    await updateDmz({
      AdvancedDmz: {
        Enable: dmzData.value.AdvancedDmz.Enable,
        IPAddress: dmzData.value.AdvancedDmz.Enable ? dmzData.value.AdvancedDmz.IPAddress : "0.0.0.0"
      }
    });
    showSuccessMessage();
    await fetchDmz();
  } catch (err) {
    console.error('Error updating DMZ settings:', err);
    error.value = 'Failed to update DMZ settings';
  } finally {
    loading.value = false;
  }
};

onMounted(fetchDmz);
</script>

<template>
  <div class="page-container">
    <h1 class="page-title" :data-testid="qa('dmz-title')">{{ t('dmz.title') }}</h1>

    <div class="status-content" :data-testid="qa('dmz-content')">
      <div v-if="loading && !dmzData" class="loading-state" :data-testid="qa('dmz-loading')">
        <div class="loading-spinner"></div>
        <span>{{ t('common.loading') }}</span>
      </div>

      <div v-else-if="error" class="error-state" :data-testid="qa('dmz-error')">
        {{ error }}
      </div>

      <div v-else-if="dmzData" class="panel-section" :data-testid="qa('dmz-panel')">
        <div class="card-content">
          <div class="form-group">
            <div class="switch-label">
              <span :data-testid="qa('dmz-enable-label')">{{ t('dmz.enable') }}</span>
              <label class="switch">
                <input
                  type="checkbox"
                  :data-testid="qa('dmz-enable-toggle')"
                  v-model="dmzData.AdvancedDmz.Enable"
                >
                <span class="slider"></span>
              </label>
            </div>
          </div>

          <div class="form-group" v-if="dmzData.AdvancedDmz.Enable">
            <label :data-testid="qa('dmz-ip-address-label')">{{ t('dmz.ipAddress') }}</label>
            <input
              type="text"
              :data-testid="qa('dmz-ip-address-input')"
              v-model="dmzData.AdvancedDmz.IPAddress"
              placeholder="192.168.101.168"
              required
            />
          </div>

          <div class="button-group">
            <button type="button" class="btn btn-secondary" :data-testid="qa('dmz-cancel-button')" @click="fetchDmz">
              {{ t('common.cancel') }}
            </button>
            <button type="button" class="btn btn-primary" :data-testid="qa('dmz-apply-button')" @click="handleSubmit">
              {{ t('common.apply') }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="showSuccess" class="success-message" :data-testid="qa('dmz-success-message')">
        {{ t('common.apply') }} successful
      </div>
    </div>
  </div>
</template>

<style scoped>
.form-group {
  margin-bottom: 1.5rem;
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
  .button-group {
    flex-direction: column;
  }

  .button-group .btn {
    width: 100%;
  }
}
</style>