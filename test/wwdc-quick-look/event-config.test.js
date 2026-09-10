import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';

import { createEventConfig, timestampUrl, videoUrl } from '../../src/wwdc-quick-look/event-config.js';

describe('event config', () => {
  it('derives yearly defaults', () => {
    const config = createEventConfig({ year: 2025, projectRoot: '/repo' });
    assert.equal(config.year, '2025');
    assert.equal(config.eventId, 'wwdc2025');
    assert.equal(config.eventShort, 'wwdc25');
    assert.equal(config.displayName, 'WWDC25');
    assert.equal(config.collectionUrl, 'https://developer.apple.com/videos/wwdc2025/');
    assert.equal(config.rawDataPath, path.join('/repo', 'years', '2025', 'raw', 'raw_data.json'));
  });

  it('allows data and event overrides', () => {
    const config = createEventConfig({
      year: '2026',
      eventId: 'custom-event',
      eventShort: 'custom-short',
      locale: 'zh',
      dataRoot: '/tmp/custom'
    });
    assert.equal(config.eventId, 'custom-event');
    assert.equal(config.eventShort, 'custom-short');
    assert.equal(config.locale, 'zh');
    assert.equal(config.rawDir, path.join('/tmp/custom', 'raw'));
  });

  it('defaults Tech Talks naming from event id', () => {
    const config = createEventConfig({
      eventId: 'tech-talks',
      eventShort: 'tech-talks'
    });
    assert.equal(config.displayName, 'Tech Talks');
    assert.equal(config.collectionUrl, 'https://developer.apple.com/videos/tech-talks/');
    assert.equal(
      videoUrl(config, '111461'),
      'https://developer.apple.com/videos/play/tech-talks/111461/'
    );
  });

  it('builds video and timestamp urls', () => {
    const config = createEventConfig({ year: 2025 });
    assert.equal(videoUrl(config, 233), 'https://developer.apple.com/videos/play/wwdc2025/233/');
    assert.equal(timestampUrl('https://example.com/video', 65.9), 'https://example.com/video?time=65');
    assert.equal(timestampUrl('https://example.com/video?locale=en', -1), 'https://example.com/video?locale=en&time=0');
  });
});
