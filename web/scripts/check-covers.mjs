import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sessionsJson from "../src/content/sessions/sessions.json" with { type: "json" };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const articlesDir = path.join(rootDir, "src/content/articles");
const sessionsDir = path.join(rootDir, "public/images/sessions");
const publicDir = path.join(rootDir, "public");

function walk(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...walk(full));
    } else if (entry.isFile() && entry.name.endsWith(".mdx")) {
      result.push(full);
    }
  }
  return result;
}

function extractFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  return match ? match[1] : "";
}

function getThumbnail(frontmatter) {
  const match = frontmatter.match(/^thumbnail:\s*(.+)$/m);
  if (!match) return null;
  return match[1].trim().replace(/^['"]|['"]$/g, "");
}

const files = walk(articlesDir);
const renderedArticleSlugs = new Set(
  files.map((file) => path.basename(file, path.extname(file))),
);
const referencedThumbnails = new Set();
const missing = [];

for (const file of files) {
  const frontmatter = extractFrontmatter(file);
  const thumbnail = getThumbnail(frontmatter);
  const rel = path.relative(articlesDir, file);

  if (!thumbnail) {
    missing.push({ file: rel, reason: "missing thumbnail field" });
    continue;
  }

  referencedThumbnails.add(thumbnail);

  const imagePath = path.join(publicDir, thumbnail);
  if (!fs.existsSync(imagePath)) {
    missing.push({ file: rel, reason: `missing image file: ${thumbnail}` });
  }
}

function isAslSession(title) {
  return /\(ASL\)\s*$/i.test(title);
}

function isDubDubDaily(title) {
  return /^Dub Dub Daily:/i.test(title);
}

function isExcludedSession(session) {
  const contentId = Number.parseInt(session[1], 10);
  return (
    isAslSession(session[2]) ||
    (session[0] === "2026" &&
      (isDubDubDaily(session[2]) || (Number.isFinite(contentId) && contentId >= 8000)))
  );
}

const sessionsByYear = {};
for (const s of sessionsJson.s) {
  if (isExcludedSession(s)) continue;
  const year = s[0];
  const contentId = s[1];
  const articleSlug =
    year === "tech-talks" ? `tech-talks-${contentId}` : `wwdc${year}-${contentId}`;
  if (!renderedArticleSlugs.has(articleSlug)) continue;

  sessionsByYear[year] = sessionsByYear[year] || new Set();
  sessionsByYear[year].add(contentId);
}

const missingSessionCovers = [];
const extraSessionCovers = [];

for (const year of Object.keys(sessionsByYear).sort()) {
  const expectedIds = sessionsByYear[year];
  const yearDir = path.join(sessionsDir, year);
  const existingIds = new Set();

  if (fs.existsSync(yearDir)) {
    for (const entry of fs.readdirSync(yearDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith(".jpg")) {
        existingIds.add(entry.name.replace(/\.jpg$/, ""));
      }
    }
  }

  for (const id of expectedIds) {
    if (!existingIds.has(id)) {
      missingSessionCovers.push({ year, id });
    }
  }

  for (const id of existingIds) {
    const imagePath = `/images/sessions/${year}/${id}.jpg`;
    if (!expectedIds.has(id) && !referencedThumbnails.has(imagePath)) {
      extraSessionCovers.push({ year, id });
    }
  }
}

const hasErrors = missing.length > 0 || missingSessionCovers.length > 0;
const hasWarnings = extraSessionCovers.length > 0;

if (missing.length > 0) {
  console.error(`❌ ${missing.length} article(s) have missing covers:`);
  for (const item of missing) {
    console.error(`  - ${item.file}: ${item.reason}`);
  }
}

if (missingSessionCovers.length > 0) {
  console.error(
    `❌ ${missingSessionCovers.length} session card(s) have missing covers:`,
  );
  for (const item of missingSessionCovers) {
    console.error(`  - /images/sessions/${item.year}/${item.id}.jpg`);
  }
}

if (extraSessionCovers.length > 0) {
  console.warn(
    `⚠️ ${extraSessionCovers.length} session cover image(s) are not referenced by any session:`,
  );
  for (const item of extraSessionCovers) {
    console.warn(`  - /images/sessions/${item.year}/${item.id}.jpg`);
  }
}

if (hasErrors) {
  process.exit(1);
}

const renderedSessionCount = Object.values(sessionsByYear).reduce(
  (sum, set) => sum + set.size,
  0,
);
console.log(
  `✅ All ${files.length} articles and ${renderedSessionCount} session cards have valid covers.`,
);
