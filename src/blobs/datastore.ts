import { Datastore as BaseDatastore } from "../dal/datastore";
import { Nullable } from "../types";
import { Blob } from "./models";

const BLOB_KIND = "blobs";

export class Datastore extends BaseDatastore {
  private static instance: Datastore = new Datastore();

  static getInstance(): Datastore {
    return Datastore.instance;
  }

  async getBlobById(blobId: string): Promise<Nullable<Blob>> {
    const query = this.gcds.createQuery(BLOB_KIND).filter("id", blobId);
    const results = await this.gcds.runQuery(query);
    if (results && results.length > 0 && results[0].length > 0) {
      const blob = results[0][0];
      return this.toBlob(blob);
    }
    return null;
  }

  async deleteBlobById(blobId: string): Promise<boolean> {
    const key = this.gcds.key([BLOB_KIND, blobId]);
    await this.gcds.delete(key);
    return true;
  }

  /**
   * Creates a new auth session object to track a login request.
   */
  async saveBlob(blob?: Blob): Promise<Blob> {
    // TODO - use an ID gen if id is not provided?
    blob = blob || new Blob();
    let dbBlob = this.toDBBlob(blob);
    if (blob.parentType.trim().length == 0) {
      throw new Error("Blobs must have a valid parent type");
    }
    if (blob.parentId.trim().length == 0) {
      throw new Error("Blobs must have a valid parent ID");
    }
    if (blob.userId.trim().length == 0) {
      throw new Error("Blobs must have a valid userId");
    }
    let newKey = this.gcds.key(BLOB_KIND);
    if (!blob.hasKey) {
      await this.gcds.save({
        key: newKey,
        data: dbBlob,
        excludeFromIndexes: ["contents"],
      });
      if (!newKey.id) {
        throw new Error("Blob key is invalid.  Save failed.");
      }
      blob.id = newKey.id;
      dbBlob = this.toDBBlob(blob);
    } else {
      newKey = this.gcds.key([BLOB_KIND, blob.id]);
    }

    // Now update with the
    await this.gcds.upsert({
      key: newKey,
      data: dbBlob,
      excludeFromIndexes: ["contents"],
    });
    return blob;
  }

  toBlob(dbBlob: any): Blob {
    return new Blob({
      id: dbBlob.id,
      parentType: dbBlob.parentType,
      parentId: dbBlob.parentId,
      userId: dbBlob.userId,
      contents: decodeURIComponent(dbBlob.contents),
    });
  }

  toDBBlob(blob: Blob): any {
    return {
      id: blob.id,
      parentId: blob.parentId,
      parentType: blob.parentType,
      userId: blob.userId,
      contents: encodeURIComponent(blob.contents),
    };
  }
}
