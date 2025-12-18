<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click="handleOverlayClick">
        <div :class="modalClasses" @click.stop>
          <div v-if="$slots.header || title" class="modal-header">
            <slot name="header">
              <!-- Typography: modal title uses token heading scale -->
              <h3 class="modal-title heading-4">{{ title }}</h3>
            </slot>
            <button
              v-if="closable"
              class="modal-close"
              type="button"
              @click="close"
            >
              <span>&times;</span>
            </button>
          </div>

          <div class="modal-body">
            <slot></slot>
          </div>

          <div v-if="$slots.footer" class="modal-footer">
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted } from 'vue';

interface Props {
  modelValue: boolean;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closable?: boolean;
  closeOnOverlay?: boolean;
  closeOnEscape?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  closable: true,
  closeOnOverlay: true,
  closeOnEscape: true,
});

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  close: [];
}>();

const modalClasses = computed(() => {
  const classes = ['modal-dialog'];
  classes.push(`modal-${props.size}`);
  return classes;
});

const close = () => {
  emit('update:modelValue', false);
  emit('close');
};

const handleOverlayClick = () => {
  if (props.closeOnOverlay) {
    close();
  }
};

const handleEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.closeOnEscape && props.modelValue) {
    close();
  }
};

watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});

onMounted(() => {
  document.addEventListener('keydown', handleEscape);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape);
  document.body.style.overflow = '';
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: var(--bg-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-index-modal);
  padding: var(--space-4);
  overflow-y: auto;
}

.modal-dialog {
  background-color: var(--bg-secondary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  width: 100%;
  max-height: calc(100vh - 2rem);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-sm {
  max-width: 400px;
}

.modal-md {
  max-width: 600px;
}

.modal-lg {
  max-width: 800px;
}

.modal-xl {
  max-width: 1200px;
}

.modal-full {
  max-width: calc(100vw - 2rem);
  max-height: calc(100vh - 2rem);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-6);
  border-bottom: 1px solid var(--border-color);
}

.modal-title {
  color: var(--text-primary);
  margin: 0;
}

.modal-close {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: var(--font-size-2xl);
  line-height: 1;
  transition: all var(--transition-fast);
}

.modal-close:hover {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.modal-body {
  flex: 1;
  padding: var(--space-6);
  overflow-y: auto;
}

.modal-footer {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
  padding: var(--space-6);
  border-top: 1px solid var(--border-color);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity var(--transition-base);
}

.modal-enter-active .modal-dialog,
.modal-leave-active .modal-dialog {
  transition: transform var(--transition-base);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-dialog,
.modal-leave-to .modal-dialog {
  transform: scale(0.95) translateY(-20px);
}

@media (max-width: 768px) {
  .modal-dialog {
    margin: var(--space-2);
    max-width: calc(100vw - 1rem);
  }

  .modal-header,
  .modal-body,
  .modal-footer {
    padding: var(--space-4);
  }

  .modal-footer {
    flex-direction: column-reverse;
  }

  .modal-footer .btn {
    width: 100%;
  }
}
</style>
