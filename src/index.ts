import { z } from 'zod/v4';
import { v7 as uuidv7 } from 'uuid';
import * as std from './standard-schema';

//////////////////////////////////////////////////////////////////////
///                            SYMBOLS                             ///
//////////////////////////////////////////////////////////////////////

/**
 * @private The name of the key in Table that stores the table name.
 *          It has to be a symbol so it doesn't get included when
 *          iterating over the table's columns.
 * @since   0.1.0
 * @version 0.1.0
 */
const NAME = Symbol.for('~name');

//////////////////////////////////////////////////////////////////////
///                         PRIVATE TYPES                          ///
//////////////////////////////////////////////////////////////////////

/**
 * @private This type forces TypeScript to expand and resolve the
 *          given object type, which is useful for presenting cleaner
 *          types to users.
 * @since   0.1.0
 * @version 0.1.0
 */
type Expand<T> = T extends object ? { [K in keyof T]: T[K] } : never;

/**
 * @private The primitive data types supported by quex. Each database
 *          adapter may map these primitive types to their own native
 *          types as needed.
 * @since   0.1.0
 * @version 0.1.0
 */
type Primitive =
  'BINARY'
  | 'BOOLEAN'
  | 'DATETIME'
  | 'FLOAT'
  | 'INTEGER'
  | 'SERIAL'
  | 'TEXT'
  | 'UUID'
  | `VARCHAR(${number})`;

/**
 * @private Describes the properties of a column.
 * @since   0.1.0
 * @version 0.1.0
 */
type ColumnShape<T extends std.Schema = std.Schema> = {
  primitive: Primitive;
  schema: T;
  isNullable?: true;
  isPrimaryKey?: true;
  timestamp?: 'created' | 'updated';
  defaultFn?: () => std.input<T>;
  autogenerateFn?: () => std.input<T>;
};

/**
 * @private Defines a column of a table or a field in a document.
 *          Whatever floats your boat.
 * @since   0.1.0
 * @version 0.1.0
 */
type Column<T extends ColumnShape = ColumnShape> = T & {
  name: string;
};

/**
 * @private The shape of a table or document.
 * @since   0.1.0
 * @version 0.1.0
 */
type TableShape = {
  [columnName: string]: ColumnShape;
};

/**
 * @private Defines a table.
 * @since   0.1.0
 * @version 0.1.0
 */
type Table<T extends TableShape = TableShape> = {
  readonly [NAME]: string;
} & {
  [K in keyof T]: Column<T[K]>;
};

/**
 * @private Properties that indicate a column should definitely be
 *          skipped on insert.
 * @since   0.1.0
 * @version 0.1.0
 */
type SkipOnInsert = { primitive: 'SERIAL' };

/**
 * @private Properties that indicate a column should opitionally be
 *          present on insert.
 * @since   0.1.0
 * @version 0.1.0
 */
type OptionalOnInsert = { autogenerateFn: () => any } | { isNullable: true } | { defaultFn: () => any };

/**
 * @private Properties that indicate a column should definitely be
 *          skipped on updates.
 * @since   0.1.0
 * @version 0.1.0
 */
type SkipOnUpdate = { isPrimaryKey: true };

//////////////////////////////////////////////////////////////////////
///                          PUBLIC TYPES                          ///
//////////////////////////////////////////////////////////////////////

/**
 * @public  Infers the type of a row in the table or a document.
 * @since   0.1.0
 * @version 0.1.0
 */
export type Infer<T extends Table> = {
  [K in keyof T & string]: std.output<T[K]['schema']>;
};

/**
 * @public  Same as {@link Infer} but includes only the columns needed
 *          for insertion.
 * @since   0.1.0
 * @version 0.1.0
 */
export type InferForInsert<T extends Table> = Expand<{
  [K in keyof T & string as T[K] extends SkipOnInsert ? never : T[K] extends OptionalOnInsert ? never : K]: std.input<T[K]['schema']>;
} & {
  [K in keyof T & string as (T[K] extends OptionalOnInsert ? K : never)]?: std.input<T[K]['schema']>;
}>;

/**
 * @public  Same as {@link Infer} but includes only the columns that
 *          can be updated.
 * @since   0.1.0
 * @version 0.1.0
 */
export type InferForUpdate<T extends Table> = {
  [K in keyof T & string as T[K] extends SkipOnUpdate ? never : K]?: std.input<T[K]['schema']>;
};

//////////////////////////////////////////////////////////////////////
///                          PRIVATE API                           ///
//////////////////////////////////////////////////////////////////////

/**
 * @private Helper functions.
 * @since   0.1.0
 * @version 0.1.0
 */
namespace h {
  /**
   * @private Creates a column from its name and {@link ColumnShape}.
   * @since   0.1.0
   * @version 0.1.0
   */
  export const column = <T extends ColumnShape, S extends string>(name: S, shape: T, table: string) => ({
    ...shape,
    name,
    table,
  } satisfies Column<T>);

  /**
   * @private Validates that the given number is greater than or equal
   *          to the given value.
   * @since   0.1.0
   * @version 0.1.0
   */
  export const gte = (n: number, min: number) => {
    if (n < min) throw new Error(`Must be at least ${min}, got ${n}`);
    return n;
  };

  /**
   * @private Validates that the given number is less than or equal to
   *          the given value.
   * @since   0.1.0
   * @version 0.1.0
   */
  export const lte = (n: number, max: number) => {
    if (n > max) throw new Error(`Must be at most ${max}, got ${n}`);
    return n;
  };
}

//////////////////////////////////////////////////////////////////////
///                           PUBLIC API                           ///
//////////////////////////////////////////////////////////////////////

/**
 * Defines a column type with chainable modifiers.
 */
const defineType = <T extends std.Schema, S extends ColumnShape<T>>(shape: S) => ({
  ...shape,
  nullable: () => defineType<T, S & { isNullable: true }>({ ...shape, isNullable: true }),
  primaryKey: () => defineType<T, S & { isPrimaryKey: true }>({ ...shape, isPrimaryKey: true }),
  default: (fn: () => std.input<T>) => defineType<T, S & { defaultFn: typeof fn }>({ ...shape, defaultFn: fn }),
}) satisfies ColumnShape<T>;

/**
 * @public  Built-in column types.
 * @since   0.1.0
 * @version 0.1.0
 */
export const t = {
  /**
   * @public  A type that accepts binary data.
   * @since   0.1.0
   * @version 0.1.0
   */
  binary: () => defineType({
    primitive: 'BINARY',
    schema: z.instanceof(Uint8Array),
  }),
  /**
   * @public  A type that accepts booleans.
   * @since   0.1.0
   * @version 0.1.0
   */
  boolean: () => defineType({
    primitive: 'BOOLEAN',
    schema: z.boolean(),
  }),
  /**
   * @public  A type that accepts date-time or an ISO 8601 string.
   * @since   0.1.0
   * @version 0.1.0
   */
  datetime: <T extends 'created' | 'updated'>({ timestamp }: { timestamp?: T } = {}) => defineType({
    primitive: 'DATETIME',
    schema: z.coerce.date<string | Date>(),
    timestamp,
    autogenerateFn: () => new Date(),
  }),
  /**
   * @public  A type that accepts floats.
   * @since   0.1.0
   * @version 0.1.0
   */
  float: () => defineType({
    primitive: 'FLOAT',
    schema: z.number().min(0).max(Number.MAX_VALUE),
  }),
  /**
   * @public  A type that accepts integers.
   * @since   0.1.0
   * @version 0.1.0
   */
  integer: () => defineType({
    primitive: 'INTEGER',
    schema: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  }),
  /**
   * @public  An auto-incrementing integer type.
   * @since   0.1.0
   * @version 0.1.0
   */
  serial: () => defineType({
    primitive: 'SERIAL',
    schema: z.int().min(0).max(Number.MAX_SAFE_INTEGER),
  }),
  /**
   * @public  A type that accepts short strings.
   * @since   0.1.0
   * @version 0.1.0
   */
  string: ({ min = 0, max = 255 }: {
    min?: number,
    max?: number,
  } = {}) => defineType({
    primitive: `VARCHAR(${max})`,
    schema: z.string().min(h.gte(min, 0)).max(h.lte(max, 255)),
  }),
  /**
   * @public  A type that accepts long strings.
   * @since   0.1.0
   * @version 0.1.0
   */
  text: () => defineType({
    primitive: `TEXT`,
    schema: z.string(),
  }),
  /**
   * @public  A type that accepts UUID v7 strings.
   * @since   0.1.0
   * @version 0.1.0
   */
  uuidv7: () => defineType({
    primitive: 'UUID',
    schema: z.uuidv7(),
    autogenerateFn: uuidv7,
  })
};

/**
 * @public  Defines a table.
 * @since   0.1.0
 * @version 0.1.0
 */
export const table = <T extends TableShape>(name: string, shape: T) => {
  const columns = Object.fromEntries(
    Object
      .entries(shape)
      .map(([column, shape]) => [column, h.column(column, shape, name)]),
  );

  return { [NAME]: name, ...columns } as Table<{
    [K in keyof T]: Expand<Omit<T[K], 'nullable' | 'primaryKey' | 'default'>>;
  }>;
};
