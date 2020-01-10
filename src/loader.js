import axios from 'axios';
import cheerio from 'cheerio';
import httpAdapter from 'axios/lib/adapters/http';
import path from 'path';
import { promises as fs } from 'fs';

import loadAndSaveData from './listr';

const debug = require('debug');

const log = debug('page-loader:loader');

axios.defaults.adapter = httpAdapter;

const currentDir = process.cwd();
log(`Current directory: ${currentDir}`);

export const makeName = (url, type) => {
  const reProtocol = /^https:\/\/|^\/\/|^\//;
  const re = /[\.,/,?,=]/g; //  eslint-disable-line
  const name = url.replace(reProtocol, '').replace(re, '-');
  return type ? `${name}${type}` : `${name}`;
};

const pageLoader = (pageUrl, pathDir = currentDir) => {
  const stats = fs.stat(pathDir);
  const {
    hostname,
    origin,
  } = new URL(pageUrl);
  const reSld = /(\.[^.]*)(\.*$)/;
  const secLvlDomain = hostname.replace(reSld, '').split('.').pop();

  let page;
  const paths = {};

  const dirName = makeName(pageUrl, '_files');
  const request = stats.then(() => axios.get(pageUrl))
    .then(({ data }) => {
      page = data;
      return data;
    });

  const dom = request.then((data) => {
    const $ = cheerio.load(data);
    return $;
  });

  const filter = ($, attr) => (i, el) => {
    const pathEl = $(el).attr(attr);
    const reUrl = /^https:\/\/[a-z.0-9-]{2,}\.[a-z]{2,}|^\/\/[a-z.0-9-]{2,}\.[a-z]{2,}/;
    const reCutUrl = /^\/[a-z0-9-]{2,}/;
    if (pathEl && pathEl.match(reUrl)) {
      const matched = pathEl.match(reUrl);
      const hostName = matched[0].slice(2).split('.');
      const secLvlD = hostName[hostName.length - 2];
      return secLvlD === secLvlDomain;
    }
    return pathEl && pathEl.match(reCutUrl);
  };

  const traverse = ($, attr) => (i, el) => {
    const pathEl = $(el).attr(attr);
    const reUrlWithHttps = /^https:\/\/[a-z.0-9-]{2,}\.[a-z]{2,}/;
    const reUrlWithoutHttps = /^\/\/[a-z.0-9-]{2,}\.[a-z]{2,}/;
    const reType = /\.[a-z]{2,}$|\.[a-z]{2,}\/[a-z0-9]{2,}$/g;
    const typeMatch = pathEl.match(reType);
    let type;
    if (typeMatch) {
      const [ending] = typeMatch[0].split('/');
      type = ending;
    }
    const fileName = makeName(pathEl, type);
    $(el).attr({
      src: `./${dirName}/${fileName}`,
    });
    page = $.html();
    if (pathEl.match(reUrlWithHttps)) {
      paths[pathEl] = { fileName, type };
      return;
    }
    if (pathEl.match(reUrlWithoutHttps)) {
      const makeUrl = `https:${pathEl}`;
      paths[makeUrl] = { fileName, type };
      return;
    }
    const makeUrl = `${origin}${pathEl}`;
    paths[makeUrl] = { fileName, type };
  };

  const scripts = dom.then($ => $('script').filter(filter($, 'src'))
    .map(traverse($, 'src')));
  const links = dom.then($ => $('link').filter(filter($, 'href'))
    .map(traverse($, 'href')));
  const images = dom.then($ => $('img').filter(filter($, 'src'))
    .map(traverse($, 'src')));

  let promises;
  const html = Promise.all([scripts, links, images])
    .then(() => {
      const getData = Object.keys(paths).map((key) => {
        const { type } = paths[key];
        if (type === '.png' || type === '.svg' || type === '.jpeg' || type === '.jpg') {
          return axios.get(key, { responseType: 'arraybuffer' });
        }
        return axios.get(key);
      });
      promises = getData;
    });

  const pageName = makeName(pageUrl, '.html');
  let pathToFiles;
  const localFiles = path.resolve(pathDir, dirName);
  return html.then(() => fs.writeFile(path.resolve(pathDir, pageName), page))
    .then(() => fs.mkdir(localFiles))
    .then(() => {
      pathToFiles = localFiles;
      return pathToFiles;
    })
    .then(() => loadAndSaveData(promises, paths, pathToFiles));
};

export default pageLoader;
