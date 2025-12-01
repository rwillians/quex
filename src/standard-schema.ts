import { type StandardSchemaV1 } from '@standard-schema/spec';

/**
 * @public  The Standard Schema interface.
 * @since   0.1.0
 * @version 0.1.0
 */
export { type StandardSchemaV1 as Schema } from '@standard-schema/spec';

/**
 * @public  Infers the input type of a Standard Schema.
 * @since   0.1.0
 * @version 0.1.0
 */
export type input<T extends StandardSchemaV1> = StandardSchemaV1.InferInput<T>;

/**
 * @public  Infers the Input type of a Standard Schema.
 * @since   0.1.0
 * @version 0.1.0
 */
export type output<T extends StandardSchemaV1> = StandardSchemaV1.InferOutput<T>;
