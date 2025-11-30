# quex

A teeny tiny ORM for TypeScript and JavaScript inspired by Elixir's
[Ecto](https://hexdocs.pm/ecto).

Built for you who wants a simple, small ORM that just works.

```ts
import * as sqlite3 from 'quex/bun-sqlite3';
import { from, table, t } from 'quex';

const users = table('users', {
  id: t.integer({ primaryKey: true, autogenerate: true }),
  name: t.string(),
  email: t.string(),
  createdAt: t.timestamp({ autogenerate: true }),
});

// ...

const conn = sqlite3.connect({
  path: './db.sqlite',
});

const user = await from(users.as('u'))
  .where(({ u }) => e.eq(u.id, 1))
  .one(conn);

if (!user) {
  throw new Error('User not found');
}

console.log(user);
```

See more [examples](#examples).


# Vision

Here's the basics of what I need from an ORM, thus it's my priority to
build it first:

- [ ] Defining model fields should be very similar to defining a
      schema with [Zod](https://zod.dev) (with support for validation
      refiements and transformations).
- [ ] The model should have a schema compatible with
      [standard schema](https://github.com/standard-schema/standard-schema),
      meaning it should be interoperable with [Zod](https://zod.dev),
      [ArkType](https://arktype.io), [Joi](https://joi.dev), etc.
- [ ] It should have a SQL-Like, type-safe, fluent query builder api
      that works even for NoSQL databases¹, allowing us to write
      queries once then use them with any supported database.
- [ ] The query builder should output an AST ([Abstract Syntax Tree](https://en.wikipedia.org/wiki/Abstract_syntax_tree))
      representation of the query that can be encoded to JSON, mostly
      for three reasons:
    1. It's easy to test;
    2. Makes it easier to debug queries; and
    3. Makes `quex` more modular, allowing the community to build
        their own extensions.
- [ ] The query engine should support joins even for databases that
      don't support it natively, by falling back to preloading
      techniques such as executing multiple queries (one per table).
- [ ] The query results should be type-safe.

_¹ Some database adapters might not support all query features, that's
   expected._

Once this vision is fullfilled, `quex` will become `v1.0.0`.

> [!NOTE]
> Migrations are not part of the scope yet, sorry.
> I don't like the way migrations work in most ORMs, so I'll take my time to figure out what's a better way to do it.

## Components

The vision above implies the existence of four main components to this
library:

1. A table factory that outputs a model with a [standard schema](https://github.com/standard-schema/standard-schema);
2. A query builder that outputs an AST; and
3. A query engine that orchestrates the query execution using a
   database adapter; and
4. Database adapters that can execute queries for a specific database
   driver.


# Database Adapters

Database adapters are per driver implementation. Quex ships with a few
hand picked built-in database adapters:

- [ ] bun-sqlite3 (prioritary)
- [ ] bun-postgres
- [ ] mongodb

For community-built adapters, check GitHub's tag [#quex-adapter](https://github.com/topics/quex-adapter)
(you won't find anything there yet).


## Examples

Here are some examples that I'm using to guide the implementation.

(Ignore the imports though, I'm still figuring them out.)

Define a table:

```ts
// src/db/tables/backups.ts
import { z } from 'zod/v4';
import { type as arktype } from 'arktype';
import { table, t } from 'quex';

// custom types
const c = {
  absolutePath: () => t.string({
    schema: z
      .string()
      .refine(str => str.startsWith('/'), "must be an absolute path")
      .transform(str => str.endsWith('/') ? str.slice(0, -1) : str)
  }),
  bytes: () => t.integer({ schema: arktype('number.integer > 0') }),
  email: () => t.string({ schema: z.email() }),
};

export const backups = table('backups', {
  id: t.serial().primaryKey(),
  parentId: t.integer().nullable(),
  state: t.enum(['scheduled', 'started', 'succeeded', 'failed']).default('scheduled'),
  path: c.absolutePath(),
  size: c.bytes().nullable(),
  notifyableContacts: c.email().array().default([]),
  //                            ↑ will be stored as VARCHAR[] in postgres
  //                              will be stored as json encoded TEXT in sqlite
  scheduledAt: t.timestamp({ autogenerate: true }),
  scheduledBy: t.string({ schema: z.email() }),
  startedAt: t.nullable(t.timestamp()),
  succeededAt: t.nullable(t.timestamp()),
  failedAt: t.nullable(t.timestamp()),
});

export type Backup = typeof backups.infer;
export type BackupForInsert = typeof backups.inferForInsert;
export type BackupForUpdate = typeof backups.inferForUpdate
```

You can create your own types registry so you can reuse it across your
tables:

```ts
// src/db/types.ts
import { z } from 'zod/v4';
import { type as arktype } from 'arktype';
import { defineTypes, types } from 'quex';

// `t` contains all built-in types in addition to your custom types
export const t = defineTypes({
  absolutePath: () => types.string({
    schema: z
      .string()
      .refine(str => str.startsWith('/'), "must be an absolute path")
      .transform(trimTrailing('/'))
  }),
  bytes: () => types.integer({ schema: arktype('number.integer > 0') }),
  email: () => types.string({ schema: z.email() }),
  string: () => types.string({ schema: z.string().min(1).max(255) }),
  // if you have a custom type with the same name as a built-in type,
  // yours will take precedence
});
```

Then query the table:

```ts
// src/index.ts
import * as sqlite3 from 'quex/bun-sqlite3';
import { expr as e, from, repo } from 'quex';

const yesterday = new Date(Date.now() - (24 * 60 * 60 * 1000));

const query = from(backups.as('b1'))
  .leftJoin(backups.as('b2'), ({ b1, b2 }) => e.eq(b2.id, b1.parentId))
  .where(({ b1, b2 }) => e.and([
    e.eq(b1.state, 'failed'),
    e.gte(b1.failedAt, yesterday),
    e.eq(b1.scheduledBy, 'johndoe@gmail.com'),
  ]))
  .orderBy(({ b1 }) => e.desc(b1.scheduledAt))
  .limit(25)
  .offset(0)
  .select(({ b1, b2 }) => ({
    ...b1,
    parentPath: b2.path,
    totalSizeMiB: e.div(e.add(b1.size, e.coalesce(b2.size, 0)), 1048576),
  }))
  // ↓ calling compile will exit the query builder api returning the
  //   query's AST
  .compile();

const conn = sqlite3.connect({
  path: './db.sqlite',
});

const results = await repo.all(conn, query);
```

No singleton magic here! Not on my watch. You need to explicitly pass
the connection to the query engine.

The results:

```ts
[
  {
    id: 2,
    parentId: 1,
    state: 'failed',
    path: '/backups/20251130133100.tar.gz',
    size: 104857600,
    notifyableContacts: ['devops@ecma.com'],
    scheduledAt: new Date('2025-11-30T13:31:00.000Z'),
    scheduledBy: 'johndoe@gmail.com',
    startedAt: new Date('2025-11-30T13:32:00.000Z'),
    succeededAt: null,
    failedAt: new Date('2025-11-30T14:00:00.000Z'),
    parentPath: '/backups/20251030134200.tar.gz',
    totalSizeMiB: 42069,
  }
]
```

Sometimes we want to write the query at "compile time" though (boot
time), so we can reuse it later as a cheaper operation. For that we
can use `precompile` instead of `compile`:

```ts
// src/index.ts
import { expr as e, from, repo } from 'quex';
import { t } from './db/types';

const failedBackups = from(backups.as('b1'))
  .leftJoin(backups.as('b2'), ({ b1, b2 }) => e.eq(b2.id, b1.parentId))
  .where(({ b1, b2 }) => e.and([
    e.eq(b1.state, 'failed'),
    e.gte(b1.failedAt, e.placeholder('failedAfter', t.timestamp())),
    e.eq(b1.scheduledBy, e.placeholder('scheduledBy', t.email())),
    //                   ↑ defines a named, typed placeholder for a value
  ]))
  .orderBy(({ b1 }) => e.desc(b1.scheduledAt))
  .limit(25)
  .offset(0)
  .select(({ b1, b2 }) => ({
    ...b1,
    parentPath: b2.path,
    totalSizeMiB: e.div(e.add(b1.size, e.coalesce(b2.size, 0)), 1048576),
  }))
  .precompile();

// ...

app.get('/my-failed-backups', async (req, res) => {
  const query = failedBackups.compile({
    failedAfter: new Date(req.query.after as string),
    scheduledBy: req.user.email,
  });

  res.json(await repo.all(req.conn, query));
});
```

If you don't care about precompiling / reusing a query, you can call
`all` / `one` directly from the query builder:

```ts
import * as sqlite3 from 'quex/bun-sqlite3';
import { from, table, t } from 'quex';

const users = table('users', {
  id: t.integer({ primaryKey: true, autogenerate: true }),
  name: t.string(),
  email: t.string(),
  createdAt: t.timestamp({ autogenerate: true }),
});

// ...

const conn = sqlite3.connect({
  path: './db.sqlite',
});

const user = await from(users.as('u'))
  .where(({ u }) => e.eq(u.id, 1))
  .one(conn);

if (!user) {
  throw new Error('User not found');
}

console.log(user);
```
