#!/usr/bin/env node

import program from 'commander';

import pageLoader from '..';
import packageJson from '../../package.json';

let urlValue;
let pathValue;

program
  .version(packageJson.version)
  .arguments('<path>', '<url>')
  .description('The utility that downloads the page from the network and local files of this page in the specified folder')
  .action((path, url) => {
  	urlValue = url;
  	pathValue = path;
  })
  .parse(process.argv);

if (typeof urlValue === 'undefined') {
  console.error('Please enter the url');
  process.exit(1);
}
if (typeof pathValue === 'undefined') {
  console.error('Please enter the path');
  process.exit(1);
}
pageLoader(pathValue, urlValue)
  .catch(err => {
  	console.error(err);
  	process.on('exit', (code) => {
      console.error(`About to exit with code: ${code}`);
    });
  });