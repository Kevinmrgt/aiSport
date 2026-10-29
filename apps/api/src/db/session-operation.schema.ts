import { index, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';
import { sessionLogs, users } from './schema.js';

export const sessionLogOperations = pgTable(
  'session_log_operations',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    operationKey: uuid('operation_key').notNull(),
    inputHash: text('input_hash').notNull(),
    logId: uuid('log_id')
      .notNull()
      .references(() => sessionLogs.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.operationKey] }),
    index('session_log_operations_log_idx').on(table.logId),
  ],
);
