/**
 * Represents the properties that must be defined on a ServiceNow class prototype
 */
interface ClassCreated {
  initialize(...args: any[]): void;
  type: string;
  [key: string]: any; // Allow additional properties and methods
}

/**
 * Represents a ServiceNow class constructor function returned by Class.create()
 */
interface ClassConstructor<T extends ClassCreated = ClassCreated> {
  prototype: T;
}

/**
 * The global Class factory object used to create ServiceNow script includes
 */
interface ClassFactory {
  /**
   * Creates a new ServiceNow class constructor
   * @returns A constructor function that can be used to create instances
   */
  create<T extends ClassCreated = ClassCreated>(): ClassConstructor<T>;
}

/**
 * Global Class object available in ServiceNow server-side scripts
 */
declare const Class: ClassFactory;

// Export the ClassConstructor type for better type inference
export { ClassConstructor, ClassCreated, ClassFactory };

// Also export Class as a type for backward compatibility
export type Class<T extends ClassCreated = ClassCreated> = ClassConstructor<T>;
