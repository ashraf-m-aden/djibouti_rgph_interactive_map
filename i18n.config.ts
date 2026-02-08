import fr from './locales/fr.json'
import ar from './locales/ar.json'
import en from './locales/en.json'

export default defineI18nConfig(() => ({
  legacy: false,
  locale: 'fr',
  fallbackLocale: 'fr',
  messages: { fr, ar, en },
}))
