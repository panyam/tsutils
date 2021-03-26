import { TEvent, EventHub } from "../comms/events";
import { Nullable } from "../types";
const axios = require("axios").default;

export enum ResourceApiEvent {
  LIST_STARTED = "LIST_STARTED",
  LIST_FINISHED = "LIST_FINISHED",
  LIST_FAILED = "LIST_FAILED",

  CREATE_STARTED = "CREATE_STARTED",
  CREATE_FINISHED = "CREATE_FINISHED",
  CREATE_FAILED = "CREATE_FAILED",

  BATCH_GET_STARTED = "BATCH_GET_STARTED",
  BATCH_GET_FINISHED = "BATCH_GET_FINISHED",
  BATCH_GET_FAILED = "BATCH_GET_FAILED",

  GET_STARTED = "GET_STARTED",
  GET_FINISHED = "GET_FINISHED",
  GET_FAILED = "GET_FAILED",

  DELETE_STARTED = "DELETE_STARTED",
  DELETE_FINISHED = "DELETE_FINISHED",
  DELETE_FAILED = "DELETE_FAILED",

  UPDATE_STARTED = "UPDATE_STARTED",
  UPDATE_FINISHED = "UPDATE_FINISHED",
  UPDATE_FAILED = "UPDATE_FAILED",
}

export abstract class ResourceApi<ResType> extends EventHub {
  abstract urlForGet(resId: string, params: any): string;
  abstract urlForBatchGet(resIds: string[]): string;
  abstract urlForDelete(resId: string, params: any): string;
  abstract urlForUpdate(resId: string, params: any): string;
  abstract urlForList(params: any): string;
  abstract urlForCreate(params: any): string;

  abstract processListResponse(response: Response): ResType[];
  abstract processGetResponse(response: Response): Nullable<ResType>;
  abstract processDeleteResponse(response: Response): boolean;
  abstract processUpdateResponse(response: Response): ResType;
  abstract processCreateResponse(response: Response): ResType;
  abstract processUpdateParams(params: any): any;
  abstract processCreateParams(params: any): any;

  create(params: any): void {
    this.dispatchEvent(new TEvent(ResourceApiEvent.CREATE_STARTED, this));
    const url = this.urlForCreate(params);
    axios
      .post(url, this.processCreateParams(params))
      .then((response: Response) => {
        this.dispatchEvent(new TEvent(ResourceApiEvent.CREATE_FINISHED, this, this.processListResponse(response)));
      })
      .error((err: Error) => {
        this.dispatchEvent(new TEvent(ResourceApiEvent.CREATE_FAILED, this, err));
      });
  }

  batchGet(...resIds: string[]): void {
    this.dispatchEvent(new TEvent(ResourceApiEvent.BATCH_GET_STARTED, this));
    const url = this.urlForBatchGet(resIds);
    axios
      .get(url)
      .then((response: Response) => {
        this.dispatchEvent(new TEvent(ResourceApiEvent.BATCH_GET_FINISHED, this, this.processGetResponse(response)));
      })
      .error((err: Error) => {
        this.dispatchEvent(new TEvent(ResourceApiEvent.BATCH_GET_FAILED, this, err));
      });
  }

  get(resId: string, params: any): void {
    this.dispatchEvent(new TEvent(ResourceApiEvent.GET_STARTED, this));
    const url = this.urlForGet(resId, params);
    axios
      .get(url)
      .then((response: Response) => {
        this.dispatchEvent(new TEvent(ResourceApiEvent.GET_FINISHED, this, this.processGetResponse(response)));
      })
      .error((err: Error) => {
        this.dispatchEvent(new TEvent(ResourceApiEvent.GET_FAILED, this, err));
      });
  }

  list(params: any): void {
    this.dispatchEvent(new TEvent(ResourceApiEvent.LIST_STARTED, this));
    const url = this.urlForList(params);
    axios
      .get(url)
      .then((response: Response) => {
        this.dispatchEvent(new TEvent(ResourceApiEvent.LIST_FINISHED, this, this.processListResponse(response)));
      })
      .error((err: Error) => {
        this.dispatchEvent(new TEvent(ResourceApiEvent.LIST_FAILED, this, err));
      });
  }

  update(resId: string, params: any): void {
    this.dispatchEvent(new TEvent(ResourceApiEvent.UPDATE_STARTED, this));
    const url = this.urlForUpdate(resId, params);
    axios
      .post(url, this.processUpdateParams(params))
      .then((response: Response) => {
        this.dispatchEvent(new TEvent(ResourceApiEvent.UPDATE_FINISHED, this, this.processListResponse(response)));
      })
      .error((err: Error) => {
        this.dispatchEvent(new TEvent(ResourceApiEvent.UPDATE_FAILED, this, err));
      });
  }

  delete(resId: string, params: any): void {
    this.dispatchEvent(new TEvent(ResourceApiEvent.DELETE_STARTED, this));
    const url = this.urlForDelete(resId, params);
    axios({
      method: "delete",
      url: url,
    })
      .then((response: Response) => {
        this.dispatchEvent(new TEvent(ResourceApiEvent.DELETE_FINISHED, this, this.processListResponse(response)));
      })
      .error((err: Error) => {
        this.dispatchEvent(new TEvent(ResourceApiEvent.DELETE_FAILED, this, err));
      });
  }
}
