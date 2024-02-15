import path from 'path';
import fs from 'fs';

export function trim(x: any) {
  if (typeof x === 'string') {
    return x.trim();
  }
  return x;
}

export function safeToString(x: any) {
  if (typeof x === 'string') {
    return x.trim();
  }

  if (typeof x === 'number') {
    return '' + x;
  }

  return '';
}

export function isCellEmpty(x: any) {
  return x === null || x === undefined || x === '';
}

export function isEndWith(x: string, suffix: string) {
  if (!x || !suffix) {
    return false;
  }

  return x.indexOf(suffix, x.length - suffix.length) !== -1;
}

export function isStartWith(x: string, prefix: string) {
  if (!x || !prefix) {
    return false;
  }

  return x.slice(0, prefix.length) === prefix;
}

export function writeFileSync(filePath: string, data: string) {
  const folderPath = path.dirname(filePath);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  fs.writeFileSync(filePath, data);
}

let __debugMode__ = false;

export function setDebugMode(toggle?: boolean) {
  __debugMode__ = !!toggle;
}

export function logger(...args: any[]) {
  if (__debugMode__) {
    console.log('[excelbp]', ...args);
  }
}
