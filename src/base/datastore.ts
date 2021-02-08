import { Datastore as GCDatastore } from "@google-cloud/datastore";

export class Datastore {
  protected gcds: GCDatastore;
  protected apiEndpoint: string;

  constructor(apiEndpoint = "") {
    this.apiEndpoint = apiEndpoint.trim();
    if (this.apiEndpoint.length == 0) {
      this.gcds = new GCDatastore();
    } else {
      this.gcds = new GCDatastore({
        apiEndpoint: this.apiEndpoint,
      });
    }
  }
}
