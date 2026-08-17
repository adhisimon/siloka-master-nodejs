import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const getVersion = () => {
  try {
    return execSync('git describe --tags --always --dirty', {
      stdio: ['ignore', 'pipe', 'ignore']
    }).toString().trim();
  } catch {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
    return `v${pkg.version}`;
  }
};

export const fullVersion = getVersion();
