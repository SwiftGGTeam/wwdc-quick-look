import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, it } from 'node:test';

const execFileAsync = promisify(execFile);
const SCRIPT = path.resolve('skills/wwdc-quick-look/scripts/query.mjs');
const INSTALLABLE_SCRIPT = path.resolve('skills/wwdc-quick-look/wwdc-quick-look/scripts/query.mjs');

const RAW_DATA = {
  events: {
    wwdc2099: { id: 'wwdc2099', name: 'WWDC99', eventShort: 'wwdc99' }
  },
  topics: {
    swift: { id: 'swift', title: 'Swift' }
  },
  videos: {
    'wwdc2099-101': {
      id: 'wwdc2099-101',
      eventId: 'wwdc2099',
      eventContentId: '101',
      title: 'Build a spatial demo',
      description: 'Learn to build a demo app.',
      webPermalink: 'https://developer.apple.com/videos/play/wwdc2099/101/',
      primaryTopicID: 'swift',
      topicIds: ['swift'],
      resources: [
        {
          type: 'download',
          title: 'Demo Project',
          url: 'https://github.com/example/spatial-demo'
        }
      ],
      codeSnippets: [
        {
          title: 'Create a container view',
          seconds: 42,
          timestamp: '00:42',
          url: 'https://developer.apple.com/videos/play/wwdc2099/101/?time=42',
          code: 'import SwiftUI\n\nstruct DemoView: View {}'
        }
      ]
    },
    'wwdc2099-102': {
      id: 'wwdc2099-102',
      eventId: 'wwdc2099',
      eventContentId: '102',
      title: 'Design app icons',
      description: 'No sample resources here.',
      webPermalink: 'https://developer.apple.com/videos/play/wwdc2099/102/',
      primaryTopicID: 'swift',
      topicIds: ['swift']
    }
  }
};

async function withFixtureServer(fn) {
  const server = http.createServer((request, response) => {
    if (request.url === '/wwdc99/raw_data.json') {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify(RAW_DATA));
      return;
    }
    response.statusCode = 404;
    response.end('not found');
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    return await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function runQuery(baseUrl, args) {
  const { stdout } = await execFileAsync(process.execPath, [SCRIPT, ...args], {
    env: {
      ...process.env,
      WWDC_QUICK_LOOK_BASE_URL: baseUrl
    }
  });
  return stdout;
}

describe('wwdc-quick-look query script', () => {
  it('defaults to the renamed GitHub repository on the main branch', async () => {
    const source = await fs.readFile(INSTALLABLE_SCRIPT, 'utf8');
    assert.match(source, /https:\/\/cdn\.jsdelivr\.net\/gh\/SwiftGGTeam\/wwdc-quick-look@main\/data/);
  });

  it('shows resources and code snippet counts in session details', async () => {
    await withFixtureServer(async (baseUrl) => {
      const out = await runQuery(baseUrl, ['show-session', '--year', '2099', '--code', '101']);
      assert.match(out, /## Build a spatial demo/);
      assert.match(out, /Resources \(1\)/);
      assert.match(out, /Demo Project/);
      assert.match(out, /Code snippets \(1\)/);
      assert.match(out, /Create a container view/);
    });
  });

  it('lists session resources and code snippets directly', async () => {
    await withFixtureServer(async (baseUrl) => {
      const resources = await runQuery(baseUrl, ['resources', '--year', '2099', '--code', '101']);
      assert.match(resources, /## Resources for 101/);
      assert.match(resources, /\| download \| Demo Project \| https:\/\/github.com\/example\/spatial-demo \|/);

      const code = await runQuery(baseUrl, ['code', '--year', '2099', '--code', '101']);
      assert.match(code, /## Code snippets for 101/);
      assert.match(code, /00:42 - Create a container view/);
      assert.match(code, /```swift\nimport SwiftUI\n\nstruct DemoView: View {}\n```/);
    });
  });

  it('searches resource titles and code snippet titles', async () => {
    await withFixtureServer(async (baseUrl) => {
      const resourceMatch = await runQuery(baseUrl, ['search', '--year', '2099', '--keyword', 'Demo Project']);
      assert.match(resourceMatch, /Sessions matching "Demo Project" \(1\)/);
      assert.match(resourceMatch, /\| 101 \| Build a spatial demo \|/);

      const codeMatch = await runQuery(baseUrl, ['search', '--year', '2099', '--keyword', 'container view']);
      assert.match(codeMatch, /Sessions matching "container view" \(1\)/);
      assert.match(codeMatch, /\| 101 \| Build a spatial demo \|/);
    });
  });

  it('supports --event selectors for non-WWDC archives', async () => {
    const server = http.createServer((request, response) => {
      if (request.url === '/tech-talks/raw_data.json') {
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({
          events: {
            'tech-talks': { id: 'tech-talks', name: 'Tech Talks', eventShort: 'tech-talks' }
          },
          topics: {
            design: { id: 'design', title: 'Design' }
          },
          videos: {
            'tech-talks-111461': {
              id: 'tech-talks-111461',
              eventId: 'tech-talks',
              eventContentId: '111461',
              title: 'Prepare your app for iPhone Duo',
              description: 'Optimize your app for iPhone Duo.',
              webPermalink: 'https://developer.apple.com/videos/play/tech-talks/111461/',
              primaryTopicID: 'design',
              topicIds: ['design']
            }
          }
        }));
        return;
      }
      response.statusCode = 404;
      response.end('not found');
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    try {
      const out = await runQuery(`http://127.0.0.1:${port}`, [
        'show-session',
        '--event',
        'tech-talks',
        '--code',
        '111461'
      ]);
      assert.match(out, /## Prepare your app for iPhone Duo/);
      assert.match(out, /Code:\*\* 111461/);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
