// TUI string translation. English is the source locale; `zh` (Simplified
// Chinese) and `zht` (Traditional Chinese) override subsets of the keys and
// fall back to English for the rest.
//
// The active locale is resolved once from the environment and can be replaced
// at boot through `setLocale`, driven by the `language` TUI config. Lookups are
// synchronous so non-component modules can translate too.
import { dict as en, type Key } from "./en"
import { dict as zh } from "./zh"
import { dict as zht } from "./zht"

export type Locale = "en" | "zh" | "zht"

const dictionaries: Record<Locale, Partial<Record<Key, string>>> = { en, zh, zht }

// Maps a POSIX or BCP 47 tag ("zh_CN.UTF-8", "zh-TW", "zht") onto a supported
// locale. Chinese variants used in Taiwan, Hong Kong, and Macau, plus the Han
// script tag, resolve to Traditional Chinese.
export function parseLocale(value: string | undefined): Locale | undefined {
  if (!value?.trim()) return undefined
  const [language, region] = value
    .trim()
    .toLowerCase()
    .split(":")[0]!
    .split(".")[0]!
    .split("@")[0]!
    .replace("_", "-")
    .split("-")
  if (language === "zh") return ["tw", "hk", "mo", "hant"].includes(region ?? "") ? "zht" : "zh"
  if (language === "zht") return "zht"
  return "en"
}

export function detectLocale(environment: Readonly<Record<string, string | undefined>> = process.env): Locale {
  return (
    parseLocale(environment.OPENCODE_LANGUAGE) ??
    parseLocale(environment.LANGUAGE) ??
    parseLocale(environment.LC_ALL) ??
    parseLocale(environment.LC_MESSAGES) ??
    parseLocale(environment.LANG) ??
    "en"
  )
}

let locale = detectLocale()

// Applies a configured language. "auto" (and the empty default) defers to
// environment detection.
export function setLocale(next: string | undefined) {
  locale = next === undefined || next === "" || next === "auto" ? detectLocale() : (parseLocale(next) ?? "en")
}

export function getLocale(): Locale {
  return locale
}

// Placeholder names a template uses, so a call site must pass exactly the
// params its copy names and can not pass others.
type Placeholder<Text extends string> = Text extends `${string}{{${infer Name}}}${infer Rest}`
  ? Name | Placeholder<Rest>
  : never

type CallParams<K extends Key> =
  Placeholder<(typeof en)[K]> extends never ? [] : [params: Record<Placeholder<(typeof en)[K]>, string | number>]

export function t<K extends Key>(key: K, ...rest: CallParams<K>): string {
  const template = dictionaries[locale][key] ?? en[key]
  const params = rest[0] as Record<string, string | number> | undefined
  if (!params) return template
  return template.replace(/{{\s*([^}]+?)\s*}}/g, (_, rawKey: string) => String(params[rawKey] ?? ""))
}

export * as I18n from "./index"
