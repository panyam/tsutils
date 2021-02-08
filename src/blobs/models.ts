import { Timestamp, Nullable } from "../../tsutils/types";
import { BaseEntity } from "../../tsutils/base/models";

export class Blob extends BaseEntity {
  // A unique ID for this blob
  id: string;

  // Type and ID of the parent resource of the type
  parentType: string;
  parentId: string;

  // Owner of this blob
  userId: string;

  // Contents of this blob where data is stored
  contents: string;

  constructor(config?: any) {
    super((config = config || {}));
    this.id = config.id || "";
    this.parentType = config.parentType || "";
    this.parentId = config.parentId || "";
    this.userId = config.userId || "";
    this.contents = config.contents || "Hello World";
  }

  // And others things here
  get hasKey(): boolean {
    return this.id.trim().length > 0;
  }
}
