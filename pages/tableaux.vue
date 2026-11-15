<template>
  <div class="doc-page">
    <div class="doc-page__header">
      <h1>{{ $t('nav.tables') }}</h1>
      <p>{{ $t('app.censusCode') }} &mdash; {{ $t('app.fullTitle') }}</p>
    </div>

    <div v-if="loadingNav" class="doc-page__state">
      <p>{{ $t('common.loading') }}</p>
    </div>

    <div v-else-if="themeGroups.length === 0" class="doc-page__state">
      <p>{{ $t('common.noData') }}</p>
    </div>

    <div v-else class="table-shell">
      <aside class="table-nav">
        <template v-for="group in themeGroups" :key="group.slug">
          <div class="table-nav__header">{{ group.name }}</div>
          <ul>
            <li
              v-for="indicator in group.indicators"
              :key="indicator.code"
              :class="{ 'is-active': indicator.code === selectedCode }"
              @click="selectIndicator(indicator.code)"
            >
              {{ indicator.name }}
            </li>
          </ul>
        </template>
      </aside>

      <div class="table-panel">
        <div class="table-panel__top">
          <div>
            <h2>{{ selectedName }}</h2>
            <p>{{ $t('app.censusCode') }}</p>
          </div>
          <button class="btn-outline" :disabled="!hasRows" @click="downloadCsv">
            {{ $t('common.download') }} (CSV)
          </button>
        </div>

        <div v-if="loadingTable" class="doc-page__state">
          <p>{{ $t('common.loading') }}</p>
        </div>

        <div v-else-if="!hasRows" class="doc-page__state">
          <p>{{ $t('errors.indicatorNoData') }}</p>
        </div>

        <div v-else class="data-table-scroll">
          <table class="data-table">
          <thead>
            <tr>
              <th>{{ $t('common.regions') }}</th>
              <th class="num">{{ $t('common.value') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.code">
              <td>{{ row.name }}</td>
              <td class="num">{{ row.display }}</td>
            </tr>
          </tbody>
          <tfoot v-if="totalDisplay !== null">
            <tr>
              <td>{{ $t('common.total') }}</td>
              <td class="num">{{ totalDisplay }}</td>
            </tr>
          </tfoot>
        </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// "Tableaux" n'existait pas encore comme page (cf. AUDIT F-06, lien vers
// "#"). Reutilise les endpoints deja employes par la carte et les pages
// region/theme (getTheme, getMapData) : aucune nouvelle route backend.
import type { IndicatorMeta, Theme, Unit } from '~/types/api';

const { getLocalizedName } = useLocalizedContent();
const { formatValue } = useValueFormat();
const { locale, t } = useI18n();

interface IndicatorEntry {
  code: string;
  name: string;
  unit?: Unit;
}

interface ThemeGroup {
  slug: string;
  name: string;
  indicators: IndicatorEntry[];
}

const loadingNav = ref(true);
const loadingTable = ref(false);
const themeGroups = ref<ThemeGroup[]>([]);
const selectedCode = ref<string | null>(null);
const selectedName = ref('');

interface RowEntry {
  code: string;
  name: string;
  value: number | null;
  display: string;
}

const rows = ref<RowEntry[]>([]);
const rowsUnit = ref<Unit | undefined>(undefined);

const hasRows = computed(() => rows.value.length > 0);

const totalDisplay = computed(() => {
  if (rowsUnit.value !== 'number' || rows.value.length === 0) return null;
  const values = rows.value.map((r) => r.value).filter((v): v is number => typeof v === 'number');
  if (values.length === 0) return null;
  return formatValue(values.reduce((a, b) => a + b, 0), 'number');
});

const loadIndicatorTable = async (code: string) => {
  loadingTable.value = true;
  rows.value = [];

  try {
    const api = useApi();
    const response = await api.getMapData(code, { level: 'region' });
    if (response?.success && response.data) {
      const unit = (response.data.mapData.find((e) => e.unit)?.unit as Unit) ?? undefined;
      rowsUnit.value = unit;
      rows.value = response.data.mapData.map((entry) => ({
        code: entry.regionCode,
        name: getLocalizedName(entry.regionName, entry.regionCode),
        value: entry.value,
        display: formatValue(entry.value, unit),
      }));
    }
  } catch (error) {
    console.error(`Error loading table data for ${code}:`, error);
  } finally {
    loadingTable.value = false;
  }
};

const selectIndicator = (code: string) => {
  const found = themeGroups.value.flatMap((g) => g.indicators).find((i) => i.code === code);
  if (!found) return;
  selectedCode.value = code;
  selectedName.value = found.name;
  loadIndicatorTable(code);
};

const loadNav = async () => {
  loadingNav.value = true;

  try {
    const api = useApi();
    const themesResponse = await api.getThemes();
    const themes: Theme[] = themesResponse?.success && Array.isArray(themesResponse.data)
      ? themesResponse.data
      : [];

    const groups = await Promise.all(
      themes.map(async (theme) => {
        try {
          const detail = await api.getTheme(theme.slug);
          const metas: IndicatorMeta[] = detail?.success && detail.data?.indicators ? detail.data.indicators : [];
          const indicators = metas
            .filter((m) => m.hasRegionalData)
            .map((m) => ({ code: m.code, name: getLocalizedName(m.name, m.code), unit: m.unit }));
          return { slug: theme.slug, name: getLocalizedName(theme.name), indicators };
        } catch (error) {
          console.error(`Error loading indicators for theme ${theme.slug}:`, error);
          return { slug: theme.slug, name: getLocalizedName(theme.name), indicators: [] };
        }
      }),
    );

    themeGroups.value = groups.filter((g) => g.indicators.length > 0);

    const first = themeGroups.value[0]?.indicators[0];
    if (first) selectIndicator(first.code);
  } catch (error) {
    console.error('Error loading tables navigation:', error);
    themeGroups.value = [];
  } finally {
    loadingNav.value = false;
  }
};

const downloadCsv = () => {
  if (typeof document === 'undefined' || !hasRows.value) return;

  const quote = (cell: string | number | null) => `"${String(cell ?? '').replace(/"/g, '""')}"`;
  const header = [t('common.regions'), t('common.value')].map(quote).join(';');
  const body = rows.value.map((r) => [r.name, r.value ?? ''].map(quote).join(';'));

  // BOM : sans lui Excel lit le CSV en ANSI et casse les accents.
  const csv = `﻿${[header, ...body].join('\r\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `rgph2024-${(selectedName.value || 'table').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

onMounted(loadNav);
watch(locale, loadNav);
</script>

<style scoped>
.doc-page {
  border: 1px solid #d7dbe6;
  margin: 24px;
  background: white;
}

.doc-page__header {
  padding: 26px 32px;
  border-bottom: 1px solid #d7dbe6;
  background: #f8f9fc;
}

.doc-page__header h1 {
  font-family: 'Source Serif 4', Georgia, serif;
  font-size: 1.6rem;
  font-weight: 600;
  color: #10131c;
  margin: 0 0 4px;
}

.doc-page__header p {
  margin: 0;
  font-size: 0.82rem;
  color: #5b6478;
}

.doc-page__state {
  padding: 3rem;
  text-align: center;
  color: #5b6478;
}

.table-shell {
  display: grid;
  grid-template-columns: 260px 1fr;
}

.table-nav {
  border-right: 1px solid #d7dbe6;
  background: #f8f9fc;
}

.table-nav__header {
  padding: 14px 18px 8px;
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #5b6478;
  font-weight: 700;
}

.table-nav ul {
  list-style: none;
  margin: 0;
  padding: 0 0 14px;
}

.table-nav li {
  padding: 9px 18px;
  font-size: 0.82rem;
  border-left: 3px solid transparent;
  cursor: pointer;
  color: #10131c;
}

.table-nav li:hover {
  background: white;
}

.table-nav li.is-active {
  background: #e6e9f2;
  border-left-color: #00185f;
  font-weight: 600;
  color: #00185f;
}

.table-panel {
  padding: 22px 26px 28px;
}

.table-panel__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  gap: 16px;
}

.table-panel__top h2 {
  font-family: 'Source Serif 4', Georgia, serif;
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 4px;
  color: #10131c;
}

.table-panel__top p {
  margin: 0;
  font-size: 0.78rem;
  color: #5b6478;
}

.btn-outline {
  border: 1px solid #00185f;
  background: white;
  color: #00185f;
  font-family: 'Public Sans', sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 9px 16px;
  cursor: pointer;
  white-space: nowrap;
}

.btn-outline:hover:not(:disabled) {
  background: #e6e9f2;
}

.btn-outline:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.data-table-scroll {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.data-table thead th {
  background: #e6e9f2;
  color: #00185f;
  text-align: left;
  padding: 10px 14px;
  font-size: 0.68rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  border-bottom: 1px solid #d7dbe6;
}

.data-table thead th.num,
.data-table td.num {
  text-align: right;
  font-family: 'IBM Plex Mono', ui-monospace, monospace;
  font-variant-numeric: tabular-nums;
}

.data-table td {
  padding: 9px 14px;
  border-bottom: 1px solid #d7dbe6;
  color: #10131c;
}

.data-table tbody tr:hover td {
  background: #f8f9fc;
}

.data-table tfoot td {
  font-weight: 700;
  border-top: 2px solid #00185f;
  border-bottom: none;
  background: #f8f9fc;
}

@media (max-width: 760px) {
  .table-shell {
    grid-template-columns: 1fr;
  }

  .table-nav {
    border-right: none;
    border-bottom: 1px solid #d7dbe6;
  }

  .doc-page {
    margin: 12px;
  }

  .doc-page__header {
    padding: 18px 20px;
  }

  .table-panel__top {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
