import sessionsJson from "./sessions.json";

export interface Session {
  year: string;
  contentId: string;
  title: string;
  description: string;
  primaryTopic: string;
  permalink: string;
  resources: number;
  codeSnippets: number;
}

export interface Topic {
  id: string;
  title: string;
  color: [string, string];
}

export interface SessionData {
  y: string[];
  c: Record<string, number>;
  t: Topic[];
  s: Array<[
    string, // year
    string, // contentId
    string, // title
    string, // description
    string, // primaryTopic
    string, // permalink
    number, // resources
    number  // codeSnippets
  ]>;
}

const DATA = sessionsJson as unknown as SessionData;

function isAslSession(title: string): boolean {
  return /\(ASL\)\s*$/i.test(title);
}

function isDubDubDaily(title: string): boolean {
  return /^Dub Dub Daily:/i.test(title);
}

function isExcludedGeneratedSession(session: Pick<Session, "year" | "contentId" | "title">): boolean {
  const contentId = Number.parseInt(session.contentId, 10);
  return (
    isAslSession(session.title) ||
    (session.year === "2026" && (
      isDubDubDaily(session.title) ||
      (Number.isFinite(contentId) && contentId >= 8000)
    ))
  );
}

export const years = DATA.y;
export const topics = DATA.t;
export const sessions: Session[] = DATA.s
  .map((s) => ({
    year: s[0],
    contentId: s[1],
    title: s[2],
    description: s[3],
    primaryTopic: s[4],
    permalink: s[5],
    resources: s[6],
    codeSnippets: s[7],
  }))
  .filter((s) => !isExcludedGeneratedSession(s));

export const yearCounts: Record<string, number> = Object.fromEntries(
  years.map((year) => [year, sessions.filter((s) => s.year === year).length]),
);
const topicColorMap: Record<string, [string, string]> = {};
topics.forEach((t) => {
  topicColorMap[t.id] = t.color;
});

export function getGradient(topicId: string): string {
  const c = topicColorMap[topicId] || ["#667eea", "#764ba2"];
  return `linear-gradient(135deg, ${c[0]} 0%, ${c[1]} 100%)`;
}

export function isTechTalksEvent(year: string): boolean {
  return year === "tech-talks";
}

export function getEventLabel(year: string): string {
  return isTechTalksEvent(year) ? "Tech Talks" : `WWDC${year.slice(2)}`;
}

export function getArticleSlug(session: Pick<Session, "year" | "contentId">): string {
  return isTechTalksEvent(session.year)
    ? `tech-talks-${session.contentId}`
    : `wwdc${session.year}-${session.contentId}`;
}

export function getThumbnailUrl(session: Session): string {
  return `/images/sessions/${session.year}/${session.contentId}.jpg`;
}
