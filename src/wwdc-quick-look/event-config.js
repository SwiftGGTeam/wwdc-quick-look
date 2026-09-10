import path from 'node:path';

function defaultDisplayName(eventId, twoDigitYear) {
  if (eventId === 'tech-talks') return 'Tech Talks';
  if (/^wwdc\d{4}$/i.test(eventId)) return `WWDC${twoDigitYear}`;
  return eventId;
}

export function createEventConfig(options = {}) {
  const year = String(options.year ?? new Date().getFullYear());
  const twoDigitYear = year.slice(-2);
  const eventId = options.eventId ?? `wwdc${year}`;
  const eventShort = options.eventShort ?? (eventId.startsWith('wwdc') ? `wwdc${twoDigitYear}` : eventId);
  const displayName = options.displayName ?? defaultDisplayName(eventId, twoDigitYear);
  const locale = options.locale ?? 'en';
  const projectRoot = path.resolve(options.projectRoot ?? process.cwd());
  const dataRoot = path.resolve(options.dataRoot ?? path.join(projectRoot, 'years', year));
  const rawDir = path.join(dataRoot, 'raw');
  const processedDir = path.join(dataRoot, 'processed');

  return {
    year,
    eventId,
    eventShort,
    displayName,
    locale,
    projectRoot,
    dataRoot,
    rawDir,
    processedDir,
    rawDataPath: path.join(rawDir, 'raw_data.json'),
    splitDir: path.join(rawDir, 'jsons'),
    videoJsonDir: path.join(rawDir, 'jsons', 'videos'),
    transcriptsDir: path.join(rawDir, 'transcripts-en'),
    topicsAndVideosPath: path.join(rawDir, 'topics_and_videos.json'),
    sessionsOutputDir: path.join(processedDir, 'sessions'),
    indexPath: path.join(processedDir, 'index.md'),
    collectionUrl: options.collectionUrl ?? `https://developer.apple.com/videos/${eventId}/`,
    videoUrlTemplate: options.videoUrlTemplate ?? 'https://developer.apple.com/videos/play/{eventId}/{sessionCode}/'
  };
}

export function videoUrl(config, sessionCode) {
  return config.videoUrlTemplate
    .replaceAll('{eventId}', config.eventId)
    .replaceAll('{sessionCode}', String(sessionCode));
}

export function timestampUrl(baseUrl, seconds) {
  const separator = String(baseUrl).includes('?') ? '&' : '?';
  return `${baseUrl}${separator}time=${Math.max(0, Math.floor(Number(seconds) || 0))}`;
}
