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

const pageLoader = (pathDir, pageUrl) => {
  if (pathDir.length === 0) {
    throw new Error('The path should be of this type /home/example');
    return;
  }
  const stats = fs.stat(pathDir);
  const reUrl = /^https:\/\/[a-z.0-9-]{2,}\.[a-z]{2,}/;
  const validUrl = pageUrl.match(reUrl);
  log(pageUrl, validUrl);
  if (validUrl === null) {
    throw new Error('The url should be of this type https://example.com');
    return;
  }
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
  let promisesResolved = [];
  let promisesRejected = [];

  const localFiles = path.resolve(pathDir, dirName);
  log(path.resolve(pathDir, pageName));
  return html.then(() => fs.writeFile(path.resolve(pathDir, pageName), page))
    .then(() => fs.mkdir(localFiles))
    .then(() => {
      pathToFiles = localFiles;
      return pathToFiles;
    })
    .then(() => promises.forEach(async promise => {
      promise.then((response) => {
        promisesResolved.push(response);
      })
      .catch(err => {
        promisesRejected.push(err);
        throw err;
      });
    }))
    .catch(err => {
      if (promisesRejected.length > 0) {
        const [error] = promisesRejected;
        throw error;
      }
      throw err;
    })
    .then(() => {
      const loadAndSaveData = responses => responses.forEach((response) => {
        const { data } = response;
        log('in responses', response.status);
        const { url } = response.config;
        log('local file url %o', url);
        const { fileName } = paths[url];
        fs.writeFile(path.resolve(pathToFiles, fileName), data);
      });
      log('rejected', promisesRejected.length, 'resolved', promisesResolved.length, 'promises', promises.length);
      //  if (promisesRejected.length === 0) {
      //  return loadAndSaveData(promises);
      //  }
      return loadAndSaveData(promisesResolved);      
    })
    .catch(err => {
      throw err;
    });
};

export default pageLoader;
