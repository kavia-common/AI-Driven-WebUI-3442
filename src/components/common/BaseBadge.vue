<template>
  <span :class="badgeClasses">
    <slot></slot>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md';
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'neutral',
  size: 'md',
});

const badgeClasses = computed(() => {
  const classes = ['table-badge'];
  classes.push(`table-badge-${props.variant}`);

  if (props.size === 'sm') {
    classes.push('badge-sm');
  }

  return classes;
});
</script>

<style scoped>
.badge-sm {
  font-size: var(--font-size-caption);
  line-height: var(--line-height-caption);
  padding: 0.125rem var(--space-2);
}
</style>
