import * as Localization from 'expo-localization'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en'
import ru from './locales/ru'

const locale = Localization.getLocales()[0]?.languageCode ?? 'en'
const language = locale.startsWith('ru') ? 'ru' : 'en'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ru: { translation: ru },
      en: { translation: en },
    },
    lng: language, // дефолт (можешь потом автоопределение сделать)
    fallbackLng: 'en',

    interpolation: {
      escapeValue: false,
    },
  })

export default i18n