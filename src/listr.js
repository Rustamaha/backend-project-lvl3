import path from 'path';
import { promises as fs } from 'fs';

const Listr = require('listr');

const loadAndSaveData = (promises, paths, pathToFiles) => {
  const taskList = promises.map(request => new Listr([
    {
      title: '',
      task: (ctx, taskObj) => request
        .then((response) => {
          const { url } = response.config;
          taskObj.title = `downloading ${url}`; //  eslint-disable-line
          const { data } = response;
          const { fileName } = paths[url];
          return fs.writeFile(path.resolve(pathToFiles, fileName), data);
        })
        .catch((err) => {
          ctx.error = err;
          taskObj.title = err.message; //  eslint-disable-line
        }),
    },
  ], [{ concurrent: true }]).run({}));
  return Promise.all(taskList);
};

export default loadAndSaveData;
