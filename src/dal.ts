import { Timestamp } from "./types";

export class BaseEntity {
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;

  constructor(config?: any) {
    config = config || {};
    this.isActive = config.isActive == false ? false : true;
    this.createdAt = config.createdAt || Date.now();
    this.updatedAt = config.updatedAt || Date.now();
  }
}

export class Resource extends BaseEntity {
  // Collection ID
  id: string;

  // Owner/Creator of this collection
  userId: string;

  // Visibility status
  visibility: "public" | "private" | "limited";

  // Who can see this score
  visibleTo: string[];

  constructor(config?: any) {
    super((config = config || {}));
    this.id = "" + (config.id || "");
    this.userId = "" + (config.userId || "");
    this.visibleTo = config.visibleTo || [];
    this.visibility = (config.visibility || "private").toLowerCase();
  }

  isVisibleTo(userId: string | null): boolean {
    return this.userId == userId || this.visibility == "public";
  }

  // TODO - move this to schema and/or decorators
  get version(): number {
    return 0;
  }

  // And others things here
  get hasKey(): boolean {
    return this.id.trim().length > 0;
  }
}
