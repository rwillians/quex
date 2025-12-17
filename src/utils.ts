/**
 * @private Converts a snake_case string to camelCase at the type
 *          level.
 * @since   0.1.17
 * @version 1
 */
type CamelCase<S extends string> = S extends `${infer T}_${infer U}`
  ? `${T}${Capitalize<CamelCase<U>>}`
  : S;

/**
 * @private Converts a camelCase string to snake_case at the type
 *          level.
 * @since   0.1.17
 * @version 1
 */
type SnakeCase<S extends string> = S extends `${infer T}${infer U}`
  ? U extends Uncapitalize<U>
    ? `${Lowercase<T>}${SnakeCase<U>}`
    : `${Lowercase<T>}_${SnakeCase<Uncapitalize<U>>}`
  : S;

/**
 * @private Converts a snake_case string to camelCase.
 * @since   0.1.0
 * @version 2
 */
export const camelCase = <T extends string>(str: T) => str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()) as CamelCase<T>;

/**
 * @private Same as {@link Object.prototype.entries} but with better
 *          types.
 * @since   0.1.17
 * @version 1
 */
export const entries = <T extends Record<string, any>>(obj: T) => Object.entries(obj) as [keyof T, T[keyof T]][];

/**
   * @private Simplified check for plain objects.
   * @since   0.1.0
   * @version 1
   */
export const isPlainObject = (value: unknown): value is Record<string, any> => {
  if (typeof value !== 'object' || value === null) return false;

  let proto = Object.getPrototypeOf(value);
  if (proto === null) return true;

  return proto === Object.prototype;
};

/**
 * @private Same as {@link Object.prototype.keys} but with better
 *          types.
 * @since   0.1.17
 * @version 1
 */
export const keys = <T extends Record<string, any>>(obj: T) => Object.keys(obj) as (keyof T)[];

/**
   * @private Throws an error if the given number is greater than the
   *          specified maximum.
   * @since   0.1.0
   * @version 1
   */
export const lte = (n: number, max: number) => {
  if (n > max) throw new Error(`Must be at most ${max}, got ${n}`);
  return n;
};

/**
 * @public  Maps over the keys of an object.
 * @since   0.1.0
 * @version 1
 */
export const mapKeys = <T extends Record<string, any>, U extends string>(
  obj: T,
  fn: (key: keyof T) => U,
): { [K in U]: T[keyof T] } => Object.fromEntries(
  entries(obj).map(([key, value]) => [fn(key), value] as const),
) as { [K in U]: T[keyof T] };

/**
 * @private Maps over the values of an object.
 * @since   0.1.0
 * @version 1
 */
export const mapValues = <T extends Record<string, any>, U>(
  obj: T,
  fn: (value: T[keyof T], key: keyof T) => U,
): { [K in keyof T]: U } => Object.fromEntries(
  entries(obj).map(([key, value]) => [key, fn(value, key as keyof T)] as const),
) as { [K in keyof T]: U };

/**
   * @private Resolves the given value or function to a value.
   * @since   0.1.0
   * @version 1
   */
export const resolve = <T>(value: T | (() => T)): T => typeof value === 'function'
  ? (value as (() => T))()
  : value;

/**
 * @private Converts a camelCase string to snake_case.
 * @since   0.1.0
 * @version 1
 */
export const snakeCase = <T extends string>(str: T) => str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`) as SnakeCase<T>;

/**
   * @public  Wraps the given value in an array, unless it's already an
   *          array.
   * @since   0.1.0
   * @version 1
   */
export const wrap = <T>(value: T | T[]): T[] => Array.isArray(value)
  ? value
  : [value];
