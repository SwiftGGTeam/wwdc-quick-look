import { defaultLang } from "./routing";
import type { LangCode } from "./routing";

export interface ArticlesLocale {
  documentTitle: string;
  documentDescription: string;
  brandLabel: string;
  navArticles: string;
  navSkill: string;
  searchPlaceholder: string;
  filterYear: string;
  filterTopic: string;
  filterAll: string;
  filterAllTopics: string;
  contentTitleAll: string;
  contentTitleSearch: string;
  contentTitleYearTopic: string;
  contentTitleYear: string;
  contentTitleTopic: string;
  sessionCount: string;
  emptyTitle: string;
  emptyDesc: string;
  footer: string;
  mobileFilters: string;
  cardResources: string;
  cardCode: string;
  loading: string;
  watchVideo: string;
  commentsTitle: string;
}

export const articlesI18n: Record<LangCode, ArticlesLocale> = {
  zh: {
    documentTitle: "WWDC Quick Look · Session 浏览器",
    documentDescription: "按年份、主题或关键词浏览 WWDC sessions。",
    brandLabel: "WWDC Quick Look",
    navArticles: "文章",
    navSkill: "技能",
    searchPlaceholder: "搜索 Session...",
    filterYear: "年份",
    filterTopic: "主题",
    filterAll: "全部",
    filterAllTopics: "全部主题",
    contentTitleAll: "全部 Session",
    contentTitleSearch: '搜索: "{query}"',
    contentTitleYearTopic: "{eventLabel} · {topic}",
    contentTitleYear: "{eventLabel}",
    contentTitleTopic: "{topic}",
    sessionCount: "{count} 个 Session",
    emptyTitle: "未找到 Session",
    emptyDesc: "尝试调整筛选条件或搜索关键词。",
    footer: "数据来源于 Apple Developer · 由 SwiftGG Team 构建",
    mobileFilters: "筛选",
    cardResources: "资源",
    cardCode: "代码",
    loading: "加载中...",
    watchVideo: "观看原视频",
    commentsTitle: "评论",
  },
  en: {
    documentTitle: "WWDC Quick Look · Session Browser",
    documentDescription: "Browse WWDC sessions by year, topic, or search.",
    brandLabel: "WWDC Quick Look",
    navArticles: "Articles",
    navSkill: "Skill",
    searchPlaceholder: "Search sessions...",
    filterYear: "Year",
    filterTopic: "Topic",
    filterAll: "All",
    filterAllTopics: "All Topics",
    contentTitleAll: "All Sessions",
    contentTitleSearch: 'Search: "{query}"',
    contentTitleYearTopic: "{eventLabel} · {topic}",
    contentTitleYear: "{eventLabel}",
    contentTitleTopic: "{topic}",
    sessionCount: "{count} sessions",
    emptyTitle: "No sessions found",
    emptyDesc: "Try adjusting your filters or search query.",
    footer: "Data from Apple Developer · Built by SwiftGG Team",
    mobileFilters: "Filters",
    cardResources: "resources",
    cardCode: "code snippets",
    loading: "Loading...",
    watchVideo: "Watch original video",
    commentsTitle: "Comments",
  },
  ja: {
    documentTitle: "WWDC Quick Look · セッションブラウザ",
    documentDescription: "年、トピック、検索で WWDC セッションを閲覧できます。",
    brandLabel: "WWDC Quick Look",
    navArticles: "記事",
    navSkill: "スキル",
    searchPlaceholder: "セッションを検索...",
    filterYear: "年",
    filterTopic: "トピック",
    filterAll: "すべて",
    filterAllTopics: "すべてのトピック",
    contentTitleAll: "すべてのセッション",
    contentTitleSearch: '検索: "{query}"',
    contentTitleYearTopic: "{eventLabel} · {topic}",
    contentTitleYear: "{eventLabel}",
    contentTitleTopic: "{topic}",
    sessionCount: "{count} セッション",
    emptyTitle: "セッションが見つかりません",
    emptyDesc: "フィルターや検索キーワードを調整してみてください。",
    footer: "データ提供: Apple Developer · 構築: SwiftGG Team",
    mobileFilters: "フィルター",
    cardResources: "リソース",
    cardCode: "コード",
    loading: "読み込み中...",
    watchVideo: "元の動画を見る",
    commentsTitle: "コメント",
  },
} as const;

export function getArticlesLocale(lang: LangCode): ArticlesLocale {
  return articlesI18n[lang] ?? articlesI18n[defaultLang];
}

export function formatArticleTemplate(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_match, key) => String(values[key] ?? ""));
}

export type Lang = LangCode;
export type I18NStrings = typeof articlesI18n;

// Compatibility exports for existing components.
export const I18N = articlesI18n;
export const articlesDefaultLang: Lang = defaultLang;
export type ArticlesLangCode = Lang;
