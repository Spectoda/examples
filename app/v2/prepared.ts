// Read-only readiness of the preparation (Lazurio Module Standard, `check_script`).
// The Vite dev server needs no build; the App is prepared when every dependency
// of this package is installed. Exit 0 when prepared, 1 otherwise.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import manifest from './package.json';

const names = [...Object.keys(manifest.dependencies), ...Object.keys(manifest.devDependencies)];
const missing = names.filter(
  (name) => !existsSync(fileURLToPath(new URL(`./node_modules/${name}/package.json`, import.meta.url))),
);
if (missing.length > 0) {
  console.error(
    `not prepared: ${missing.join(', ')} not installed; run \`bun install --frozen-lockfile\``,
  );
  process.exit(1);
}
