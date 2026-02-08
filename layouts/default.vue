<template>
  <div :dir="direction">
    <AppHeader />
    <div class="app-layout">
      <AppSidebar />
      <main class="app-main">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppHeader from '~/components/layout/AppHeader.vue';
import AppSidebar from '~/components/layout/AppSidebar.vue';

const { locale } = useI18n();

const direction = computed(() => {
  return String(locale.value) === 'ar' ? 'rtl' : 'ltr';
});

watch(locale, (newLocale) => {
  if (typeof document !== 'undefined') {
    const loc = String(newLocale);
    document.documentElement.dir = loc === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = loc;
  }
}, { immediate: true });
</script>
