import axios from 'axios';
import cheerio from 'cheerio';
import httpAdapter from 'axios/lib/adapters/http';
import path from 'path';
import { promises as fs } from 'fs';
import os from 'os';

const debug = require('debug');

const log = debug('page-loader:loader');

axios.defaults.adapter = httpAdapter;

export const makeName = (url, type) => {
  const reProtocol = /^https:\/\/|^\/\/|^\//;
  const re = /[\.,/,?,=]/g; //  eslint-disable-line
  const name = url.replace(reProtocol, '').replace(re, '-');
  return type ? `${name}${type}` : `${name}`;
};

const pageLoader = (pageUrl, pathDir = '') => {
  log('pathdir %o', pathDir);
  const {
    hostname,
    origin,
  } = new URL(pageUrl);
  const reSld = /(\.[^.]*)(\.*$)/;
  const secLvlDomain = hostname.replace(reSld, '').split('.').pop();
  let page;
  const paths = {};
  const dirName = makeName(pageUrl, '_files');
  const request = axios.get(pageUrl)
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
    const re1 = /^https:\/\/[a-z.0-9-]{2,}\.[a-z]{2,}|^\/\/[a-z.0-9-]{2,}\.[a-z]{2,}/;
    const re2 = /^\/[a-z0-9-]{2,}/;
    if (pathEl && pathEl.match(re1)) {
      const matched = pathEl.match(re1);
      const hostName = matched[0].slice(2).split('.');
      const secLvlD = hostName[hostName.length - 2];
      return secLvlD === secLvlDomain;
    }
    return pathEl && pathEl.match(re2);
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
        if (type === '.png' || type === '.svg' || type === '.jpeg') {
          return axios.get(key, { responseType: 'arraybuffer' });
        }
        return axios.get(key);
      });
      promises = getData;
    });
  const pageName = makeName(pageUrl, '.html');
  let pathToFiles;
  const loadAndSaveFiles = () => axios.all(promises)
    .then(axios.spread((...responses) => responses.forEach((response) => {
      const { data } = response;
      const { url } = response.config;
      log('local file url %o', url);
      const { fileName } = paths[url];
      fs.writeFile(path.resolve(pathToFiles, fileName), data);
    })));
  if (pathDir.length > 0) {
    const localFiles = path.resolve(pathDir, dirName);
    html.then(() => fs.writeFile(path.resolve(pathDir, pageName), page))
      .then(() => fs.mkdir(localFiles))
      .then(() => {
        pathToFiles = localFiles;
        return pathToFiles;
      })
      .then(() => loadAndSaveFiles());
  } else {
    html.then(() => fs.mkdtemp(path.join(os.tmpdir())))
      .then((dir) => {
        const localFiles = path.resolve(dir, dirName);
        pathToFiles = localFiles;
        return fs.writeFile(path.resolve(dir, pageName), page);
      })
      .then(() => fs.mkdir(pathToFiles))
      .then(() => loadAndSaveFiles());
  }
};

export default pageLoader;
