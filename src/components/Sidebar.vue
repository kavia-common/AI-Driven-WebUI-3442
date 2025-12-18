<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { getSidebarMenu, updateSidebarMenuLanguage } from '../services/api/sidebarMenu';
import { AuthService } from '../services/auth';
import { useQA } from '../utils/qa';
const { isQAMode, qa, slug } = useQA();

const router = useRouter();
const route = useRoute();
const { t, locale } = useI18n();
const activeMenu = ref('Status');
const activeSubItem = ref('');
const expandedMenus = ref<string[]>([]);
const isMobileMenuOpen = ref(false);
const deviceMode = ref<'Gateway' | 'Extender'>('Gateway');
const hasStreambow = ref(false);
const features = ref<Record<string, boolean>>({});

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
};

import homeIcon from '/src/assets/icons/icon-1/ico-home.svg';
import statusIcon from '/src/assets/icons/icon-1/menu-status.svg';
import basicIcon from '/src/assets/icons/icon-1/menu-basic.svg';
import wifiIcon from '/src/assets/icons/icon-1/menu-wifi.svg';
import advancedIcon from '/src/assets/icons/icon-1/menu-advanced.svg';
import managementIcon from '/src/assets/icons/icon-1/menu-utilities.svg';
import applicationIcon from '/src/assets/icons/icon-1/menu-application.svg';

interface SubMenuItem {
  name: string;
  path: string;
  translationKey: string;
  children?: SubMenuItem[];
}

interface MenuItem {
  name: string;
  icon: string;
  translationKey: string;
  path?: string;
  subItems?: SubMenuItem[];
}

const menuVisibility: Record<string, Record<string, { gateway: boolean; extender: boolean; requiresStreambow?: boolean }>> = {
  'Status': {
    'WAN': { gateway: true, extender: false },
    'WAN Failover': { gateway: true, extender: false },
    'LAN': { gateway: true, extender: true },
    'WLAN': { gateway: true, extender: true },
    'Statistics': { gateway: true, extender: true },
    'Throughput': { gateway: true, extender: true },
    'WiFi Neighbor': { gateway: true, extender: false },
    'Mesh Information': { gateway: true, extender: false },
    'LCM': { gateway: true, extender: true },
    'Dual Image': { gateway: true, extender: true },
    'Cellular': { gateway: true, extender: false },
    'Log': { gateway: true, extender: true }
  },
  'Basic Setup': {
    'WAN': { gateway: true, extender: false },
    'Backup WAN': { gateway: true, extender: false },
    'LAN': { gateway: true, extender: true },
    'WLAN': { gateway: true, extender: true },
    'Cellular': { gateway: true, extender: false },
    'NAT': { gateway: true, extender: false },
    'Security': { gateway: true, extender: false },
    'Routing': { gateway: true, extender: false }
  },
  'Advance Setup': {
    'SSH Service': { gateway: true, extender: false },
    'Service Control': { gateway: true, extender: false },
    'QoS': { gateway: true, extender: false }
  },
  'Application': {
    'XperienceControl': { gateway: false, extender: false, requiresStreambow: true },
    'UPnP': { gateway: true, extender: false },
    'DDNS': { gateway: true, extender: false }
  },
  'Management': {
    'Reboot': { gateway: true, extender: true },
    'Account Management': { gateway: true, extender: false },
    'NTP': { gateway: true, extender: false },
    'Device Management': { gateway: true, extender: false },
    'Settings': { gateway: true, extender: true },
    'Tools': { gateway: true, extender: true }
  }
};

const baseMenuItems: MenuItem[] = [
  {
    name: 'Home',
    icon: homeIcon,
    path: '/dashboard',
    translationKey: 'menu.home'
  },
  {
    name: 'Status',
    icon: statusIcon,
    translationKey: 'menu.status',
    subItems: [
      { name: 'WAN', path: '/status/wan', translationKey: 'menu.wan' },
      { name: 'WAN Failover', path: '/status/wan-failover', translationKey: 'menu.wanFailover' },
      { name: 'LAN', path: '/status/lan', translationKey: 'menu.lan' },
      { name: 'WLAN', path: '/status/wlan', translationKey: 'menu.wlan' },
      { name: 'Statistics', path: '/status/statistics', translationKey: 'menu.statistics' },
      { name: 'Throughput', path: '/status/system-stats', translationKey: 'menu.throughput' },
      { name: 'WiFi Neighbor', path: '/status/wifi-neighbor', translationKey: 'menu.wifiNeighbor' },
      { name: 'Mesh Information', path: '/status/mesh', translationKey: 'menu.meshInfo' },
      { name: 'LCM', path: '/status/lcm', translationKey: 'menu.lcm' },
      { name: 'Dual Image', path: '/status/dual-image', translationKey: 'menu.dualImage' },
      { name: 'Cellular', path: '/status/cellular', translationKey: 'menu.cellular' },
      { name: 'Log', path: '/status/log', translationKey: 'menu.logs' }
    ]
  },
  {
    name: 'Basic Setup',
    icon: basicIcon,
    translationKey: 'menu.basicSetup',
    subItems: [
      { name: 'WAN', path: '/basic/wan', translationKey: 'menu.wan' },
      { name: 'Backup WAN', path: '/basic/backup-wan', translationKey: 'menu.backupWan' },
      {
        name: 'LAN',
        path: '/basic/lan',
        translationKey: 'menu.lan',
        children: [
          { name: 'IPv4 Configuration', path: '/basic/lan/ipv4', translationKey: 'menu.ipv4Config' },
          { name: 'IPv6 Configuration', path: '/basic/lan/ipv6', translationKey: 'menu.ipv6Config' },
          { name: 'Device Connected', path: '/basic/lan/devices', translationKey: 'menu.deviceConnected' }
        ]
      },
      {
        name: 'WLAN',
        path: '/basic/wlan',
        translationKey: 'menu.wlan',
        children: [
          { name: 'Basic Config', path: '/basic/wlan/basic', translationKey: 'menu.basicConfig' },
          { name: 'Advanced Config', path: '/basic/wlan/advanced', translationKey: 'menu.advancedConfig' },
          { name: 'WPS Configuration', path: '/basic/wlan/wps', translationKey: 'menu.wpsConfig' },
          { name: 'Mesh Network', path: '/basic/wlan/mesh', translationKey: 'menu.meshNetwork' },
          { name: 'WiFi Zones', path: '/basic/wlan/zones', translationKey: 'menu.wifiZones' },
          { name: 'Wireless Extender', path: '/basic/wlan/extender', translationKey: 'menu.wirelessExtender' }
        ]
      },
      { name: 'Cellular', path: '/basic/cellular', translationKey: 'menu.cellular' },
      {
        name: 'NAT',
        path: '/basic/nat',
        translationKey: 'menu.nat',
        children: [
          { name: 'Port Forwarding', path: '/basic/nat?tab=portforwarding', translationKey: 'menu.portForwarding' },
          { name: 'DMZ Host', path: '/basic/nat?tab=dmz', translationKey: 'menu.dmzHost' },
          { name: 'ALG', path: '/basic/nat?tab=alg', translationKey: 'menu.alg' }
        ]
      },
      {
        name: 'Security',
        path: '/basic/security',
        translationKey: 'menu.security',
        children: [
          { name: 'IP Filtering', path: '/basic/security?tab=ipfiltering', translationKey: 'menu.ipFiltering' },
          { name: 'MAC Filtering', path: '/basic/security?tab=macfiltering', translationKey: 'menu.macFiltering' }
        ]
      },
      { name: 'Routing', path: '/basic/routing', translationKey: 'menu.routing' }
    ]
  },
  {
    name: 'Advance Setup',
    icon: advancedIcon,
    translationKey: 'menu.advanceSetup',
    subItems: [
      { name: 'SSH Service', path: '/advance/ssh', translationKey: 'menu.sshService' },
      { name: 'Service Control', path: '/advance/service-control', translationKey: 'menu.serviceControl' },
      { name: 'QoS', path: '/advance/qos', translationKey: 'menu.qos' }
    ]
  },
  {
    name: 'Application',
    icon: applicationIcon,
    translationKey: 'menu.application',
    subItems: [
      { name: 'XperienceControl', path: '/application/xperience-control', translationKey: 'menu.xperienceControl' },
      { name: 'UPnP', path: '/application/upnp', translationKey: 'menu.upnp' },
      { name: 'DDNS', path: '/application/ddns', translationKey: 'menu.ddns' }
    ]
  },
  {
    name: 'Management',
    icon: managementIcon,
    translationKey: 'menu.management',
    subItems: [
      { name: 'Reboot', path: '/management/reboot', translationKey: 'menu.reboot' },
      { name: 'Account Management', path: '/management/account', translationKey: 'menu.account' },
      { name: 'NTP', path: '/management/ntp', translationKey: 'menu.ntp' },
      { name: 'Device Management', path: '/management/device', translationKey: 'menu.device' },
      {
        name: 'Settings',
        path: '/management/settings',
        translationKey: 'menu.settings',
        children: [
          { name: 'Reset to Default', path: '/management/settings/reset', translationKey: 'menu.resetToDefault' },
          { name: 'Backup/Restore', path: '/management/settings/backup', translationKey: 'menu.backupRestore' },
          { name: 'Update Software', path: '/management/settings/update', translationKey: 'menu.updateSoftware' }
        ]
      },
      {
        name: 'Tools',
        path: '/management/tools',
        translationKey: 'menu.tools',
        children: [
          { name: 'Ping Diagnosis', path: '/management/tools/ping', translationKey: 'menu.pingDiagnosis' },
          { name: 'Trace Route Diagnosis', path: '/management/tools/traceroute', translationKey: 'menu.traceRouteDiagnosis' },
          { name: 'DNS Diagnosis', path: '/management/tools/dns', translationKey: 'menu.dnsDiagnosis' }
        ]
      }
    ]
  }
];

const menuItems = ref<MenuItem[]>(baseMenuItems);

const filterMenuItems = () => {
  const isGateway = deviceMode.value === 'Gateway';

  menuItems.value = baseMenuItems.map(item => {
    // Skip filtering for Home (top-level menu item without subItems)
    if (item.name === 'Home') return item;

    if (item.subItems) {
      const filteredSubItems = item.subItems.filter(subItem => {
        const visibilityCategory = menuVisibility[item.name];
        if (!visibilityCategory) return true;

        const visibility = visibilityCategory[subItem.name];
        if (!visibility) return true;

        if (visibility.requiresStreambow) {
          return hasStreambow.value;
        }

        return isGateway ? visibility.gateway : visibility.extender;
      });

      if (filteredSubItems.length === 0) return null;

      return {
        ...item,
        subItems: filteredSubItems
      };
    }

    return item;
  }).filter((item): item is MenuItem => item !== null);
};

const toggleMenu = (menuName: string) => {
  if (expandedMenus.value.includes(menuName)) {
    expandedMenus.value = expandedMenus.value.filter(name => name !== menuName);
  } else {
    expandedMenus.value = [menuName];
  }
};

const handleMenuClick = (menuName: string, path?: string) => {
  activeMenu.value = menuName;
  activeSubItem.value = '';
  if (path) {
    router.push(path);
  } else {
    toggleMenu(menuName);
  }
};

const handleSubItemClick = (subItem: { name: string; path: string }, event?: Event) => {
  if (event) {
    event.stopPropagation();
  }
  activeSubItem.value = subItem.name;
  router.push(subItem.path);
};

const isMenuExpanded = (menuName: string): boolean => {
  return expandedMenus.value.includes(menuName);
};

const STREAMBOW_KEYWORDS = ['streambow'];

const fetchSidebarMenu = async () => {
  try {
    const response = await getSidebarMenu();
    deviceMode.value = response.SidebarMenu.mode;

    features.value = response.SidebarMenu.features || {};

    hasStreambow.value = response.SidebarMenu.Apps.some(app => {
      if (app.state !== 'active') return false;

      const name = app.name?.toLowerCase() || '';
      const alias = app.alias?.toLowerCase() || '';
      return STREAMBOW_KEYWORDS.some(keyword =>
        name.includes(keyword) || alias.includes(keyword)
      );
    });

    if (response.SidebarMenu.language.current !== locale.value) {
      locale.value = response.SidebarMenu.language.current;
    }

    filterMenuItems();
  } catch (err) {
    console.error('Error fetching sidebar menu:', err);

    if (err instanceof Error &&
        (err.message.includes('403') ||
         err.message.includes('401') ||
         err.message.includes('Failed to fetch sidebar menu'))) {
      const auth = AuthService.getInstance();
      auth.clearSession();
      router.push('/login');
    }
  }
};

watch(() => locale.value, async (newLocale) => {
  try {
    await updateSidebarMenuLanguage(newLocale);
  } catch (error) {
    console.error('Error updating language:', error);

    if (error instanceof Error &&
        (error.message.includes('403') ||
         error.message.includes('401'))) {
      const auth = AuthService.getInstance();
      auth.clearSession();
      router.push('/login');
    }
  }
});

watch(() => route.path, (newPath) => {
  let found = false;

  // Path mapping for redirects: maps menu paths to their actual routes
  const pathRedirects: Record<string, string[]> = {
    '/basic/wan': ['/network/wan'],
    '/basic/lan': ['/network/lan'],
    '/basic/lan/ipv4': ['/network/lan/ipv4'],
    '/basic/lan/devices': ['/network/lan/devices'],
    '/basic/wlan': ['/network/wireless'],
    '/basic/wlan/basic': ['/network/wireless/basic'],
    '/basic/wlan/advanced': ['/network/wireless/advanced'],
    '/basic/wlan/wps': ['/network/wireless/wps'],
    '/basic/wlan/mesh': ['/network/wireless/mesh'],
    '/basic/wlan/extender': ['/network/wireless/extender'],
    '/basic/nat': ['/advanced/nat'],
    '/basic/nat/dmz': ['/advanced/nat/dmz'],
    '/basic/security': ['/advanced/security'],
    '/advance/ssh': ['/advanced/ssh'],
    '/advance/service-control': ['/advanced/service-control'],
    '/advance/qos': ['/advanced/qos'],
    '/application/ddns': ['/advanced/ddns'],
    '/management/tools': ['/system/diagnostics'],
    '/management/tools/ping': ['/system/diagnostics/ping'],
    '/management/tools/traceroute': ['/system/diagnostics/traceroute'],
    '/management/tools/dns': ['/system/diagnostics/dns'],
    '/management/reboot': ['/system/reboot'],
    '/management/ntp': ['/system/ntp'],
    '/management/settings': ['/system/settings'],
    '/management/settings/reset': ['/system/settings/reset'],
    '/management/settings/backup': ['/system/settings/backup'],
    '/management/settings/update': ['/system/settings/update'],
    '/management/device': ['/system/device'],
    '/management/account': ['/system/account']
  };

  const pathMatches = (menuPath: string, currentPath: string): boolean => {
    // Exact match
    if (menuPath === currentPath) return true;

    // Check if menuPath has a known redirect to currentPath
    if (pathRedirects[menuPath]) {
      if (pathRedirects[menuPath].includes(currentPath)) {
        return true;
      }
    }

    return false;
  };

  for (const item of menuItems.value) {
    if (item.path && pathMatches(item.path, newPath)) {
      activeMenu.value = item.name;
      activeSubItem.value = '';
      found = true;
      break;
    }
    if (item.subItems) {
      const subItem = item.subItems.find(sub => pathMatches(sub.path, newPath));
      if (subItem) {
        activeMenu.value = item.name;
        activeSubItem.value = subItem.name;
        if (!expandedMenus.value.includes(item.name)) {
          expandedMenus.value = [item.name];
        }
        found = true;
        break;
      }

      for (const subItem of item.subItems) {
        if (subItem.children) {
          const childItem = subItem.children.find(child => pathMatches(child.path, newPath));
          if (childItem) {
            activeMenu.value = item.name;
            activeSubItem.value = subItem.name;
            if (!expandedMenus.value.includes(item.name)) {
              expandedMenus.value = [item.name];
            }
            found = true;
            break;
          }
        }
      }
      if (found) break;
    }
  }

  if (!found) {
    activeSubItem.value = '';
    expandedMenus.value = [];
  }
}, { immediate: true });

onMounted(() => {
  fetchSidebarMenu();
});
</script>

<template>
  <div class="mobile-top-header" :data-testid="qa('mobile-header')">
    <button class="mobile-menu-toggle" :data-testid="qa('mobile-menu-toggle')" @click="toggleMobileMenu">
      <span class="material-icons" :data-testid="qa('mobile-menu-icon')">{{ isMobileMenuOpen ? 'close' : 'menu' }}</span>
    </button>
    <span class="mobile-logo heading-4" :data-testid="qa('mobile-logo')">Gemtek</span>
  </div>

  <aside class="sidebar" :data-testid="qa('sidebar')" :class="{ 'mobile-open': isMobileMenuOpen }">
    <div class="logo desktop-only" :data-testid="qa('sidebar-logo')">
      <span class="logo-text heading-4" :data-testid="qa('sidebar-logo-text')">Gemtek</span>
    </div>
    <nav class="menu" :data-testid="qa('sidebar-menu')">
      <div
        v-for="item in menuItems"
        :key="item.name"
        class="menu-item"
        :data-testid="qa(`sidebar-menu-item-${slug(item.name)}`)"
        :class="{ active: activeMenu === item.name }"
      >
        <div
          class="menu-header"
          :data-testid="qa(`sidebar-menu-header-${slug(item.name)}`)"
          @click="handleMenuClick(item.name, item.path)"
        >
          <span class="icon" :data-testid="qa(`sidebar-menu-icon-${slug(item.name)}`)">
            <img :src="item.icon" alt="icon" />
          </span>
          {{ t(item.translationKey) }}
          <span
            v-if="item.subItems"
            class="arrow"
            :data-testid="qa(`sidebar-menu-arrow-${slug(item.name)}`)"
            :class="{ expanded: isMenuExpanded(item.name) }"
          >▶</span>
        </div>
        <div
          v-if="item.subItems"
          class="submenu"
          :data-testid="qa(`sidebar-submenu-${slug(item.name)}`)"
          :class="{ expanded: isMenuExpanded(item.name) }"
        >
          <div
            v-for="subItem in item.subItems"
            :key="subItem.name"
            class="submenu-item"
            :data-testid="qa(`sidebar-submenu-item-${slug(item.name)}-${slug(subItem.name)}`)"
            :class="{ active: activeSubItem === subItem.name }"
            @click="handleSubItemClick(subItem, $event)"
          >
            {{ t(subItem.translationKey) }}
          </div>
        </div>
      </div>
    </nav>
  </aside>
</template>

<style scoped>
.mobile-top-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--header-height);
  background-color: #006BC4;
  display: none;
  align-items: center;
  padding: 0 1rem;
  z-index: 1002;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.mobile-menu-toggle {
  background: none;
  border: none;
  color: white;
  padding: 0.5rem;
  margin: -0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.mobile-menu-toggle .material-icons {
  font-size: 24px;
}

.mobile-logo {
  margin-left: 1rem;
  color: white;
}

.sidebar {
  width: var(--sidebar-width);
  min-height: 100vh;
  background: linear-gradient(to bottom, #006BC4 8%, #45B1E4 100%);
  color: white;
  padding: 0;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.2);
  position: relative;
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
}

.logo {
  height: var(--header-height);
  display: flex;
  align-items: center;
  padding: 0 1.5rem;
  background-color: #006BC4;
  flex-shrink: 0;
}

.logo-text {
  color: #ffffff;
}

.menu {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
}

.menu::-webkit-scrollbar {
  width: 6px;
}

.menu::-webkit-scrollbar-track {
  background: transparent;
}

.menu::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.menu-header {
  padding: 0.875rem 1.5rem;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 1rem;
  position: relative;
  text-align: left;
}

.menu-header:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.menu-item.active .menu-header {
  background-color: rgba(255, 255, 255, 0.15);
}

.icon {
  margin-right: 0.75rem;
  font-size: 1.1rem;
  width: 24px;
  text-align: center;
}

.arrow {
  position: absolute;
  right: 1.5rem;
  font-size: 0.75rem;
  opacity: 0.8;
  transition: transform 0.3s ease;
}

.arrow.expanded {
  transform: rotate(90deg);
}

.submenu {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease-out;
}

.submenu.expanded {
  max-height: 800px;
}

.submenu-item {
  padding: 0.75rem 3.5rem;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.9);
  text-align: left;
}

.submenu-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.submenu-item.active {
  background-color: #409FD5;
  color: #ffffff;
  font-weight: 500;
}

@media (max-width: 768px) {
  .mobile-top-header {
    display: flex;
  }

  .desktop-only {
    display: none;
  }

  .sidebar {
    position: fixed;
    top: var(--header-height);
    left: 0;
    bottom: 0;
    z-index: 1001;
    transform: translateX(-100%);
    width: 100%;
    max-width: 320px;
  }

  .sidebar.mobile-open {
    transform: translateX(0);
  }

  .menu {
    height: calc(100vh - var(--header-height));
    padding-top: 0;
    overflow-y: auto;
  }

  .menu-header {
    padding: 1rem 1.5rem;
  }

  .submenu-item {
    padding: 1rem 2.5rem;
  }
}
</style>
