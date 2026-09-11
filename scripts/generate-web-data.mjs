import fs from 'fs';
import path from 'path';

const __dirname = process.cwd();

const YEAR_UUID_MAP = {
  '2020': '49',
  '2021': '119',
  '2022': '124',
  '2023': 'D35E0E85-CCB6-41A1-B227-7995ECD83ED5',
  '2024': '125294AE-836B-4513-B7B0-0BC5666246B0',
  '2025': '3055294D-836B-4513-B7B0-0BC5666246B0',
  '2026': '9B2E82C5-4DDF-4B9A-9459-328D8E297696',
};

const TOPIC_COLORS = {
  'essentials': ['#FF6B35', '#F7931E'],
  'app-services': ['#00D4AA', '#00A896'],
  'ai-machine-learning': ['#A855F7', '#7C3AED'],
  'graphics-games': ['#F43F5E', '#E11D48'],
  'audio-video': ['#EC4899', '#DB2777'],
  'photos-camera': ['#8B5CF6', '#6366F1'],
  'spatial-computing': ['#06B6D4', '#0891B2'],
  'developer-tools': ['#10B981', '#059669'],
  'swift': ['#F97316', '#EA580C'],
  'system-services': ['#3B82F6', '#2563EB'],
  'swiftui-ui-frameworks': ['#14B8A6', '#0D9488'],
  'design': ['#EAB308', '#CA8A04'],
  'app-store-distribution-marketing': ['#EF4444', '#DC2626'],
  'safari-web': ['#6366F1', '#4F46E5'],
  'health-fitness': ['#22C55E', '#16A34A'],
  'accessibility-inclusion': ['#F59E0B', '#D97706'],
  'business-education': ['#64748B', '#475569'],
  'privacy-security': ['#84CC16', '#65A30D'],
  'default': ['#3B82F6', '#1E40AF'],
};

function isAslSession(title) {
  return /\(ASL\)\s*$/i.test(title ?? '');
}

function isDubDubDaily(title) {
  return /^Dub Dub Daily:/i.test(title ?? '');
}

function shouldSkipWebSession(year, contentId, title) {
  const numericId = Number.parseInt(contentId, 10);
  return (
    isAslSession(title) ||
    (year === '2026' && (
      isDubDubDaily(title) ||
      (Number.isFinite(numericId) && numericId >= 8000)
    ))
  );
}

function mergeTopics(allTopics, topics) {
  for (const [tid, tinfo] of Object.entries(topics || {})) {
    if (!allTopics[tid]) {
      allTopics[tid] = {
        id: tid,
        title: tinfo.title || tid,
        color: TOPIC_COLORS[tid] || TOPIC_COLORS.default,
      };
    }
  }
}

function appendSessionsFromRaw(allSessions, yearCounts, year, raw) {
  mergeTopics(allTopicsRef, raw.topics);
  yearCounts[year] = yearCounts[year] || 0;
  for (const video of Object.values(raw.videos || {})) {
    const contentId = String(video.eventContentId ?? '');
    if (!contentId) continue;
    if (shouldSkipWebSession(year, contentId, video.title)) continue;

    allSessions.push([
      year,
      contentId,
      video.title,
      (video.description || '').substring(0, 200),
      video.primaryTopicID,
      video.webPermalink,
      (video.resources || []).length,
      (video.codeSnippets || []).length,
    ]);
    yearCounts[year]++;
  }
}

const years = ['2020', '2021', '2022', '2023', '2024', '2025', '2026'];
const allSessions = [];
const allTopicsRef = {};
const yearCounts = {};

for (const year of years) {
  const dataPath = path.join(__dirname, 'data', `wwdc${year.slice(2)}`, 'raw_data.json');
  if (!fs.existsSync(dataPath)) continue;
  const raw = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  appendSessionsFromRaw(allSessions, yearCounts, year, raw);
}

const techTalksPath = path.join(__dirname, 'data', 'tech-talks', 'raw_data.json');
if (fs.existsSync(techTalksPath)) {
  const raw = JSON.parse(fs.readFileSync(techTalksPath, 'utf8'));
  appendSessionsFromRaw(allSessions, yearCounts, 'tech-talks', raw);
}

allSessions.sort((a, b) => {
  if (a[0] !== b[0]) {
    if (a[0] === 'tech-talks') return -1;
    if (b[0] === 'tech-talks') return 1;
    return b[0].localeCompare(a[0]);
  }
  const aNum = parseInt(a[1], 10);
  const bNum = parseInt(b[1], 10);
  if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
  return a[1].localeCompare(b[1]);
});

const yearList = [
  ...(yearCounts['tech-talks'] ? ['tech-talks'] : []),
  ...years.slice().reverse(),
];

const output = {
  y: yearList,
  c: yearCounts,
  t: Object.values(allTopicsRef),
  s: allSessions,
  u: YEAR_UUID_MAP,
};

const jsonStr = JSON.stringify(output);
const outputPaths = [
  path.join(__dirname, 'web', 'sessions.json'),
  path.join(__dirname, 'web', 'src', 'content', 'sessions', 'sessions.json'),
];
for (const outputPath of outputPaths) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, jsonStr);
  console.log(`Generated ${outputPath}`);
}

console.log(`  Total sessions: ${allSessions.length}`);
console.log(`  Year counts:`, yearCounts);
console.log(`  Topics: ${output.t.length}`);
console.log(`  JSON size: ${(jsonStr.length / 1024).toFixed(1)} KB`);
