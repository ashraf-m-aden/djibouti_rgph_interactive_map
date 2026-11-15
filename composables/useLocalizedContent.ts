// composables/useLocalizedContent.ts
//
// Resolution des objets multilingues renvoyes par l'API ({ fr, ar, en }).
// Cette fonction etait reecrite dans cinq fichiers avec des ordres de repli
// differents (cf. AUDIT F-14) : c'est desormais la seule implementation.
import type { LocalizedName } from '~/types/api';

type Localizable = string | LocalizedName | null | undefined;

export const useLocalizedContent = () => {
  const { locale } = useI18n();
  const currentLang = computed(() => String(locale.value));

  const getLocalizedName = (value: Localizable, fallback = ''): string => {
    if (!value) return fallback;
    if (typeof value === 'string') return value;

    return value[currentLang.value] || value.fr || value.en || value.ar || fallback;
  };

  return {
    currentLang,
    getLocalizedName,
  };
};
