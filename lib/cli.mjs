// ./lib/cli.mjs
import { parseArgs } from 'node:util';
import { fullVersion } from './version.mjs';

export function parseCliArgs () {
  try {
    const { values } = parseArgs({
      options: {
        version: {
          type: 'boolean',
          short: 'V',
          default: false
        },
        pretty: {
          type: 'boolean'
        },
        'no-pretty': {
          type: 'boolean'
        }
      },
      allowPositionals: true,
      strict: true
    });

    if (values.version) {
      console.log(`siloka-master ${fullVersion}`);
      process.exit(0);
    }

    let finalPretty;

    if (values['no-pretty']) {
      finalPretty = false;
    } else if (values.pretty) {
      finalPretty = true;
    }

    return {
      ...values,
      pretty: finalPretty
    };
  } catch (e) {
    if (e.code?.startsWith('ERR_PARSE_ARGS_')) {
      console.error(`Error: ${e.message}`);
      process.exit(1);
    }

    throw e;
  }
}
