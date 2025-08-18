import { SNAPIGlideElementDescriptor } from './SNAPIGlideElementDescriptor';
/**
 * The scoped GlideElementDescriptor API provides information about fields,
 * including the field's data type, display name, and whether the field is mandatory.
 */
interface ScopedElementDescriptor extends SNAPIGlideElementDescriptor {
  /**
   * Returns the encryption type used for attachments on the element's table.
   *
   * @returns The encryption type used on attachments. Returns null if attachments on the element's
   * table are not being encrypted.
   */
  getAttachmentEncryptionType(): string;

  /**
   * Returns the element's internal data type.
   *
   * @returns The element's internal data type.
   */
  getInternalType(): string;

  /**
   * Returns the element's label.
   *
   * @returns The element's label.
   */
  getLabel(): string;

  /**
   * Returns the element's length.
   *
   * @returns The element's size.
   */
  getLength(): number;

  /**
   * Returns the element's name.
   *
   * @returns The element's name.
   */
  getName(): string;

  /**
   * Returns the element's plural label.
   *
   * @returns The element's plural label.
   */
  getPlural(): string;

  /**
   * Returns true if an encrypted attachment has been added to the table.
   *
   * @returns Returns true if an encrypted attachment has been added to the table.
   */
  hasAttachmentsEncrypted(): boolean;

  /**
   * Returns true if the element is an array.
   *
   * @returns Returns true if the element is an array, false otherwise.
   */
  isArray(): boolean;

  /**
   * Returns true if the element is defined as a dropdown choice in its dictionary definition.
   *
   * @returns Returns true if the element is defined as a dropdown choice. Returns true even if
   * there are no entries defined in the choice table. The last choice type, suggestion, does not
   * return true.
   */
  isChoice(): boolean;

  /**
   * Returns true if an element is encrypted.
   *
   * @returns Returns true if the element is encrypted, false otherwise.
   */
  isEdgeEncrypted(): boolean;

  /**
   * Returns true if the element is a virtual element.
   *
   * @returns Returns true if the element is a virtual element.
   */
  isVirtual(): boolean;
}

export { ScopedElementDescriptor };
