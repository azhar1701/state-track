import { cp, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'path';

const dist = path.resolve(process.cwd(), 'dist');
const index = path.join(dist, 'index.html');
const four04 = path.join(dist, '404.html');

async function main() {
  try {
    await access(index, constants.F_OK);
    await cp(index, four04, { force: true });
    console.log('Copied index.html -> 404.html');
  } catch (err) {
    console.error('Postbuild copy failed:', err.message || err);
    process.exitCode = 1;
  }
}

main();
