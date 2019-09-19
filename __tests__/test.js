import nock from 'nock';
import os from 'os';

import path from 'path';
import { promises as fs } from 'fs';

import pageLoader from '../src';
import { makeFileName } from '../src/loader';

const url1 = 'https://hexlet.io/courses';
const url2 = 'https://yandex.ru/pogoda/saint-petersburg?lat=59.957932&lon=30.298605';

const buildPathForFixture = (format, fileName) => path.join('__tests__', '__fixtures__', `${fileName}${format}`);

const hexlet = buildPathForFixture('.html', 'hexlet');
const yandexPogoda = buildPathForFixture('.html', 'yandex-pogoda');

let expected1;
let expected2;
let pathDir;
let filePath1;
let filePath2;

beforeAll(() => {
  const hexletFile = makeFileName(url1, '.html');
  const yandexFile = makeFileName(url2, '.html');
  fs.mkdtemp(path.join(os.tmpdir()))
    .then((dir) => {
      pathDir = dir;
      filePath1 = path.join(dir, hexletFile);
      filePath2 = path.join(dir, yandexFile);
    });
});

test('a page from url1 is successfully downloaded and saved', async () => {
  await nock('https://hexlet.io')
    .get('/courses')
    .reply(200, () => fs.readFile(hexlet, 'utf8')
      .then((data) => {
        expected1 = data;
      }));

  await pageLoader(url1, pathDir);
  setTimeout(() => {
  	Promise.resolve(filePath1)
  	  .then(path => fs.readFile(path, 'utf8'))
      .then((data) => expect(data).toMatch(expected1));
  }, 5000);
});

test('a page from url2 is successfully downloaded and saved', async () => {
  await nock('https://yandex.ru')
    .get('/pogoda/saint-petersburg?lat=59.957932&lon=30.298605')
    .reply(200, () => fs.readFile(yandexPogoda, 'utf8')
      .then((data) => {
        expected2 = data;
      }));

  await pageLoader(url2, pathDir);
  setTimeout(() => {
    return Promise.resolve(filePath2).then(path => fs.readFile(path, 'utf8'))
      .then((data) => {
        return expect(data).toMatch(expected2);
      });
  }, 5000);
});
