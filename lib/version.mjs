import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

let appVersion = '0.0.0';
let gitCommit = 'unknown';

try {
  const pkgJsonPath = new URL('../package.json', import.meta.url);
  const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
  appVersion = pkg.version || appVersion;
} catch {
  appVersion = 'unknown';
}

try {
  gitCommit = execSync('git describe --tags --always --dirty', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  }).trim();
} catch {
  gitCommit = process.env.GIT_COMMIT || 'standalone';
}

const fullVersion = `${appVersion}-${gitCommit}`;

export {
  appVersion,
  gitCommit,
  fullVersion
};
