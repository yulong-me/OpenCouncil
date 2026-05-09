import assert from 'node:assert/strict';
import {
  ensureBetterSqlite,
  isNativeBindingMismatch,
  verifyBetterSqliteBinding,
} from '../backend/scripts/ensure-better-sqlite.mjs';

{
  const calls = [];

  class FakeDatabase {
    constructor(filename) {
      calls.push(['construct', filename]);
    }

    close() {
      calls.push(['close']);
    }
  }

  verifyBetterSqliteBinding(() => FakeDatabase);

  assert.deepEqual(calls, [
    ['construct', ':memory:'],
    ['close'],
  ]);
}

{
  const mismatchError = new Error(
    'was compiled against a different Node.js version using NODE_MODULE_VERSION 108',
  );
  mismatchError.code = 'ERR_DLOPEN_FAILED';

  assert.equal(isNativeBindingMismatch(mismatchError), true);

  let attempts = 0;
  let rebuilds = 0;
  const calls = [];

  ensureBetterSqlite({
    loadBetterSqlite: () => {
      attempts += 1;

      if (attempts === 1) {
        return class MismatchedDatabase {
          constructor() {
            throw mismatchError;
          }
        };
      }

      return class RebuiltDatabase {
        constructor(filename) {
          calls.push(['construct', filename]);
        }

        close() {
          calls.push(['close']);
        }
      };
    },
    rebuildBetterSqlite: () => {
      rebuilds += 1;
    },
    logger: {
      warn() {},
      log() {},
    },
  });

  assert.equal(rebuilds, 1);
  assert.deepEqual(calls, [
    ['construct', ':memory:'],
    ['close'],
  ]);
}

console.log('ensure-better-sqlite: ok');
