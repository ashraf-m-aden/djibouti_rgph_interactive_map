// composables/useLocalizedContent.ts
export const useLocalizedContent = () => {
  const { locale } = useI18n();
  const currentLang = computed(() => String(locale.value));

  const getLocalizedName = (nameObj: string | Record<string, string> | null | undefined): string => {
    if (!nameObj) return '';
    if (typeof nameObj === 'string') return nameObj;
    if (typeof nameObj === 'object') {
      return nameObj[currentLang.value] || nameObj.fr || nameObj.en || nameObj.ar || '';
    }
    return '';
  };

  return {
    currentLang,
    getLocalizedName,
  };
};