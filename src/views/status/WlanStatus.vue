<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import type { WlanStatusResponse } from '../../types/wlan';
import { getWlanStatus } from '../../services/api';
import WlanBandInfo from '../../components/status/WlanBandInfo.vue';
import { useQA } from '../../utils/qa';
const { isQAMode, qa, slug } = useQA();

const { t } = useI18n();
const wlanData = ref<WlanStatusResponse | null>(null);
const bandOrder = ["2.4GHz", "5GHz", "6GHz"];

const fetchWlanStatus = async () => {
  try {
    const response = await getWlanStatus();

    response.StatusWlan.sort((a, b) => {
  const aIndex = bandOrder.indexOf(a.Band);
  const bIndex = bandOrder.indexOf(b.Band);
  return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
});

    wlanData.value = response;
  } catch (error) {
    console.error('Error fetching WLAN status:', error);
  }
};

onMounted(() => {
  fetchWlanStatus();
});
</script>

<template>
  <div class="page-container">
    <h1 class="page-title" :data-testid="qa('wlan-title')">{{ t('wlan.title') }}</h1>
    
    <div v-if="wlanData" class="status-content" :data-testid="qa('wlan-content')">
      <div v-for="band in wlanData.StatusWlan" :key="band.Band" class="panel-section" :data-testid="qa(`wlan-band-${slug(band.Band)}`)">
        <div class="section-title section-title-text" :data-testid="qa(`wlan-band-title-${slug(band.Band)}`)">WiFi {{ band.Band }}</div>
        
        <div class="card-content">
          <WlanBandInfo :band="band" />
          
          <div class="table-container" :data-testid="qa(`wlan-band-table-${slug(band.Band)}`)">
            <table>
              <thead>
                <tr>
                  <th :data-testid="qa('wlan-header-name')">{{ t('wlan.name') }}</th>
                  <th :data-testid="qa('wlan-header-alias')">{{ t('wlan.alias') }}</th>
                  <th :data-testid="qa('wlan-header-status')">{{ t('wlan.status') }}</th>
                  <th :data-testid="qa('wlan-header-ssid')">{{ t('wlan.ssid') }}</th>
                  <th :data-testid="qa('wlan-header-authentication')">{{ t('wlan.authentication') }}</th>
                  <th :data-testid="qa('wlan-header-encryption')">{{ t('wlan.encryption') }}</th>
                  <th :data-testid="qa('wlan-header-password')">{{ t('wlan.password') }}</th>
                  <th :data-testid="qa('wlan-header-bssid')">{{ t('wlan.bssid') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(iface, ifaceIndex) in band.Interface" :key="iface.Name" :data-testid="qa(`wlan-interface-row-${slug(band.Band)}-${ifaceIndex}`)">
                  <td :data-testid="qa(`wlan-interface-name-${slug(band.Band)}-${ifaceIndex}`)">{{ iface.Name }}</td>
                  <td :data-testid="qa(`wlan-interface-alias-${slug(band.Band)}-${ifaceIndex}`)">{{ iface.Alias }}</td>
                  <td :data-testid="qa(`wlan-interface-status-${slug(band.Band)}-${ifaceIndex}`)">{{ iface.Enable ? t('wlan.enable') : t('wlan.disable') }}</td>
                  <td :data-testid="qa(`wlan-interface-ssid-${slug(band.Band)}-${ifaceIndex}`)">{{ iface.SSID }}</td>
                  <td :data-testid="qa(`wlan-interface-authentication-${slug(band.Band)}-${ifaceIndex}`)">{{ iface.Authentication }}</td>
                  <td :data-testid="qa(`wlan-interface-encryption-${slug(band.Band)}-${ifaceIndex}`)">{{ iface.Encryption }}</td>
                  <td :data-testid="qa(`wlan-interface-password-${slug(band.Band)}-${ifaceIndex}`)">{{ iface.Password }}</td>
                  <td :data-testid="qa(`wlan-interface-bssid-${slug(band.Band)}-${ifaceIndex}`)">{{ iface.BSSID }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="mobile-cards" :data-testid="qa(`wlan-band-mobile-${slug(band.Band)}`)">
            <div class="table-card" v-for="(iface, ifaceIndex) in band.Interface" :key="iface.Name" :data-testid="qa(`wlan-interface-card-${slug(band.Band)}-${ifaceIndex}`)">
              <div class="card-row">
                <span class="card-label" :data-testid="qa(`wlan-interface-card-name-label-${slug(band.Band)}-${ifaceIndex}`)">{{ t('wlan.name') }}</span>
                <span class="card-value" :data-testid="qa(`wlan-interface-card-name-value-${slug(band.Band)}-${ifaceIndex}`)">{{ iface.Name }}</span>
              </div>
              <div class="card-row">
                <span class="card-label" :data-testid="qa(`wlan-interface-card-alias-label-${slug(band.Band)}-${ifaceIndex}`)">{{ t('wlan.alias') }}</span>
                <span class="card-value" :data-testid="qa(`wlan-interface-card-alias-value-${slug(band.Band)}-${ifaceIndex}`)">{{ iface.Alias }}</span>
              </div>
              <div class="card-row">
                <span class="card-label" :data-testid="qa(`wlan-interface-card-status-label-${slug(band.Band)}-${ifaceIndex}`)">{{ t('wlan.status') }}</span>
                <span class="card-value" :data-testid="qa(`wlan-interface-card-status-value-${slug(band.Band)}-${ifaceIndex}`)">{{ iface.Enable ? t('wlan.enable') : t('wlan.disable') }}</span>
              </div>
              <div class="card-row">
                <span class="card-label" :data-testid="qa(`wlan-interface-card-ssid-label-${slug(band.Band)}-${ifaceIndex}`)">{{ t('wlan.ssid') }}</span>
                <span class="card-value" :data-testid="qa(`wlan-interface-card-ssid-value-${slug(band.Band)}-${ifaceIndex}`)">{{ iface.SSID }}</span>
              </div>
              <div class="card-row">
                <span class="card-label" :data-testid="qa(`wlan-interface-card-authentication-label-${slug(band.Band)}-${ifaceIndex}`)">{{ t('wlan.authentication') }}</span>
                <span class="card-value" :data-testid="qa(`wlan-interface-card-authentication-value-${slug(band.Band)}-${ifaceIndex}`)">{{ iface.Authentication }}</span>
              </div>
              <div class="card-row">
                <span class="card-label" :data-testid="qa(`wlan-interface-card-encryption-label-${slug(band.Band)}-${ifaceIndex}`)">{{ t('wlan.encryption') }}</span>
                <span class="card-value" :data-testid="qa(`wlan-interface-card-encryption-value-${slug(band.Band)}-${ifaceIndex}`)">{{ iface.Encryption }}</span>
              </div>
              <div class="card-row">
                <span class="card-label" :data-testid="qa(`wlan-interface-card-password-label-${slug(band.Band)}-${ifaceIndex}`)">{{ t('wlan.password') }}</span>
                <span class="card-value" :data-testid="qa(`wlan-interface-card-password-value-${slug(band.Band)}-${ifaceIndex}`)">{{ iface.Password }}</span>
              </div>
              <div class="card-row">
                <span class="card-label" :data-testid="qa(`wlan-interface-card-bssid-label-${slug(band.Band)}-${ifaceIndex}`)">{{ t('wlan.bssid') }}</span>
                <span class="card-value" :data-testid="qa(`wlan-interface-card-bssid-value-${slug(band.Band)}-${ifaceIndex}`)">{{ iface.BSSID }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>