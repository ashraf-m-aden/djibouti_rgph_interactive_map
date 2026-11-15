// composables/useValueFormat.ts
//
// Formatage des valeurs d'indicateurs, partage par la carte et les pages.
// Trois implementations divergentes coexistaient, toutes avec des suffixes
// "k"/"M" codes en dur : en arabe le suffixe latin se retrouvait a gauche du
// nombre (rendu bidi), et l'unite de l'indicateur n'etait pas prise en compte.
import type { Unit } from '~/types/api';

export const useValueFormat = () => {
  const { locale } = useI18n();

  const lang = computed(() => String(locale.value));

  /** Valeur complete, sans abreviation : "495 392", "37,8 %". */
  const formatValue = (value: number | null | undefined, unit?: Unit | null): string => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '—';

    if (unit === 'percentage') {
      return new Intl.NumberFormat(lang.value, {
        style: 'percent',
        maximumFractionDigits: 1,
      }).format(value / 100);
    }

    return new Intl.NumberFormat(lang.value, { maximumFractionDigits: 2 }).format(value);
  };

  /** Version abregee pour les etiquettes de carte et la legende. */
  const formatCompact = (value: number | null | undefined, unit?: Unit | null): string => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '—';

    if (unit === 'percentage') return formatValue(value, unit);

    if (Math.abs(value) >= 1000) {
      return new Intl.NumberFormat(lang.value, {
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(value);
    }

    return formatValue(value, unit);
  };

  return { formatValue, formatCompact };
};
