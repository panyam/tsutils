import { BaseEntity } from "../dal/models";

export class Blob extends BaseEntity {
  // A unique ID for this blob.  This
  // MUST be provided by the USER so that
  // the user can lookup this resource again
  // if needed.
  id: string;

  // Type and ID of the parent resource of the type
  parentType: string;
  parentId: string;

  // Owner of this blob
  userId: string;

  // Contents of this blob where data is stored
  // Stored as raw object - could be strings or json
  contents: any;

  // Version of the blob
  version = "v1";

  constructor(config?: any) {
    super((config = config || {}));
    this.id = config.id || "";
    this.parentType = config.parentType || "";
    this.parentId = config.parentId || "";
    this.userId = config.userId || "";
    this.version = config.version || "v1";
    this.contents = config.contents || "Hello World";
  }

  // And others things here
  get hasKey(): boolean {
    return this.id.trim().length > 0;
  }
}
