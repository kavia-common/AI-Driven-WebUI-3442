<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { AuthService } from '../services/auth';
import { useQA } from '../utils/qa';
const { isQAMode, qa, slug } = useQA();
import { getSidebarMenu, updateSidebarMenuLanguage } from '../services/api/sidebarMenu';

const router = useRouter();
const { t, locale } = useI18n();

const handleLogout = () => {
  AuthService.getInstance().clearSession();
  router.push('/login');
};

const languageMap: Record<string, string> = {
  'zh-TW': 'zh_TW',
  'zh-CN': 'zh_CN',
  'en': 'en',
  'fr': 'fr',
  'ja': 'ja',
  'de': 'de',
  'ko': 'ko'
};

const reverseLanguageMap: Record<string, string> = Object.fromEntries(
  Object.entries(languageMap).map(([k, v]) => [v, k])
);

const availableLanguages = ref([
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'ja', label: '日本語' },
  { code: 'de', label: 'Deutsch' },
  { code: 'zh_TW', label: '繁體中文' },
  { code: 'zh_CN', label: '简体中文' },
  { code: 'ko', label: '한국어' }
]);

const username = localStorage.getItem('username') || 'admin';

const handleLanguageChange = async (event: Event) => {
  const newLocale = (event.target as HTMLSelectElement).value;
  const datamodelLang = reverseLanguageMap[newLocale] || 'en';
  try {
    await updateSidebarMenuLanguage(datamodelLang);
    locale.value = newLocale;
  } catch (error) {
    console.error('Error updating language:', error);
    
    // Check if error is related to authentication
    if (error instanceof Error && 
        (error.message.includes('401') || 
         error.message.includes('403'))) {
      // Clear session and redirect to login
      AuthService.getInstance().clearSession();
      router.push('/login');
    }
  }
};

const fetchAvailableLanguages = async () => {
  try {
    const response = await getSidebarMenu();
    const availableCodes = response.SidebarMenu.language.available;
    
    // Filter languages to only show available ones
    availableLanguages.value = availableLanguages.value.filter(lang =>
      response.SidebarMenu.language.available.includes(reverseLanguageMap[lang.code])
    );
    
    // Set current language
    locale.value = languageMap[response.SidebarMenu.language.current] || 'en';
  } catch (error) {
    console.error('Error fetching available languages:', error);
    
    // Check if error is related to authentication or contains the specific error message
    if (error instanceof Error && 
        (error.message.includes('401') || 
         error.message.includes('403') ||
         error.message.includes('Failed to fetch sidebar menu'))) {
      // Clear session and redirect to login
      AuthService.getInstance().clearSession();
      router.push('/login');
    }
  }
};

onMounted(() => {
  fetchAvailableLanguages();
});
</script>

<template>
  <header class="header" :data-testid="qa('header')">
    <div class="header-controls" :data-testid="qa('header-controls')">
      <div class="language-select-container" :data-testid="qa('header-language-container')">
        <span class="material-icons" :data-testid="qa('header-language-icon')">language</span>
        <select 
          class="language-select body-sm" 
          :data-testid="qa('header-language-select')"
          :value="locale" 
          @change="handleLanguageChange"
        >
          <option v-for="lang in availableLanguages" :key="lang.code" :value="lang.code" :data-testid="qa(`header-language-option-${lang.code}`)">
            {{ lang.label }}
          </option>
        </select>
      </div>
      <button class="header-btn button-text" :data-testid="qa('header-account-button')">
        <span class="material-icons" :data-testid="qa('header-account-icon')">person</span>
        {{ username }}
      </button>
      <button class="header-btn button-text" :data-testid="qa('header-logout-button')" @click="handleLogout">
        <span class="material-icons" :data-testid="qa('header-logout-icon')">logout</span>
        {{ t('header.logout') }}
      </button>
    </div>
  </header>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 1rem 2rem;
  background-color: white;
  border-bottom: 1px solid #e0e0e0;
}

.header-controls {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.language-select-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #666;
}

.language-select {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
  color: #666;
  cursor: pointer;
}

.header-btn {
  padding: 0.5rem 1rem;
  background: none;
  border: none;
  cursor: pointer;
  color: #666;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.header-btn:hover {
  color: #333;
  background-color: #f5f5f5;
}

/* Typography: rely on global icon sizing; avoid ad-hoc font-size */
.material-icons {
}

@media (max-width: 768px) {
  .header {
    padding: 1rem;
  }

  .header-controls {
    gap: 0.5rem;
  }

  .header-btn {
    padding: 0.5rem;
  }

  .header-btn span:last-child {
    display: none;
  }
}
</style>