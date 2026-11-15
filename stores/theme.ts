import { defineStore } from 'pinia';
import type { Theme } from '~/types/api';

/**
 * Liste de secours, utilisee uniquement si l'API ne repond pas. Elle etait
 * auparavant l'unique source de la barre laterale : fetchThemes() n'etait
 * appelee nulle part, donc aucune modification en base n'apparaissait
 * (cf. AUDIT F-07).
 */
const FALLBACK_THEMES: Theme[] = [
  {
    slug: 'demographie',
    name: { fr: 'Démographie', ar: 'الديموغرافيا', en: 'Demographics' },
    icon: 'mdi-account-group',
    color: '#8B1A1A',
  },
  {
    slug: 'caracteristiques-economiques',
    name: { fr: 'Caractéristiques économiques', ar: 'الخصائص الاقتصادية', en: 'Economic characteristics' },
    icon: 'mdi-briefcase',
    color: '#1A5276',
  },
  {
    slug: 'education',
    name: { fr: 'Éducation et analphabétisme', ar: 'التعليم والأمية', en: 'Education and illiteracy' },
    icon: 'mdi-school',
    color: '#1E8449',
  },
  {
    slug: 'sante',
    name: { fr: 'Santé', ar: 'الصحة', en: 'Health' },
    icon: 'mdi-hospital',
    color: '#E74C3C',
  },
  {
    slug: 'habitat',
    name: { fr: "Conditions d'habitat", ar: 'ظروف السكن', en: 'Housing conditions' },
    icon: 'mdi-home',
    color: '#F39C12',
  },
  {
    slug: 'langue-maternelle',
    name: { fr: 'Langue maternelle', ar: 'اللغة الأم', en: 'Mother tongue' },
    icon: 'mdi-translate',
    color: '#8E44AD',
  },
  {
    slug: 'pauvrete',
    name: { fr: 'Pauvreté multidimensionnelle', ar: 'الفقر متعدد الأبعاد', en: 'Multidimensional poverty' },
    icon: 'mdi-chart-line',
    color: '#D35400',
  },
];

interface ThemeState {
  themes: Theme[];
  activeTheme: string | null;
  loading: boolean;
  loaded: boolean;
  usingFallback: boolean;
}

export const useThemeStore = defineStore('theme', {
  state: (): ThemeState => ({
    themes: FALLBACK_THEMES,
    activeTheme: null,
    loading: false,
    loaded: false,
    usingFallback: true,
  }),

  getters: {
    getThemeBySlug: (state) => (slug: string) => state.themes.find((t) => t.slug === slug),
  },

  actions: {
    setActiveTheme(slug: string | null) {
      this.activeTheme = slug;
    },

    async fetchThemes(force = false) {
      if (this.loading || (this.loaded && !force)) return;

      this.loading = true;
      try {
        const { getThemes } = useApi();
        const response = await getThemes();
        if (response?.success && Array.isArray(response.data) && response.data.length) {
          this.themes = response.data;
          this.usingFallback = false;
        }
        this.loaded = true;
      } catch (error) {
        // On conserve la liste de secours : la navigation reste utilisable.
        console.error('Error fetching themes:', error);
      } finally {
        this.loading = false;
      }
    },
  },
});
