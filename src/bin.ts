#!/usr/bin/env node

import { excelToJson } from './index';

function printHelp() {
  console.log();
  console.log('excel-blueprint Usage:');
  console.log('excelbp <input-file> [output-file]');
  console.log('--h  show this message');
  console.log();
}

async function main() {
  try {
    const args = process.argv.slice(2);
    const entry = args[0];
    let output = args[1];

    const noInputFile = !entry;
    if (process.argv.includes('--h') || process.argv.includes('-H') || noInputFile) {
      printHelp();
      process.exit(0);
    }

    if (output == '--watch' || output === '--debug') {
      output = '';
    }

    await excelToJson({ entry, output, debugMode: process.argv.includes('--debug') });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
