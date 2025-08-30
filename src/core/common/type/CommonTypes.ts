export type Nullable<T> = T|null;

export type Optional<T> = T|undefined;

/**
 * Represents primitive data types commonly used in API responses and data transfer.
 * This includes basic serializable types without complex objects.
 */
export type PrimitiveValue = string | number | boolean | null;

/**
 * Represents the basic data types that can be found in LangGraph streaming data structures.
 * This includes primitive types and objects commonly used in workflow processing.
 */
export type LangGraphValue = string | number | boolean | object | null;
