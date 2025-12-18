<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import PingTool from './PingTool.vue';
import TraceRouteTool from './TraceRouteTool.vue';
import DNSLookupTool from './DNSLookupTool.vue';
import { useQA } from '../../../utils/qa';
const { isQAMode, qa, slug } = useQA();

const { t } = useI18n();
const activeTab = ref('ping');

const tabs = computed(() => [
  { id: 'ping', label: t('diagnostics.ping') },
  { id: 'traceroute', label: t('diagnostics.traceRoute') },
  { id: 'dnslookup', label: t('diagnostics.dnsLookup') }
]);
</script>

<template>
  <div class="page-container">
    <h1 class="page-title" :data-testid="qa('diagnostics-title')">{{ t('diagnostics.title') }}</h1>

    <div class="status-content" :data-testid="qa('diagnostics-content')">
      <div class="panel-section" :data-testid="qa('diagnostics-panel')">
        <div class="tab-navigation" :data-testid="qa('diagnostics-tabs')">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="tab-button button-text"
            :class="{ active: activeTab === tab.id }"
            :data-testid="qa(`diagnostics-tab-${tab.id}`)"
            @click="activeTab = tab.id"
          >
            {{ tab.label }}
          </button>
        </div>

        <div class="tab-content" :data-testid="qa('diagnostics-tab-content')">
          <PingTool v-if="activeTab === 'ping'" :data-testid="qa('diagnostics-ping-tool')" />
          <TraceRouteTool v-if="activeTab === 'traceroute'" :data-testid="qa('diagnostics-traceroute-tool')" />
          <DNSLookupTool v-if="activeTab === 'dnslookup'" :data-testid="qa('diagnostics-dnslookup-tool')" />
        </div>
      </div>
    </div>
  </div>
</template>