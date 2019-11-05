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
const originalHexletPage = buildPathForFixture('.html', 'view-source_ru.hexlet.io_courses');
const convertedHexletPage = buildPathForFixture('.html', 'ru-hexlet-io-courses');
const cssFile = buildPathForHexletFiles('.css', 'cdn2-hexlet-io-assets-application-58b8be69d43878d8ffa548a26a341422323098508999ea2cd5f001896ad189dc-css');
let tempDir;
//  let localFilesDir;
let filePath;
let cssFilePath;
let expected1;
let expected2;

beforeAll(() => {
  const hexletFile = makeName(url1, '.html');
  const localFiles = makeName(url1, '_files');
  const cssFileName = 'cdn2-hexlet-io-assets-application-58b8be69d43878d8ffa548a26a341422323098508999ea2cd5f001896ad189dc-css.css';
  fs.mkdtemp(path.join(os.tmpdir()))
    .then((dir) => {
      tempDir = dir;
      filePath = path.resolve(dir, hexletFile);
      //  localFilesDir = path.resolve(dir, localFiles);
      cssFilePath = path.resolve(dir, localFiles, cssFileName);
      return fs.readFile(convertedHexletPage, 'utf8');
    })
    .then((data) => {
      expected1 = data;
    })
    .then(() => fs.readFile(cssFile, 'utf8'))
    .then((data) => {
      expected2 = data;
    });
});

test('a page from url1 is successfully converted and saved local files', async () => {
  log('tests');
  await nock('https://ru.hexlet.io')
    .get('/courses')
    .reply(200, () => fs.readFile(originalHexletPage, 'utf8'));
  await nock('https://ru.hexlet.io')
    .get('/cdn-cgi/scripts/5c5dd728/cloudflare-static/email-decode.min.js')
    .reply(200, {
      data: 'hello world',
    });
  await nock('https://cdn2.hexlet.io')
    .get('/assets/application-18fceb6e3c2174543bef135dd059ef4b818426e5c00c6e8d320344d7c96a2c00.js')
    .reply(200, {
      data: 'hello world',
    });
  await nock('https://cdn2.hexlet.io')
    .get('/packs/js/runtime~application-afec33d14cb7ead791f8.js')
    .reply(200, {
      data: 'hello world',
    });
  await nock('https://cdn2.hexlet.io')
    .get('/packs/js/1-690958a8287b31a22ef2.chunk.js')
    .reply(200, {
      data: 'hello world',
    });
  await nock('https://cdn2.hexlet.io')
    .get('/packs/js/34-ea12df81beb39d7f7cd6.chunk.js')
    .reply(200, {
      data: 'hello world',
    });
  await nock('https://cdn2.hexlet.io')
    .get('/packs/js/application-386fb49119b4a3c6179e.chunk.js')
    .reply(200, {
      data: 'hello world',
    });
  await nock('https://cdn2.hexlet.io')
    .get('/assets/application-58b8be69d43878d8ffa548a26a341422323098508999ea2cd5f001896ad189dc.css')
    .reply(200, () => fs.readFile(cssFile, 'utf8'));
  await nock('https://cdn2.hexlet.io')
    .get('/packs/css/34-e1004b13.chunk.css')
    .reply(200, {
      data: 'hello world',
    });
  await nock('https://ru.hexlet.io')
    .get('/lessons.rss')
    .reply(200, {
      data: 'hello world',
    });
  await nock('https://ru.hexlet.io')
    .get('/courses')
    .reply(200, {
      data: 'hello world',
    });

  await pageLoader(url1, tempDir);

  setTimeout(async () => {
    await fs.readFile(filePath, 'utf8')
      .then(data => expect(data).toMatch(expected1));
    await fs.readFile(cssFilePath, 'utf8')
      .then(data => expect(data).toMatch(expected2));
  }, 5000);
});
