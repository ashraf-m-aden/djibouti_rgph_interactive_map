import { defineStore } from 'pinia';

export const useThemeStore = defineStore('theme', {
  state: () => ({
    themes: [
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
    ],
    activeTheme: null,
    loading: false,
  }),

  getters: {
    getThemeBySlug: (state) => (slug: string) => {
      return state.themes.find(t => t.slug === slug);
    },
  },

  actions: {
    setActiveTheme(slug: any) {
      this.activeTheme = slug;
    },

    async fetchThemes() {
      this.loading = true;
      try {
        const config = useRuntimeConfig();
        const { data } = await useFetch(`${config.public.apiBase}/themes`) as any;
        if (data.value?.success) {
          this.themes = data.value.data;
        }
      } catch (error) {
        console.error('Error fetching themes:', error);
      } finally {
        this.loading = false;
      }
    },
  },
});
