<template>
  <div :class="containerClasses">
    <div :class="spinnerClasses"></div>
    <p v-if="text" :class="textClasses">{{ text }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'secondary' | 'white';
  text?: string;
  centered?: boolean;
  fullPage?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  variant: 'primary',
  centered: false,
  fullPage: false,
});

const containerClasses = computed(() => {
  const classes = ['spinner-container'];

  if (props.centered || props.fullPage) {
    classes.push('spinner-centered');
  }

  if (props.fullPage) {
    classes.push('spinner-fullpage');
  }

  return classes;
});

const spinnerClasses = computed(() => {
  const classes = ['spinner'];
  classes.push(`spinner-${props.size}`);
  classes.push(`spinner-${props.variant}`);
  return classes;
});

const textClasses = computed(() => {
  const classes = ['spinner-text'];
  classes.push(`text-${props.variant === 'white' ? 'inverse' : 'secondary'}`);
  return classes;
});
</script>

<style scoped>
.spinner-container {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
}

.spinner-centered {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.spinner-fullpage {
  position: fixed;
  inset: 0;
  background-color: var(--bg-overlay);
  z-index: var(--z-index-modal);
}

.spinner {
  border-radius: 50%;
  border-style: solid;
  border-right-color: transparent !important;
  animation: spin 0.8s linear infinite;
}

.spinner-sm {
  width: 1rem;
  height: 1rem;
  border-width: 2px;
}

.spinner-md {
  width: 2rem;
  height: 2rem;
  border-width: 3px;
}

.spinner-lg {
  width: 3rem;
  height: 3rem;
  border-width: 4px;
}

.spinner-xl {
  width: 4rem;
  height: 4rem;
  border-width: 5px;
}

.spinner-primary {
  border-color: var(--color-primary);
}

.spinner-secondary {
  border-color: var(--color-gray-500);
}

.spinner-white {
  border-color: var(--color-white);
}

.spinner-text {
  font-size: var(--font-size-body-sm);
  line-height: var(--line-height-body);
  font-weight: var(--font-weight-medium);
  margin: 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
