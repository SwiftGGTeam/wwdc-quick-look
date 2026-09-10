function decodeHtmlEntities(value) {
  return String(value ?? '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

function textFromHtml(fragment) {
  return decodeHtmlEntities(String(fragment ?? '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim());
}

function attributeValue(attributes, name) {
  const pattern = new RegExp(`\\b${name}\\s*=\\s*(["'])(?<value>[\\s\\S]*?)\\1`, 'i');
  return decodeHtmlEntities(attributes.match(pattern)?.groups?.value ?? '');
}

function absoluteAppleUrl(path) {
  if (!path) return '';
  return new URL(path, 'https://developer.apple.com').toString();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sessionCodeFromHref(href, eventId) {
  const eventPattern = eventId
    ? escapeRegExp(eventId)
    : '[A-Za-z0-9-]+';
  return href.match(new RegExp(`/videos/play/${eventPattern}/(?<code>[^/?#]+)/`, 'i'))?.groups?.code ?? '';
}

function collectionShortFromHtml(html, fallback) {
  return String(html ?? '').match(/data-filter-collectionid=["'](?<id>[A-Za-z0-9-]+)["']/i)?.groups?.id
    ?? fallback;
}

export function rawDataFromCollectionHtml(html, config) {
  const source = String(html ?? '');
  const eventShort = collectionShortFromHtml(source, config.eventShort);
  const videos = {};
  const topics = {};
  const eventPattern = escapeRegExp(config.eventId);
  const cardPattern = new RegExp(
    `<a\\b(?<attributes>[^>]*href=["'][^"']*/videos/play/${eventPattern}/[0-9A-Za-z_-]+/?["'][^>]*)>(?<body>[\\s\\S]*?)<\\/a>`,
    'gi'
  );

  for (const match of source.matchAll(cardPattern)) {
    const href = attributeValue(match.groups.attributes, 'href');
    const sessionCode = sessionCodeFromHref(href, config.eventId);
    if (!sessionCode) continue;

    const body = match.groups.body;
    const keywordAttributes = body.match(/<span\b(?<attributes>[^>]*class=["'][^"']*vc-card__keywords[^"']*["'][^>]*)>/i)?.groups?.attributes ?? '';
    const title = textFromHtml(body.match(/<h5\b[^>]*class=["'][^"']*vc-card__title[^"']*["'][^>]*>(?<text>[\s\S]*?)<\/h5>/i)?.groups?.text)
      || attributeValue(keywordAttributes, 'data-filter-title-en')
      || attributeValue(keywordAttributes, 'data-filter-title');
    const description = attributeValue(keywordAttributes, 'data-filter-description-en')
      || attributeValue(keywordAttributes, 'data-filter-description');
    const topicNames = attributeValue(keywordAttributes, 'data-filter-topics')
      .split('|')
      .map((topic) => topic.trim())
      .filter(Boolean);
    const topicIds = topicNames.map((topicName) => {
      const id = topicName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      topics[id] = { id, title: topicName };
      return id;
    });
    const id = `${config.eventId}-${sessionCode}`;
    videos[id] = {
      id,
      eventId: config.eventId,
      eventContentId: sessionCode,
      title,
      description,
      webPermalink: absoluteAppleUrl(href),
      primaryTopicID: topicIds[0],
      topicIds
    };
  }

  return {
    events: {
      [config.eventId]: {
        id: config.eventId,
        name: config.displayName,
        eventShort
      }
    },
    topics,
    videos
  };
}
