<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useQA } from '../utils/qa';
const { isQAMode, qa, slug } = useQA();

const { t } = useI18n();

const props = defineProps<{
  isVisible: boolean;
  message?: string;
  duration?: number; // in seconds
}>();

const emit = defineEmits<{
  (e: 'complete'): void;
}>();

const countdown = ref(props.duration || 30);
const timer = ref<number | null>(null);

const startCountdown = () => {
  countdown.value = props.duration || 30;
  
  timer.value = window.setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      if (timer.value) {
        clearInterval(timer.value);
        timer.value = null;
      }
      emit('complete');
    }
  }, 1000);
};

const stopCountdown = () => {
  if (timer.value) {
    clearInterval(timer.value);
    timer.value = null;
  }
};

// Watch for visibility changes
watch(() => props.isVisible, (newValue) => {
  if (newValue) {
    startCountdown();
  } else {
    stopCountdown();
  }
});

onMounted(() => {
  if (props.isVisible) {
    startCountdown();
  }
});

onUnmounted(() => {
  stopCountdown();
});
</script>

<template>
  <div v-if="isVisible" class="blocking-overlay" :data-testid="qa('blocking-overlay')">
    <div class="blocking-content" :data-testid="qa('blocking-overlay-content')">
      <div class="spinner" :data-testid="qa('blocking-overlay-spinner')"></div>
      <!-- Typography: overlay uses token heading/body/caption for consistency -->
      <h2 class="heading-3" :data-testid="qa('blocking-overlay-title')">{{ message || 'Applying WiFi Settings...' }}</h2>
      <p class="body" :data-testid="qa('blocking-overlay-description-1')">Please wait while the WiFi configuration is being applied.</p>
      <p class="body" :data-testid="qa('blocking-overlay-description-2')">This process may take up to 30 seconds.</p>
      <div class="countdown heading-1" :data-testid="qa('blocking-overlay-countdown')">{{ countdown }}s</div>
      <div class="progress-bar" :data-testid="qa('blocking-overlay-progress-bar')">
        <div 
          class="progress-fill" 
          :data-testid="qa('blocking-overlay-progress-fill')"
          :style="{ width: `${((duration || 30) - countdown) / (duration || 30) * 100}%` }"
        ></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.blocking-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.blocking-content {
  background-color: white;
  padding: 3rem 2rem;
  border-radius: 12px;
  text-align: center;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.spinner {
  width: 60px;
  height: 60px;
  border: 6px solid #f3f3f3;
  border-top: 6px solid var(--primary-color);
  border-radius: 50%;
  margin: 0 auto 2rem;
  animation: spin 1s linear infinite;
}

h2 {
  margin: 0 0 1rem 0;
  color: var(--text-primary);
}

p {
  margin: 0.5rem 0;
  color: var(--text-secondary);
  /* line-height handled by token utility classes */
}

.countdown {
  color: var(--primary-color);
  margin: 2rem 0 1rem 0;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 1rem;
}

.progress-fill {
  height: 100%;
  background-color: var(--primary-color);
  transition: width 1s linear;
  border-radius: 4px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .blocking-content {
    padding: 2rem 1.5rem;
  }

  h2 {
    font-size: 1.3rem;
  }

  .countdown {
    font-size: 2.5rem;
  }
}
</style>