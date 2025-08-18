import { GlideElement } from './GlideElement';
import { ScopedGlideRecord } from './ScopedGlideRecord';

/**
 * The Scoped GlideElement API provides a number of convenient script methods for dealing with
 * fields and their values. Scoped GlideElement methods are available for the fields of the
 * current GlideRecord.
 */
interface ScopedGlideElement extends GlideElement {
  /**
   * Determines if the user's role permits the creation of new records in this field.
   *
   * @returns True if the field can be created, false otherwise.
   */
  canCreate(): boolean;

  /**
   * Indicates whether the user's role permits them to read the associated GlideRecord.
   *
   * @returns True if the field can be read, false otherwise.
   */
  canRead(): boolean;

  /**
   * Determines whether the user's role permits them to write to the associated GlideRecord.
   *
   * @returns True if the user can write to the field, false otherwise.
   */
  canWrite(): boolean;

  /**
   * Determines if the current field has been modified. This functionality is available for all
   * available data types, except Journal fields.
   *
   * @returns True if the fields have been changed, false if the field has not.
   */
  changes(): boolean;

  /**
   * Determines if the previous value of the current field matches the specified object.
   *
   * @param o An object value to check against the previous value of the current field.
   * @returns True if the previous value matches, false if it does not.
   */
  changesFrom(o: any): boolean;

  /**
   * Determines if the new value of a field, after a change, matches the specified object.
   *
   * @param o An object value to check against the new value of the current field.
   * @returns True if the new value matches, false if it does not.
   */
  changesTo(o: any): boolean;

  /**
   * Returns the number of milliseconds since January 1, 1970, 00:00:00 GMT for a duration field.
   * Does not require the creation of a GlideDateTime object because the duration field is already a
   * GlideDateTime object.
   *
   * @returns Number of milliseconds since January 1, 1970, 00:00:00 GMT.
   */
  dateNumericValue(): number;

  /**
   * Returns the value of the specified attribute from the dictionary.
   *
   * @param attributeName Attribute name
   * @returns Attribute value
   */
  getAttribute(attributeName: string): string;

  /**
   * Returns the Boolean value of the specified attribute from the dictionary.
   *
   * @param attributeName Attribute name
   * @returns Boolean value of the attribute. Returns false if the attribute does not exist.
   */
  getBooleanAttribute(attributeName: string): boolean;

  /**
   * Generates a choice list for a field.
   *
   * @param dependent A dependent value
   * @returns The choice list.
   */
  getChoices(dependent?: string): Array<any>;

  /**
   * Returns the choice label for the current choice.
   *
   * @returns The selected choice's label.
   */
  getChoiceValue(): string;

  /**
   * Returns the clear text value for Password (2 way encrypted) fields in scoped applications.
   *
   * @returns The clear text password.
   */
  getDecryptedValue(): string;

  /**
   * Gets the formatted display value of the field.
   *
   * @param maxCharacters Maximum characters desired
   * @returns The display value of the field
   */
  getDisplayValue(maxCharacters?: number): string;

  /**
   * Returns the field's element descriptor.
   *
   * @returns The field's element descriptor.
   */
  getED(): any;

  /**
   * Returns the phone number in international format.
   *
   * @returns The phone number in international format.
   */
  getGlobalDisplayValue(): string;

  /**
   * Returns the HTML value of a field.
   *
   * @param maxChars Maximum number of characters to return.
   * @returns HTML value for the field.
   */
  getHTMLValue(maxChars?: number): string;

  /**
   * Returns either the most recent journal entry or all journal entries.
   *
   * @param mostRecent If 1, returns the most recent entry. If -1, returns all journal entries.
   * @returns For the most recent entry, returns a string that contains the field label, timestamp,
   * and user display name of the journal entry. For all journal entries, returns the same
   * information for all journal entries ever entered as a single string with each entry delimited
   * by "\n\n".
   */
  getJournalEntry(mostRecent: number): string;

  /**
   * Returns the object label.
   *
   * @returns Object label
   */
  getLabel(): string;

  /**
   * Returns the name of the field.
   *
   * @returns Field name
   */
  getName(): string;

  /**
   * Gets the table name for a reference element.
   *
   * @returns The table name of the reference
   */
  getReferenceTable(): string;

  /**
   * Returns a GlideRecord object for a given reference element.
   *
   * @returns A GlideRecord object
   */
  getRefRecord(): ScopedGlideRecord<any> | null;

  /**
   * Returns the name of the table on which the field resides.
   *
   * @returns Name of the table. The returned value may be different from the table Class that the
   * record is in. See Tables and Classes in the product documentation.
   */
  getTableName(): string;

  /**
   * Determines if a field is null.
   *
   * @returns True if the field is null or an empty string, false if not.
   */
  nil(): boolean;

  /**
   * Sets the value of a date/time element to the specified number of milliseconds since January 1,
   * 1970 00:00:00 GMT.
   *
   * @param milliseconds Number of milliseconds since 1/1/1970
   */
  setDateNumericValue(milliseconds: number): void;

  /**
   * Sets the display value of the field.
   *
   * @param value The value to set for the field.
   */
  setDisplayValue(value: any): void;

  /**
   * Adds an error message. Available in Fuji patch 3.
   *
   * @param errorMessage The error message.
   */
  setError(errorMessage: string): void;

  /**
   * Sets the field to the specified phone number.
   *
   * @param phoneNumber The phone number to set. This can be in either the international or local
   * format.
   * @param strict When true, specifies that the number specified must match the correct format.
   * When false, the system attempts to correct an improperly formatted phone number.
   * @returns True if the value was set, false if it was not.
   */
  setPhoneNumber(phoneNumber: any, strict: boolean): boolean;

  /**
   * Sets the value of a field.
   *
   * @param value Object value to set the field to.
   */
  setValue(value: any): void;
}

export { ScopedGlideElement };
