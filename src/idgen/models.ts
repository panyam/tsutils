import { BaseEntity } from "../dal/models";

export class ID extends BaseEntity {
  // A unique ID
  // A unique ID for this blob.  This
  // MUST be provided by the USER so that
  // the user can lookup this resource again
  // if needed.
  id: string;

  // Owner of this ID - a way of knowing who is using the ID
  ownerId: string;

  // IDs can also expire there by allowing reuse
  // -1 => Never being reused.
  expiresAt: number;

  constructor(config?: any) {
    super((config = config || {}));
    this.id = config.id || "";
    this.ownerId = config.userId || "";
    this.expiresAt = config.expiresAt || -1;
  }

  // And others things here
  get hasKey(): boolean {
    return this.id.trim().length > 0;
  }
}
