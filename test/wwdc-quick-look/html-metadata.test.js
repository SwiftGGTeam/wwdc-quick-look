import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createEventConfig } from '../../src/wwdc-quick-look/event-config.js';
import { rawDataFromCollectionHtml } from '../../src/wwdc-quick-look/html-metadata.js';

const COLLECTION_HTML = `
<a href="/videos/play/wwdc2025/238/" class="vc-card tile">
  <h5 class="vc-card__title">Customize your app for Assistive Access</h5>
  <span class="vc-card__keywords hidden"
    data-filter-description-en="Assistive access is a focused iOS experience."
    data-filter-collectionid="wwdc25"
    data-filter-platform="ios|ipados"
    data-filter-topics="Accessibility &amp; Inclusion|Design"></span>
</a>`;

describe('Apple collection HTML metadata', () => {
  it('builds raw metadata from public collection cards', () => {
    const config = createEventConfig({ year: '2025' });
    const rawData = rawDataFromCollectionHtml(COLLECTION_HTML, config);
    assert.deepEqual(rawData.events.wwdc2025, {
      id: 'wwdc2025',
      name: 'WWDC25',
      eventShort: 'wwdc25'
    });
    assert.deepEqual(rawData.videos['wwdc2025-238'], {
      id: 'wwdc2025-238',
      eventId: 'wwdc2025',
      eventContentId: '238',
      title: 'Customize your app for Assistive Access',
      description: 'Assistive access is a focused iOS experience.',
      webPermalink: 'https://developer.apple.com/videos/play/wwdc2025/238/',
      primaryTopicID: 'accessibility-inclusion',
      topicIds: ['accessibility-inclusion', 'design']
    });
    assert.deepEqual(rawData.topics['accessibility-inclusion'], {
      id: 'accessibility-inclusion',
      title: 'Accessibility & Inclusion'
    });
  });

  it('builds raw metadata for Tech Talks collection cards', () => {
    const config = createEventConfig({
      eventId: 'tech-talks',
      eventShort: 'tech-talks',
      displayName: 'Tech Talks'
    });
    const html = `
      <a href="/videos/play/tech-talks/111461/" class="vc-card tile">
        <h5 class="vc-card__title">Prepare your app for iPhone Duo</h5>
        <span class="vc-card__keywords hidden"
          data-filter-description-en="Learn how to update and optimize your app for iPhone Duo."
          data-filter-collectionid="tech-talks"
          data-filter-topics="UI Frameworks|Design"></span>
      </a>`;
    const rawData = rawDataFromCollectionHtml(html, config);
    assert.deepEqual(rawData.events['tech-talks'], {
      id: 'tech-talks',
      name: 'Tech Talks',
      eventShort: 'tech-talks'
    });
    assert.equal(rawData.videos['tech-talks-111461'].title, 'Prepare your app for iPhone Duo');
    assert.equal(
      rawData.videos['tech-talks-111461'].webPermalink,
      'https://developer.apple.com/videos/play/tech-talks/111461/'
    );
  });

  it('keeps apostrophes inside double-quoted metadata attributes', () => {
    const config = createEventConfig({ year: '2026' });
    const html = `
      <a href="/videos/play/wwdc2026/101/" class="vc-card tile">
        <h5 class="vc-card__title">Keynote</h5>
        <span class="vc-card__keywords hidden"
          data-filter-description="don't miss what's new."
          data-filter-collectionid="wwdc26"
          data-filter-topics="Essentials"></span>
      </a>`;

    const rawData = rawDataFromCollectionHtml(html, config);

    assert.equal(rawData.videos['wwdc2026-101'].description, "don't miss what's new.");
  });
});
