#!/usr/bin/env node

import program from 'commander';

import pageLoader from '..';
import packageJson from '../../package.json';

program
  .version(packageJson.version)
  .arguments('<url>')
  .option('-o, --output [path]', 'Output path')
  .description('The utility that downloads the page from the network and puts it in the specified folder')
  .action(url => console.log(pageLoader(url, program.output)));

program.parse(process.argv);
