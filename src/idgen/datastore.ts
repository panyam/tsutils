import { Datastore as BaseDatastore } from "../dal/datastore";
import { Nullable } from "../types";
import { ID } from "./models";

export class Datastore extends BaseDatastore {
  readonly namespace: string;
  readonly generator: () => string;

  constructor(namespace: string, generator: () => string) {
    super();
    this.namespace = namespace;
    this.generator = generator;
  }

  get tableName(): string {
    return "IDGen_" + this.namespace;
  }

  async nextID(ownerId: string, expiresAt = -1): Promise<ID> {
    let id = "";
    while (true) {
      id = this.generator();
      const query = this.gcds.createQuery(this.tableName).filter("id", id);
      const results = await this.gcds.runQuery(query);
      if (!results || (results.length > 0 && results[0].length == 0)) break;
    }
    // Found one
    const res = new ID({
      id: id,
      ownerId: ownerId,
      expiresAt: expiresAt,
    });
    return await this.saveId(res);
  }

  async getID(id: string): Promise<Nullable<ID>> {
    const query = this.gcds.createQuery(this.tableName).filter("id", id);
    const results = await this.gcds.runQuery(query);
    if (results && results.length > 0 && results[0].length > 0) {
      return this.toId(results[0][0]);
    }
    return null;
  }

  async deleteById(id: string): Promise<boolean> {
    const key = this.gcds.key([this.tableName, id]);
    await this.gcds.delete(key);
    return true;
  }

  /**
   * Creates a new auth session object to track a login request.
   */
  async saveId(id: ID): Promise<ID> {
    // TODO - use an ID gen if id is not provided?
    const dbId = this.toDBId(id);
    if (id.id.trim().length == 0) {
      throw new Error("ID objects must have a valid id");
    }
    if (id.ownerId.trim().length == 0) {
      throw new Error("IDs must have a valid ownerId");
    }
    const newKey = this.gcds.key([this.tableName, id.id]);

    // Now update with the
    await this.gcds.upsert({
      key: newKey,
      data: dbId,
      excludeFromIndexes: [],
    });
    return id;
  }

  toId(dbId: any): ID {
    return new ID({
      id: dbId.id,
      ownerId: dbId.ownerId,
      createdAt: dbId.createdAt,
      updatedAt: dbId.updatedAt,
      expiresAt: dbId.expiresAt,
    });
  }

  toDBId(id: ID): any {
    return {
      id: id.id,
      ownerId: id.ownerId,
      createdAt: id.createdAt,
      updatedAt: id.updatedAt,
      expiresAt: id.expiresAt,
    };
  }
}
