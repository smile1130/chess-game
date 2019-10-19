import { Plugins } from '@capacitor/core'
import { Locale } from 'date-fns'
import formatDistanceStrict from 'date-fns/esm/formatDistanceStrict'
import formatRelative from 'date-fns/esm/formatRelative'
import addSeconds from 'date-fns/esm/addSeconds'
import settings from './settings'
import { getLanguageNativeName } from './utils/langs'

type Quantity = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other'

const refFile = 'refs.js'

const defaultCode = 'en-US'
const englishMessages: StringMap = {}
const dateFormatOpts = { day: '2-digit', month: 'long', year: 'numeric' }
const dateTimeFormatOpts = { ...dateFormatOpts, hour: '2-digit', minute: '2-digit' }

let currentLocale: string = defaultCode
let dateLocale: Locale | undefined
let messages: StringMap = {} as StringMap
let numberFormat: Intl.NumberFormat = new Intl.NumberFormat()
let dateFormat: Intl.DateTimeFormat = new Intl.DateTimeFormat(undefined, dateFormatOpts)
let dateTimeFormat: Intl.DateTimeFormat = new Intl.DateTimeFormat(undefined, dateTimeFormatOpts)

export default function i18n(key: string, ...args: Array<string | number>): string {
  const str = messages[key] || untranslated[key]
  return str ? format(str, ...args) : key
}

export function plural(key: string, count: number, ...args: Array<string | number>): string {
  const pluralKey = key + ':' + quantity(currentLocale, count)
  const str = messages[pluralKey] || messages[key]
  return str ? format(str, ...args) : key
}

function format(message: string, ...args: Array<string | number>): string {
  let str = message
  if (args.length) {
    if (str.includes('$s')) {
      for (let i = 1; i < 4; i++) {
        str = str.replace('%' + i + '$s', String(args[i - 1]))
      }
    }
    args.forEach(arg => {
      str = str.replace('%s', String(arg))
    })
  }
  return str
}

export function formatNumber(n: number): string {
  return numberFormat.format(n)
}

export function formatDate(d: Date): string {
  return dateFormat.format(d)
}

export function formatDateTime(d: Date): string {
  return dateTimeFormat.format(d)
}

export function formatDuration(duration: Seconds): string {
  const epoch = new Date(0)
  return formatDistanceStrict(
    epoch,
    addSeconds(epoch, duration),
    { locale: dateLocale },
  )
}

export function fromNow(date: Date): string {
  return formatRelative(date, new Date(), {
    locale: dateLocale
  })
}

export function getIsoCodeFromLocale(locale: string): string {
  return locale.split('-')[0]
}

export function getCurrentLocale(): string {
  return currentLocale
}

/*
 * Call this once during app init.
 * Load english messages, they must always be there.
 * Load either lang stored as a setting or default app language.
 * It is called during app initialization, when we don't know yet server lang
 * preference.
 */
export function init(): Promise<string> {

  // must use concat with defaultCode const to force runtime module resolution
  const englishPromise = import('./i18n/' + defaultCode + '.js')
  .then(({ default: data }) => {
    Object.assign(englishMessages, data)
  })

  const fromSettings = settings.general.lang()
  if (fromSettings) {
    return englishPromise.then(() => loadLanguage(fromSettings))
  }

  return englishPromise
  .then(() => Plugins.Device.getLanguageCode())
  .then(({ value }) => loadLanguage(value))
}

export function getAvailableLanguages(): Promise<ReadonlyArray<[string, string]>> {
  return getAvailableLocales()
  .then(locales => locales.map(l => {
      return [
        l,
        getLanguageNativeName(getIsoCodeFromLocale(l))
      ]
    })
  )
}

function getAvailableLocales(): Promise<ReadonlyArray<string>> {
  // must use this const to force module resolution at runtime
  return import('./i18n/' + refFile).then(({ default: data }) => data)
}

export function ensureLocaleIsAvailable(locale: string): Promise<string> {
  return new Promise((resolve, reject) => {
    getAvailableLocales()
    .then(locales => {
      const l = locales.find(l => l === locale)
      if (l !== undefined) resolve(l)
      else reject(new Error(`locale ${l} is not available in the application.`))
    })
  })
}

export function loadLanguage(lang: string): Promise<string> {
  return loadFile(lang)
  .then(code => {
    settings.general.lang(code)
    return loadDateLocale(code)
  })
}

function loadFile(code: string): Promise<string> {
  return getAvailableLocales()
  .then(locales => {
    return locales.find(l =>
      getIsoCodeFromLocale(l) === getIsoCodeFromLocale(code)
    ) || defaultCode
  })
  .then(availCode => {
    console.info('Load language', availCode)
    return import('./i18n/' + availCode + '.js')
    .then(({ default: data }) => {
      currentLocale = availCode
      // some translation files don't have all the keys, merge with english
      // messages to keep a fallback to english
      messages = {
        ...englishMessages,
        ...data,
      }
      numberFormat = new Intl.NumberFormat(availCode)
      dateFormat = new Intl.DateTimeFormat(availCode, dateFormatOpts)
      dateTimeFormat = new Intl.DateTimeFormat(availCode, dateTimeFormatOpts)
      return availCode
    })
  })
}

// supported date-fns locales with region
const supportedDateLocales = ['ar-DZ', 'ar-SA', 'en-CA', 'en-GB', 'en-US', 'fa-IR', 'fr-CH', 'nl-BE', 'pt-BR', 'zh-CN', 'zh-TW']

function loadDateLocale(code: string): Promise<string> {
  if (code === defaultCode) return Promise.resolve(code)

  const lCode = supportedDateLocales.includes(code) ? code : getIsoCodeFromLocale(code)
  return import(`./i18n/date/${lCode}.js`)
  .then(module => {
    dateLocale = module.default || undefined
    return code
  })
  .catch(() => {
    dateLocale = undefined
    return code
  })
}

function quantity(l: string, c: number): Quantity {
  const rem100 = c % 100
  const rem10 = c % 10
  switch (l) {
    // french
    case 'fr':
    case 'ff':
    case 'kab':
      return c < 2 ? 'one' : 'other'
    // czech
    case 'cs':
    case 'sk':
      if (c === 1) return 'one'
      else if (c >= 2 && c <= 4) return 'few'
      else return 'other'
    // balkan
    case 'hr':
    case 'ru':
    case 'sr':
    case 'uk':
    case 'be':
    case 'bs':
    case 'sh':
      if (rem10 === 1 && rem100 !== 11) return 'one'
      else if (rem10 >= 2 && rem10 <= 4 && !(rem100 >= 12 && rem100 <= 14)) return 'few'
      else if (rem10 === 0 || (rem10 >= 5 && rem10 <= 9) || (rem100 >= 11 && rem100 <= 14)) return 'many'
      else return 'other'
    // latvian
    case 'lv':
      if (c === 0) return 'zero'
      else if (c % 10 === 1 && c % 100 !== 11) return 'one'
      else return 'other'
    // lithuanian
    case 'lt':
      if (rem10 === 1 && !(rem100 >= 11 && rem100 <= 19)) return 'one'
      else if (rem10 >= 2 && rem10 <= 9 && !(rem100 >= 11 && rem100 <= 19)) return 'few'
      else return 'other'
    // polish
    case 'pl':
      if (c === 1) return 'one'
      else if (rem10 >= 2 && rem10 <= 4 && !(rem100 >= 12 && rem100 <= 14)) return 'few'
      else return 'other'
    // romanian
    case 'ro':
    case 'mo':
      if (c === 1) return 'one'
      else if ((c === 0 || (rem100 >= 1 && rem100 <= 19))) return 'few'
      else return 'other'
    // slovenian
    case 'sl':
      if (rem100 === 1) return 'one'
      else if (rem100 === 2) return 'two'
      else if (rem100 >= 3 && rem100 <= 4) return 'few'
      else return 'other'
    // arabic
    case 'ar':
      if (c === 0) return 'zero'
      else if (c === 1) return 'one'
      else if (c === 2) return 'two'
      else if (rem100 >= 3 && rem100 <= 10) return 'few'
      else if (rem100 >= 11 && rem100 <= 99) return 'many'
      else return 'other'
    // macedonian
    case 'mk':
      return (c % 10 === 1 && c !== 11) ? 'one' : 'other'
    // welsh
    case 'cy':
    case 'br':
      if (c === 0) return 'zero'
      else if (c === 1) return 'one'
      else if (c === 2) return 'two'
      else if (c === 3) return 'few'
      else if (c === 6) return 'many'
      else return 'other'
    // maltese
    case 'mt':
      if (c === 1) return 'one'
      else if (c === 0 || (rem100 >= 2 && rem100 <= 10)) return 'few'
      else if (rem100 >= 11 && rem100 <= 19) return 'many'
      else return 'other'
    // two
    case 'ga':
    case 'se':
    case 'sma':
    case 'smi':
    case 'smj':
    case 'smn':
    case 'sms':
      if (c === 1) return 'one'
      else if (c === 2) return 'two'
      else return 'other'
    // zero
    case 'ak':
    case 'am':
    case 'bh':
    case 'fil':
    case 'tl':
    case 'guw':
    case 'hi':
    case 'ln':
    case 'mg':
    case 'nso':
    case 'ti':
    case 'wa':
      return (c === 0 || c === 1) ? 'one' : 'other'
    // none
    case 'az':
    case 'bm':
    case 'fa':
    case 'ig':
    case 'hu':
    case 'ja':
    case 'kde':
    case 'kea':
    case 'ko':
    case 'my':
    case 'ses':
    case 'sg':
    case 'to':
    case 'tr':
    case 'vi':
    case 'wo':
    case 'yo':
    case 'zh':
    case 'bo':
    case 'dz':
    case 'id':
    case 'jv':
    case 'ka':
    case 'km':
    case 'kn':
    case 'ms':
    case 'th':
    case 'tp':
    case 'io':
    case 'ia':
      return 'other'
    default:
      return c === 1 ? 'one' : 'other'
  }
}

const untranslated: StringMap = {
  apiUnsupported: 'Your version of lichess app is too old! Please upgrade for free to the latest version.',
  apiDeprecated: 'Upgrade for free to the latest lichess app! Support for this version will be dropped on %s.',
  resourceNotFoundError: 'Resource not found.',
  lichessIsUnavailableError: 'lichess.org is temporarily down for maintenance.',
  lichessIsUnreachable: 'lichess.org is unreachable.',
  mustSignIn: 'You must sign in to see this.',
  mustSignInToJoin: 'You must sign in to join it.',
  boardThemeBrown: 'Brown',
  boardThemeBlue: 'Blue',
  boardThemeGreen: 'Green',
  boardThemeGrey: 'Grey',
  boardThemePurple: 'Purple',
  boardThemeWood: 'Wood',
  boardThemeWood2: 'Wood 2',
  boardThemeWood3: 'Wood 3',
  boardThemeMaple: 'Maple',
  boardThemeBlue2: 'Blue 2',
  boardThemeCanvas: 'Canvas',
  boardThemeMetal: 'Metal',
  bgThemeDark: 'Dark',
  bgThemeLight: 'Light',
  bgThemeWood: 'Wood',
  bgThemeShapes: 'Shapes',
  bgThemeAnthracite: 'Anthracite',
  bgThemeBlueMaze: 'Blue maze',
  bgThemeGreenMaze: 'Green maze',
  bgThemeRedMaze: 'Red maze',
  bgThemeGreenCheckerboard: 'Checkerboard',
  bgThemeCrackedEarth: 'Earth',
  bgThemeVioletSpace: 'Space',
  playerisInvitingYou: '%s is inviting you',
  toATypeGame: 'To a %s game',
  unsupportedVariant: 'Variant %s is not supported in this version',
  language: 'Language',
  notesSynchronizationHasFailed: 'Notes synchronization with lichess has failed, please try later.',
  challengeDeclined: 'Challenge declined',
  youAreChallenging: 'You are challenging %s',
  submitMove: 'Submit move',
  returnToHome: 'Return to home',
  enableLocalComputerEvaluation: 'Enable local computer evaluation',
  localEvalCaution: 'Caution: intensive usage will drain battery.',
  showBestMove: 'Show computer best move',
  followers: 'Followers',
  userAcceptsYourChallenge: '%s accepts your challenge!',
  incorrectThreefoldClaim: 'Incorrect threefold repetition claim.',
  notifications: 'Notifications',
  vibrationOnNotification: 'Vibrate on notification',
  soundOnNotification: 'Play sound on notification',
  vibrateOnGameEvents: 'Vibrate on game events',
  soundAndNotifications: 'Sound and notifications',
  usernameStartNoNumber: 'The username must not start with a number',
  usernameUnacceptable: 'This username is not acceptable',
  usernameInvalid: 'The username contains invalid characters',
  offline: 'Offline'
}
