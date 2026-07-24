// Regression guard for the entry point check in lib/cli.js: this script's name
// ends with "cli.js" but it is not the router CLI, so main() must not run.
import { analyze } from '../../lib/cli.js';

if (typeof analyze !== 'function') {
  console.error('analyze did not import');
  process.exit(1);
}
console.log('imported-without-running-main');
