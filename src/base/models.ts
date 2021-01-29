import { Timestamp, Nullable } from "../../tsutils/types";

export class BaseEntity {
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;

  constructor(config?: any) {
    config = config || {};
    this.isActive = config.isActive == false ? false : true;
    this.createdAt = config.createdAt || Date.now();
    this.updatedAt = config.createdAt || Date.now();
  }
}
