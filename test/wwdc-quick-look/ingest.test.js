import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createEventConfig } from '../../src/wwdc-quick-look/event-config.js';
import { fetchRawData } from '../../src/wwdc-quick-look/ingest.js';

async function withMockFetchRouter(handler, fn) {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return handler(String(url), options);
  };
  try {
    return await fn(calls);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

describe('raw metadata ingest', () => {
  it('enriches collection metadata with session code snippets and resources', async () => {
    const config = createEventConfig({ year: '2025' });
    const collectionHtml = `
      <a href="/videos/play/wwdc2025/238/" class="vc-card tile">
        <h5 class="vc-card__title">Customize your app for Assistive Access</h5>
        <span class="vc-card__keywords hidden"
          data-filter-description-en="Assistive access is a focused iOS experience."
          data-filter-collectionid="wwdc25"
          data-filter-topics="Accessibility &amp; Inclusion"></span>
      </a>`;
    const sessionHtml = `
      <h2>Resources</h2>
      <ul class="links small">
        <li class="download"><a href="https://github.com/apple/container">Container</a></li>
      </ul>
      <li class="sample-code-main-container">
        <p>5:21 - <a class="jump-to-time-sample" href="/videos/play/wwdc2025/238/?time=321" data-start-time="321">Create a scene</a></p>
        <pre class="code-source"><code><span class="syntax-keyword">import</span> SwiftUI</code></pre>
      </li>`;

    await withMockFetchRouter(async (url) => {
      if (url === 'https://developer.apple.com/videos/wwdc2025/') {
        return { ok: true, status: 200, statusText: 'OK', text: async () => collectionHtml };
      }
      if (url === 'https://developer.apple.com/videos/play/wwdc2025/238/') {
        return { ok: true, status: 200, statusText: 'OK', text: async () => sessionHtml };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }, async (calls) => {
      const rawData = await fetchRawData(config);
      assert.deepEqual(calls.map((call) => call.url), [
        'https://developer.apple.com/videos/wwdc2025/',
        'https://developer.apple.com/videos/play/wwdc2025/238/'
      ]);
      assert.deepEqual(rawData.videos['wwdc2025-238'].resources, [
        { type: 'download', title: 'Container', url: 'https://github.com/apple/container' }
      ]);
      assert.deepEqual(rawData.videos['wwdc2025-238'].codeSnippets, [
        {
          title: 'Create a scene',
          seconds: 321,
          timestamp: '5:21',
          url: 'https://developer.apple.com/videos/play/wwdc2025/238/?time=321',
          code: 'import SwiftUI'
        }
      ]);
    });
  });

  it('keeps only selected Tech Talk session codes', async () => {
    const config = createEventConfig({
      eventId: 'tech-talks',
      eventShort: 'tech-talks',
      displayName: 'Tech Talks'
    });
    const collectionHtml = `
      <a href="/videos/play/tech-talks/111461/" class="vc-card tile">
        <h5 class="vc-card__title">Prepare your app for iPhone Duo</h5>
        <span class="vc-card__keywords hidden"
          data-filter-description-en="Optimize your app for iPhone Duo."
          data-filter-collectionid="tech-talks"
          data-filter-topics="Design"></span>
      </a>
      <a href="/videos/play/tech-talks/999999/" class="vc-card tile">
        <h5 class="vc-card__title">Other talk</h5>
        <span class="vc-card__keywords hidden"
          data-filter-description-en="Skip me."
          data-filter-collectionid="tech-talks"
          data-filter-topics="Design"></span>
      </a>`;

    await withMockFetchRouter(async (url) => {
      if (url === 'https://developer.apple.com/videos/tech-talks/') {
        return { ok: true, status: 200, statusText: 'OK', text: async () => collectionHtml };
      }
      if (url === 'https://developer.apple.com/videos/play/tech-talks/111461/') {
        return { ok: true, status: 200, statusText: 'OK', text: async () => '<html></html>' };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }, async () => {
      const rawData = await fetchRawData(config, { sessionCodes: '111461' });
      assert.deepEqual(Object.keys(rawData.videos), ['tech-talks-111461']);
      assert.equal(rawData.videos['tech-talks-111461'].title, 'Prepare your app for iPhone Duo');
    });
  });
});
