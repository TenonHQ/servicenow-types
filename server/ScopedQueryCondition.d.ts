import { QueryOperator } from '../util';

/**
 * The scoped GlideQueryCondition API provides additional filtering capabilities that can be
 * used in addition to the existing GlideRecord filters (addQuery and addEncodedQuery). 
 * GlideQueryCondition allows you to build complex queries using multiple conditions and logical operators.
 */
interface ScopedQueryCondition {
    /**
     * Adds an AND condition to the current condition.
     *
     * @param name The name of a field.
     * @param value The value to query on.
     * @returns A reference to a GlideQueryCondition object.
     */
    addCondition(name: string, value: any): ScopedQueryCondition;

    /**
     * Adds an AND condition to the current condition.
     *
     * @param name The name of a field.
     * @param oper The operator for the query.
     * @param value The value to query on.
     * @returns A reference to a GlideQueryCondition object.
     */
    addCondition(name: string, oper: QueryOperator, value: any): ScopedQueryCondition;

    /**
     * Appends a 2-or-3 parameter OR condition to an existing GlideQueryCondition.
     *
     * @param name Field name
     * @param value The value to query on.
     * @returns A reference to a GlideQueryCondition object.
     */
    addOrCondition(name: string, value: any): ScopedQueryCondition;

    /**
     * Appends a 2-or-3 parameter OR condition to an existing GlideQueryCondition.
     *
     * @param name Field name
     * @param oper Query operator.
     * @param value The value to query on.
     * @returns A reference to a GlideQueryCondition object.
     */
    addOrCondition(name: string, oper: QueryOperator, value: any): ScopedQueryCondition;
}

export { ScopedQueryCondition };