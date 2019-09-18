import axios from 'axios';
import httpAdapter from 'axios/lib/adapters/http';
import os from 'os';
import path from 'path';

import { promises as fs } from 'fs';
import _ from 'lodash';

axios.defaults.adapter = httpAdapter;

export const makeFileName = (url, type) => {
  const { hostname, searchParams, pathname } = new URL(url);
  const fileName = _.kebabCase(`${hostname}${pathname}-${searchParams}`);
  return `${fileName}${type}`;
};

export default (url, pathDir = '') => {
  const fileName = makeFileName(url, '.html');
  let page;
  const request = axios.get(url)
    .then(({ data }) => {
      page = data;
      return data;
    });
  if (pathDir.length > 0) {
    request
      .then(() => fs.writeFile(path.resolve(pathDir, fileName), page));
    return request;
  }
  const tempDir = fs.mkdtemp(path.join(os.tmpdir()));
  request
    .then(() => tempDir)
    .then(dir => fs.writeFile(path.resolve(dir, fileName), page));
  return request;
};
