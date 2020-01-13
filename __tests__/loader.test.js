import nock from 'nock';
import os from 'os';

import path from 'path';
import { promises as fs } from 'fs';

import pageLoader from '../src';
import { makeName } from '../src/loader';

const debug = require('debug');

const log = debug('page-loader:test');

const url = 'https://ru.hexlet.io/courses';

const removeDirWithFiles = async (pathDir) => {
  const data = await fs.readdir(pathDir);
  if (data.length === 0) {
    await fs.rmdir(pathDir);
  } else {
    await Promise.all(data.map(async (file) => {
      const pathSubData = path.join(pathDir, file);
      const stats = await fs.stat(pathSubData);
      if (stats.isDirectory()) {
        await removeDirWithFiles(pathSubData);
      } else {
        await fs.unlink(pathSubData);
      }
    }));
    await fs.rmdir(pathDir);
  }
};

const buildPathForFixture = (format, fileName) => path.join('__tests__', '__fixtures__', `${fileName}${format}`);
const buildPathForHexletFiles = (format, fileName) => path.join('__tests__', '__fixtures__', 'ru-hexlet-io-courses_files', `${fileName}${format}`);
const originalHexletPage = buildPathForFixture('.html', 'origin-hexlet-page');
const convertedHexletPage = buildPathForFixture('.html', 'ru-hexlet-io-courses');
const cssFile1 = buildPathForHexletFiles('.css', 'cdn2-hexlet-io-packs-css-36-e1004b13-chunk-css');
const cssFile2 = buildPathForHexletFiles('.css', 'cdn2-hexlet-io-assets-application-58b8be69d43878d8ffa548a26a341422323098508999ea2cd5f001896ad189dc-css');
const rssFile = buildPathForHexletFiles('.rss', 'ru-hexlet-io-lessons-rss');

let tempDir;
let hexletPagePath;
let cssFilePath1;
let cssFilePath2;
let rssFilePath;
let expectedHexletPage;
let expectedCssFile1;
let expectedCssFile2;
let expectedRssFile;
const hexletFile = makeName(url, '.html');
const localFiles = makeName(url, '_files');
const cssFileName1 = 'cdn2-hexlet-io-packs-css-36-e1004b13-chunk-css.css';
const cssFileName2 = 'cdn2-hexlet-io-assets-application-58b8be69d43878d8ffa548a26a341422323098508999ea2cd5f001896ad189dc-css.css';
const rssFileName = 'ru-hexlet-io-lessons-rss.rss';

beforeEach(async () => {
  const temp = `${os.tmpdir()}${path.sep}`;
  log(temp);
  const tmpDir = await fs.mkdtemp(temp);
  tempDir = tmpDir;
  log(`tempDir ${tmpDir}`);
  hexletPagePath = path.resolve(tmpDir, hexletFile);
  cssFilePath1 = path.resolve(tmpDir, localFiles, cssFileName1);
  cssFilePath2 = path.resolve(tmpDir, localFiles, cssFileName2);
  rssFilePath = path.resolve(tmpDir, localFiles, rssFileName);
  expectedHexletPage = await fs.readFile(convertedHexletPage, 'utf8');
  expectedCssFile1 = await fs.readFile(cssFile1, 'utf8');
  expectedCssFile2 = await fs.readFile(cssFile2, 'utf8');
  expectedRssFile = await fs.readFile(rssFile, 'utf8');
});

afterEach(async () => {
  await removeDirWithFiles(tempDir);
  try {
    await fs.readdir(tempDir);
  } catch (err) {
    log(`rmdir tempDir path: ${err.path}`);
  }
});

test(`a page from ${url} is successfully converted and saved local files`, async () => {
  await nock('https://ru.hexlet.io')
    .get('/courses')
    .reply(200, () => fs.readFile(originalHexletPage, 'utf8'));
  nock('https://cdn2.hexlet.io')
    .get('/assets/application-6c3811f32b2b06662856f28be1aa8852645cc103fce8b59a6a05e08ae031ee55.js')
    .reply(200, {
      data: 'hello world',
    });
  nock('https://cdn2.hexlet.io')
    .get('/packs/css/36-e1004b13.chunk.css')
    .reply(200, () => fs.readFile(cssFile1, 'utf8'));
  nock('https://ru.hexlet.io')
    .get('/cdn-cgi/scripts/5c5dd728/cloudflare-static/email-decode.min.js')
    .reply(200, {
      data: 'hello world',
    });
  nock('https://cdn2.hexlet.io')
    .get('/assets/application-58b8be69d43878d8ffa548a26a341422323098508999ea2cd5f001896ad189dc.css')
    .reply(200, () => fs.readFile(cssFile2, 'utf8'));
  nock('https://ru.hexlet.io')
    .get('/lessons.rss')
    .reply(200, () => fs.readFile(rssFile, 'utf8'));
  nock('https://ru.hexlet.io')
    .get('/courses')
    .reply(200, {
      data: 'hello world',
    });

  await pageLoader(url, tempDir);

  const data1 = await fs.readFile(hexletPagePath, 'utf8');
  expect(data1).toBe(expectedHexletPage);
  const data2 = await fs.readFile(cssFilePath1, 'utf8');
  expect(data2).toBe(expectedCssFile1);
  const data3 = await fs.readFile(cssFilePath2, 'utf8');
  expect(data3).toBe(expectedCssFile2);
  const data4 = await fs.readFile(rssFilePath, 'utf8');
  expect(data4).toBe(expectedRssFile);
});

describe('some network problems', () => {
  test(`a page from ${url} reply with status code: 404`, async () => {
    nock('https://ru.hexlet.io')
      .get('/courses')
      .reply(404);

    await expect(pageLoader(url, tempDir))
      .rejects
      .toThrowErrorMatchingSnapshot();
  });

  test(`a page from ${url} reply with status code 403`, async () => {
    await nock('https://ru.hexlet.io')
      .get('/courses')
      .reply(403);

    await expect(pageLoader(url, tempDir))
      .rejects
      .toThrowErrorMatchingSnapshot();
  });

  test(`a page from ${url} reply with status 200, but some files from link reply with status 404`, async () => {
    await nock('https://ru.hexlet.io')
      .get('/courses')
      .reply(200, () => fs.readFile(originalHexletPage, 'utf8'));
    nock('https://cdn2.hexlet.io')
      .get('/assets/application-6c3811f32b2b06662856f28be1aa8852645cc103fce8b59a6a05e08ae031ee55.js')
      .reply(200, {
        data: 'hello world',
      });
    nock('https://cdn2.hexlet.io')
      .get('/packs/css/36-e1004b13.chunk.css')
      .reply(200, () => fs.readFile(cssFile1, 'utf8'));
    nock('https://ru.hexlet.io')
      .get('/cdn-cgi/scripts/5c5dd728/cloudflare-static/email-decode.min.js')
      .reply(200, {
        data: 'hello world',
      });
    nock('https://cdn2.hexlet.io')
      .get('/assets/application-58b8be69d43878d8ffa548a26a341422323098508999ea2cd5f001896ad189dc.css')
      .delay(5000)
      .reply(404);
    nock('https://ru.hexlet.io')
      .get('/lessons.rss')
      .reply(200, () => fs.readFile(rssFile, 'utf8'));
    nock('https://ru.hexlet.io')
      .get('/courses')
      .reply(200, {
        data: 'hello world',
      });

    await pageLoader(url, tempDir);

    const data1 = await fs.readFile(hexletPagePath, 'utf8');
    expect(data1).toBe(expectedHexletPage);
    const data2 = await fs.readFile(cssFilePath1, 'utf8');
    expect(data2).toBe(expectedCssFile1);
    const data3 = await fs.readFile(rssFilePath, 'utf8');
    expect(data3).toBe(expectedRssFile);
  }, 10000);
});

describe('some file system problems', () => {
  test('called without any directory', async () => {
    await expect(pageLoader(url, ''))
      .rejects
      .toThrowErrorMatchingSnapshot();
  });

  test('called with non-existent directory', async () => {
    await expect(pageLoader(url, '/qwerty'))
      .rejects
      .toThrowErrorMatchingSnapshot();
  });
});
