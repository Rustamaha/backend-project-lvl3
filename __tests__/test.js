import nock from 'nock';
import os from 'os';

import path from 'path';
import { promises as fs } from 'fs';

import pageLoader from '../src';
import { makeName } from '../src/loader';

const debug = require('debug');

const log = debug('page-loader:test');

const url1 = 'https://ru.hexlet.io/courses';

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
const hexletFile = makeName(url1, '.html');
const localFiles = makeName(url1, '_files');
const cssFileName1 = 'cdn2-hexlet-io-packs-css-36-e1004b13-chunk-css.css';
const cssFileName2 = 'cdn2-hexlet-io-assets-application-58b8be69d43878d8ffa548a26a341422323098508999ea2cd5f001896ad189dc-css.css';
const rssFileName = 'ru-hexlet-io-lessons-rss.rss';

beforeAll(() => {
  const tmpDir = fs.mkdtemp(path.join(os.tmpdir()));
  tempDir = tmpDir;
  tmpDir
    .then((dir) => {
      log('tempDir test.js', dir);
      hexletPagePath = path.resolve(dir, hexletFile);
      cssFilePath1 = path.resolve(dir, localFiles, cssFileName1);
      cssFilePath2 = path.resolve(dir, localFiles, cssFileName2);
      rssFilePath = path.resolve(dir, localFiles, rssFileName);
      return fs.readFile(convertedHexletPage, 'utf8');
    })
    .then((data) => {
      expectedHexletPage = data;
    })
    .then(() => fs.readFile(cssFile1, 'utf8'))
    .then((data) => {
      expectedCssFile1 = data;
    })
    .then(() => fs.readFile(cssFile2, 'utf8'))
    .then((data) => {
      expectedCssFile2 = data;
    })
    .then(() => fs.readFile(rssFile, 'utf8'))
    .then((data) => {
      expectedRssFile = data;
    });
});

describe('everything good', () => {
  test(`a page from ${url1} is successfully converted and saved local files`, async () => {
    await nock('https://ru.hexlet.io')
      .get('/courses')
      .reply(200, () => fs.readFile(originalHexletPage, 'utf8'));
    await nock('https://cdn2.hexlet.io')
      .get('/assets/application-6c3811f32b2b06662856f28be1aa8852645cc103fce8b59a6a05e08ae031ee55.js')
      .reply(200, {
        data: 'hello world',
      });
    await nock('https://cdn2.hexlet.io')
      .get('/packs/css/36-e1004b13.chunk.css')
      .reply(200, () => fs.readFile(cssFile1, 'utf8'));
    await nock('https://ru.hexlet.io')
      .get('/cdn-cgi/scripts/5c5dd728/cloudflare-static/email-decode.min.js')
      .reply(200, {
        data: 'hello world',
      });
    await nock('https://cdn2.hexlet.io')
      .get('/assets/application-58b8be69d43878d8ffa548a26a341422323098508999ea2cd5f001896ad189dc.css')
      .reply(200, () => fs.readFile(cssFile2, 'utf8'));
    await nock('https://ru.hexlet.io')
      .get('/lessons.rss')
      .reply(200, () => fs.readFile(rssFile, 'utf8'));
    await nock('https://ru.hexlet.io')
      .get('/courses')
      .reply(200, {
        data: 'hello world',
      });

    const dir = await tempDir;
    await pageLoader(url1, dir);

    await setTimeout(async () => {
      await fs.readFile(hexletPagePath, 'utf8')
        .then(data => expect(data).toBe(expectedHexletPage));
      await fs.readFile(cssFilePath1, 'utf8')
        .then(data => expect(data).toBe(expectedCssFile1));
      await fs.readFile(cssFilePath2, 'utf8')
        .then(data => expect(data).toBe(expectedCssFile2));
      await fs.readFile(rssFilePath, 'utf8')
        .then(data => expect(data).toBe(expectedRssFile));
    });
  });
});
