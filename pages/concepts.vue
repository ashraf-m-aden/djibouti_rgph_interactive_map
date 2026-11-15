<template>
  <div class="doc-page">
    <div class="doc-page__header">
      <h1>{{ $t('nav.concepts') }}</h1>
      <p>{{ $t('app.censusCode') }} &mdash; {{ $t('app.fullTitle') }}</p>
    </div>

    <div class="glossary-shell">
      <aside class="glossary-toc">
        <div class="glossary-toc__header">{{ $t('nav.concepts') }}</div>
        <a href="#champ">{{ $t('concepts.nav.field') }}</a>
        <a href="#definitions">{{ $t('concepts.nav.definitions') }}</a>
        <a href="#references">{{ $t('concepts.nav.references') }}</a>
      </aside>

      <div class="glossary-content">
        <p id="champ" class="lead">{{ $t('concepts.lead') }}</p>

        <h2 id="definitions" class="glossary-section-title">{{ $t('concepts.nav.definitions') }}</h2>

        <div v-for="entry in entries" :key="entry.key" class="glossary-entry">
          <span class="glossary-entry__term">{{ $t(`concepts.entries.${entry.key}.term`) }}</span>
          <span class="glossary-entry__tag">{{ $t(`themes.${entry.themeSlug}`) }}</span>
          <p class="glossary-entry__def">{{ $t(`concepts.entries.${entry.key}.def`) }}</p>
        </div>

        <h2 id="references" class="glossary-section-title">{{ $t('concepts.nav.references') }}</h2>
        <p class="glossary-references">{{ $t('concepts.referencesText') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// "Concepts et definitions" n'existait pas encore comme page (cf. AUDIT
// F-06, lien vers "#"). Page de reference statique : methodologie et
// glossaire, sans appel API (le contenu n'est pas lie a l'indicateur en
// base, c'est une definition, pas une donnee).
const entries: Array<{ key: string; themeSlug: string }> = [
  { key: 'population', themeSlug: 'demographie' },
  { key: 'menage', themeSlug: 'demographie' },
  { key: 'activite', themeSlug: 'caracteristiques-economiques' },
  { key: 'chomage', themeSlug: 'caracteristiques-economiques' },
  { key: 'alphabetisation', themeSlug: 'education' },
  { key: 'pauvrete', themeSlug: 'pauvrete' },
];
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

.glossary-shell {
  display: grid;
  grid-template-columns: 240px 1fr;
}

.glossary-toc {
  border-right: 1px solid #d7dbe6;
  background: #f8f9fc;
  padding: 18px;
}

[dir="rtl"] .glossary-toc {
  border-right: none;
  border-left: 1px solid #d7dbe6;
}

.glossary-toc__header {
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #5b6478;
  font-weight: 700;
  margin-bottom: 10px;
}

.glossary-toc a {
  display: block;
  padding: 6px 0;
  font-size: 0.82rem;
  color: #5b6478;
  text-decoration: none;
}

.glossary-toc a:hover {
  color: #00185f;
}

.glossary-content {
  padding: 28px 36px 34px;
  max-width: 640px;
}

.glossary-content .lead {
  font-size: 0.95rem;
  line-height: 1.65;
  color: #10131c;
  margin: 0 0 8px;
}

.glossary-section-title {
  font-family: 'Source Serif 4', Georgia, serif;
  font-size: 1.1rem;
  font-weight: 600;
  color: #10131c;
  margin: 32px 0 18px;
}

.glossary-entry {
  margin-bottom: 22px;
  padding-bottom: 18px;
  border-bottom: 1px solid #d7dbe6;
}

.glossary-entry:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.glossary-entry__term {
  font-family: 'Source Serif 4', Georgia, serif;
  font-size: 1.05rem;
  font-weight: 700;
  color: #10131c;
}

.glossary-entry__tag {
  font-size: 0.65rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #5b6478;
  margin-left: 8px;
  font-weight: 500;
  font-family: 'Public Sans', sans-serif;
}

[dir="rtl"] .glossary-entry__tag {
  margin-left: 0;
  margin-right: 8px;
}

.glossary-entry__def {
  margin: 6px 0 0;
  font-size: 0.88rem;
  line-height: 1.6;
  color: #10131c;
}

.glossary-references {
  font-size: 0.85rem;
  color: #5b6478;
  line-height: 1.6;
}

@media (max-width: 760px) {
  .glossary-shell {
    grid-template-columns: 1fr;
  }

  .glossary-toc {
    border-right: none;
    border-bottom: 1px solid #d7dbe6;
  }
}
</style>
