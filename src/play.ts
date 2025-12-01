import { table, t } from './index';
import type { Infer, InferForInsert, InferForUpdate } from './index';

const users = table('users', {
  id: t.serial().primaryKey(),
  name: t.string({ min: 1 }),
  email: t.string(),
  createdAt: t.datetime({ timestamp: 'created' }),
  updatedAt: t.datetime({ timestamp: 'updated' }),
});

export type User = Infer<typeof users>;
export type UserForInsert = InferForInsert<typeof users>;
export type UserForUpdate = InferForUpdate<typeof users>;
