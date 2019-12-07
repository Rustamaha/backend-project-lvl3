#!/usr/bin/env node

import program from 'commander';

import pageLoader from '..';
import packageJson from '../../package.json';

let urlValue = '';
let pathValue = '';

program
  .version(packageJson.version)
  .arguments('<url>')
  .option('-o, --output [path]', 'Output path')
  .description('The utility that downloads the page from the network and local files of this page in the specified folder')
  .action((url, path) => {
  	urlValue = url;
    pathValue = path;
  })
  .parse(process.argv);

if (pathValue.length === 0 && program.output) {
  console.error('Please enter the path');
  process.exit(1);
}

if (urlValue.length === 0) {
  console.error('Please enter the url');
  process.exit(1);
}

pageLoader(urlValue, program.output)
  .catch(err => {
  	console.error(err);
  	process.exit(1);
  });