import * as std from '@standard-schema/spec';

// // // // // // // // // // // // // // // // // // // // // // // //
//                        STANDARD SCHEMA API                        //
// // // // // // // // // // // // // // // // // // // // // // // //

/**
 * @public  The Standard Schema interface.
 * @since   0.1.0
 * @version 1
 */
export { type StandardSchemaV1 as Schema } from '@standard-schema/spec';

/**
 * @public  Infers the input type of a Standard Schema.
 * @since   0.1.0
 * @version 1
 */
export type input<T extends std.StandardSchemaV1> = std.StandardSchemaV1.InferInput<T>;

/**
 * @public  Infers the Input type of a Standard Schema.
 * @since   0.1.0
 * @version 1
 */
export type output<T extends std.StandardSchemaV1> = std.StandardSchemaV1.InferOutput<T>;

/**
 * @public  Use any standard schema to parse a value.
 * @since   0.1.0
 * @version 1
 */
export const parse = <T extends std.StandardSchemaV1>(schema: T, value: unknown) => {
  const parsed = schema['~standard'].validate(value);

  if (parsed instanceof Promise) {
    throw new Error('async standard schema validators are not supported');
  }

  return parsed as std.StandardSchemaV1.Result<output<T>>;
};

// // // // // // // // // // // // // // // // // // // // // // // //
//                               UTILS                               //
// // // // // // // // // // // // // // // // // // // // // // // //

const prependPath = (path: string | number | symbol) => (issue: std.StandardSchemaV1.Issue) => ({
  ...issue,
  path: [path, ...(issue.path ?? [])],
});

// // // // // // // // // // // // // // // // // // // // // // // //
//                        BUILT-IN VALIDATORS                        //
// // // // // // // // // // // // // // // // // // // // // // // //

/**
 * @public  Defines an array of a given standard schema.
 * @since   0.1.0
 * @version 1
 */
export type QxArray<T extends std.StandardSchemaV1> = std.StandardSchemaV1<
  input<T>[],
  output<T>[]
>;

/**
 * @public  Defines an array of a given standard schema.
 * @since   0.1.0
 * @version 1
 */
export const array = <T extends std.StandardSchemaV1>(schema: T): QxArray<T> => ({
  '~standard': {
    version: 1 as const,
    vendor: 'qx',
    validate: (input: unknown) => {
      if (!Array.isArray(input)) {
        return { issues: [{ message: 'must be an array' }] };
      }

      const issues: std.StandardSchemaV1.Issue[] = [];
      const value: any[] = [];

      for (let i = 0; i < input.length; i++) {
        const parsed = parse(schema, input[i]);

        parsed.issues
          ? issues.push(...parsed.issues.map(prependPath(i)))
          : value.push(parsed.value);
      }

      return issues.length > 0
        ? { issues }
        : { value: value as output<T>[] };
    },
  },
});

/**
 * @public  Defines a standard schema for boolean values.
 * @since   0.1.0
 * @version 1
 */
export type QxBoolean = std.StandardSchemaV1<boolean, boolean>;

/**
 * @public  Defines a standard schema for boolean values.
 * @since   0.1.0
 * @version 1
 */
export const boolean = (): QxBoolean => ({
  '~standard': {
    version: 1 as const,
    vendor: 'qx',
    validate: (input: unknown) => typeof input !== 'boolean'
      ? { issues: [{ message: 'must be a boolean' }] }
      : { value: input as boolean },
  },
});

/**
 * @public  Defines a standard schema for Date values that can be
 *          coerced from ISO 8601 strings or epoch timestamps in
 *          milliseconds.
 * @since   0.1.0
 * @version 1
 */
export type QxCoercibleDate = std.StandardSchemaV1<Date | string | number, Date>;

/**
 * @public  Defines a standard schema for Date values that can be
 *          coerced from ISO 8601 strings or epoch timestamps in
 *          milliseconds.
 * @since   0.1.0
 * @version 1
 */
export const date = (): QxCoercibleDate => ({
  '~standard': {
    version: 1 as const,
    vendor: 'qx',
    validate: (input: unknown) => {
      if (input instanceof Date) return isNaN(input.getTime())
        ? { issues: [{ message: 'must be a valid date' }] }
        :  { value: input };

      if (typeof input !== 'string' &&
          typeof input !== 'number') return { issues: [{ message: 'must be a valid ISO 8601 string or epoch timestamp in milliseconds' }] };

      const date = new Date(input);

      if (isNaN(date.getTime()))
          return { issues: [{ message: 'must be a valid ISO 8601 string or epoch timestamp in milliseconds' }] };

      return { value: date };
    },
  },
});

/**
 * @public  Defines a standard schema that validates instances of a
 *          given class.
 * @since   0.1.0
 * @version 1
 */
export type QxInstanceOf<T> = std.StandardSchemaV1<T, T>;

/**
 * @public  Defines a standard schema that validates instances of a
 *          given class.
 * @since   0.1.0
 * @version 1
 */
export const instanceOf = <T>(ctor: new (...args: any[]) => T): QxInstanceOf<T> => ({
  '~standard': {
    version: 1 as const,
    vendor: 'qx',
    validate: (input: unknown) => !(input instanceof ctor)
      ? { issues: [{ message: `must be an instance of ${ctor.name}` }] }
      : { value: input as T },
  },
});

/**
 * @public  Defines a standard schema for integers with optional min
 *          and max constraints.
 * @since   0.1.0
 * @version 1
 */
export type QxInteger = std.StandardSchemaV1<number, number>;

/**
 * @public  Defines a standard schema for integers with optional min and max constraints.
 * @since   0.1.0
 * @version 1
 */
export const integer = ({ min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER }: {
  min?: number,
  max?: number,
} = {}): QxInteger => ({
  '~standard': {
    version: 1 as const,
    vendor: 'qx',
    validate: (input: unknown) => {
      if (typeof input !== 'number') return { issues: [{ message: 'must be a integer' }] };
      if (Number.isNaN(input) || !Number.isFinite(input)) return { issues: [{ message: 'must be a integer' }] };
      if (!Number.isInteger(input)) return { issues: [{ message: 'must be a integer' }] };
      if (input < min) return { issues: [{ message: `must be greater than or equal to ${min}` }] };
      if (input > max) return { issues: [{ message: `must be less than or equal to ${max}` }] };

      return { value: input };
    },
  },
});

/**
 * @public  Makes any standard schema nullable.
 * @since   0.1.0
 * @version 1
 */
export type QxNullable<T extends std.StandardSchemaV1 = std.StandardSchemaV1> = std.StandardSchemaV1<
  input<T> | null,
  output<T> | null
>;

/**
 * @public  Makes any standard schema accepts `null` as a valid value.
 * @since   0.1.0
 * @version 1
 */
export const nullable = <T extends std.StandardSchemaV1>(schema: T): QxNullable<T> => ({
  '~standard': {
    version: 1 as const,
    vendor: 'qx',
    validate: (value: unknown) => value === null
      ? { value }
      : parse(schema, value),
  },
});

/**
 * @public  Defines a standard schema for numbers with optional min
 *          and max constraints.
 * @since   0.1.0
 * @version 1
 */
export type QxNumber = std.StandardSchemaV1<number, number>;

/**
 * @public  Defines a standard schema for numbers with optional min
 *          and max constraints.
 * @since   0.1.0
 * @version 1
 */
export const number = ({ min = Number.MIN_VALUE, max = Number.MAX_VALUE }: { min?: number, max?: number } = {}) => ({
  '~standard': {
    version: 1 as const,
    vendor: 'qx',
    validate: (input: unknown) => {
      if (typeof input !== 'number') return { issues: [{ message: 'must be a number' }] };
      if (Number.isNaN(input) || !Number.isFinite(input)) return { issues: [{ message: 'must be a number' }] };
      if (input < min) return { issues: [{ message: `must be greater than or equal to ${min}` }] };
      if (input > max) return { issues: [{ message: `must be less than or equal to ${max}` }] };

      return { value: input };
    },
  },
}) as QxNumber;

/**
 * @public  Defines an object schema that does not allow extra fields.
 * @since   0.1.0
 * @version 1
 */
type QxStrictObject<T extends Record<string, std.StandardSchemaV1>> = std.StandardSchemaV1<
  { [K in keyof T]: input<T[K]> },
  { [K in keyof T]: output<T[K]> }
>;

/**
 * @public  Defines an object schema that does not allow extra fields.
 * @since   0.1.0
 * @version 1
 */
export const strictObject = <T extends Record<string, std.StandardSchemaV1>>(shape: T): QxStrictObject<T> => ({
  '~standard': {
    version: 1 as const,
    vendor: 'qx',
    validate: (input: unknown) => {
      if (typeof input !== 'object' || input === null) {
        return { issues: [{ message: 'must be an object' }] };
      }

      const issues: std.StandardSchemaV1.Issue[] = [];

      const inputKeys = new Set(Object.keys(input));
      const shapeKeys = new Set(Object.keys(shape));

      // one issue for each key of `input` that doesn't exist in `shape`
      for (const key of inputKeys.difference(shapeKeys)) {
        issues.push({ path: [key], message: 'unknown field' });
      }

      // one issue for each key of `shape` that doesn't exist in `input`
      for (const key of shapeKeys.difference(inputKeys)) {
        issues.push({ path: [key], message: 'is required' });
      }

      const record: Record<string, any> = {};

      for (const [key, value] of Object.entries(input)) {
        const parsed = shape[key]!['~standard'].validate(value);

        if (parsed instanceof Promise) {
          throw new Error('async validators are not supported');
        }

        parsed.issues
          ? issues.push(...parsed.issues.map(prependPath(key)))
          : record[key] = parsed.value;
      }

      return issues.length > 0
        ? { issues }
        : { value: record as { [K in keyof T]: output<T[K]> } };
    },
  },
});

/**
 * @public  Defines a standard schema for strings with optional min
 *          and max length constraints.
 * @since   0.1.0
 * @version 1
 */
export type QxString = std.StandardSchemaV1<string, string>;

/**
 * @public  Defines a standard schema for strings with optional min
 *          and max length constraints.
 * @since   0.1.0
 * @version 1
 */
export const string = ({ min, max }: { min?: number, max?: number } = {}) => ({
  '~standard': {
    version: 1 as const,
    vendor: 'qx',
    validate: (input: unknown) => {
      if (typeof input !== 'string') return { issues: [{ message: 'must be a string' }] };
      if (min !== undefined && input.length < min) return { issues: [{ message: `must be at least ${min} characters long` }] };
      if (max !== undefined && input.length > max) return { issues: [{ message: `must be at most ${max} characters long` }] };

      return { value: input };
    },
  },
}) as QxString;
