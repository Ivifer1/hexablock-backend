import type { Readable } from 'node:stream';
import { mongo } from 'mongoose';
import { MongoInitialAdministratorRepository } from '../../adapters/persistence/mongo/mongo-initial-administrator.repository.js';
import {
  USER_COLLECTION,
  type UserDocument,
} from '../../adapters/persistence/mongo/user.schema.js';
import { ScryptPasswordHasher } from '../../adapters/security/scrypt-password-hasher.js';
import { SystemClock } from '../../adapters/system/system-clock.js';
import type { InitialAdministratorResult } from '../../application/ports/initial-administrator-repository.js';
import { BootstrapFirstAdministratorUseCase } from '../../application/use-cases/bootstrap-first-administrator.use-case.js';
import { Password } from '../../domain/user/password.js';
import { Username } from '../../domain/user/username.js';
import { readDatabaseUri } from '../config/database.config.js';

interface BootstrapIo {
  readonly input: Readable & { readonly isTTY?: boolean };
  out(line: string): void;
  err(line: string): void;
}

const MAX_INPUT_BYTES = 4096;
const targetWithDatabase =
  /^mongodb(?:\+srv)?:\/\/[^/?#]+\/([^/?#]+)(?:\?[^#]*)?$/;

const conflicts: Record<
  Exclude<InitialAdministratorResult, 'created'>,
  string
> = {
  'administrator-exists':
    'An administrator already exists. No account was changed.',
  'username-taken': 'That username already exists. No account was changed.',
  'identity-conflict':
    'The bootstrap identity is unavailable. No account was changed.',
  'username-index-not-ready':
    'The required unique username index is not ready. No account was changed.',
};

async function readPassword(input: BootstrapIo['input']): Promise<Password> {
  if (input.isTTY) throw new Error('Use a private stdin stream');
  const chunks: Buffer[] = [];
  let byteLength = 0;
  const source: AsyncIterable<unknown> = input;

  for await (const chunk of source) {
    const bytes = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
    if (!Buffer.isBuffer(bytes)) throw new Error('Invalid password input');
    byteLength += bytes.length;
    if (byteLength > MAX_INPUT_BYTES)
      throw new Error('Password input too long');
    chunks.push(bytes);
  }

  const password = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })
    .decode(Buffer.concat(chunks, byteLength))
    .replace(/\r?\n$/, '');
  if (/[\r\n]/.test(password)) throw new Error('Provide one password line');
  return Password.of(password);
}

function explicitDatabase(uri: string): string {
  const match = targetWithDatabase.exec(uri);
  if (!match) throw new Error('The MongoDB URI must name a database');
  return decodeURIComponent(match[1]);
}

export async function runBootstrapFirstAdmin(
  argv: readonly string[],
  env: Readonly<Record<string, string | undefined>>,
  io: BootstrapIo,
): Promise<number> {
  let username: Username;
  let password: Password;
  let uri: string;
  let dbName: string;
  try {
    if (argv.length !== 1) throw new Error('Expected one username argument');
    username = Username.of(argv[0]);
    uri = readDatabaseUri(env);
    dbName = explicitDatabase(uri);
    password = await readPassword(io.input);
  } catch {
    io.err(
      'Usage: npm run bootstrap:admin -- <username>. Set MONGODB_URI with an explicit database and supply one private password line on stdin.',
    );
    return 2;
  }

  let result: InitialAdministratorResult;
  try {
    const client = new mongo.MongoClient(uri, {
      readPreference: 'primary',
      retryWrites: false,
      writeConcern: { w: 'majority' },
      serverSelectionTimeoutMS: 5000,
      // Ambient driver logging can otherwise log the inserted password hash.
      mongodbLogComponentSeverities: {
        default: 'off',
        command: 'off',
        client: 'off',
        connection: 'off',
        serverSelection: 'off',
        topology: 'off',
      },
    });

    try {
      await client.connect();
      const users = client.db(dbName).collection<UserDocument>(USER_COLLECTION);
      const bootstrap = new BootstrapFirstAdministratorUseCase(
        new MongoInitialAdministratorRepository(users),
        new ScryptPasswordHasher(),
        new SystemClock(),
      );
      result = await bootstrap.execute({ username, password });
    } finally {
      await client.close();
    }
  } catch {
    io.err(
      'Could not confirm administrator setup. Check the target database before retrying.',
    );
    return 1;
  }

  if (result === 'created') {
    io.out('First administrator created.');
    return 0;
  }

  io.err(conflicts[result]);
  return 1;
}
