import { StringMap, Nullable } from "../types";
const axios = require("axios").default;

export abstract class ResourceApi<ResType> {
  abstract urlForGet(resId: string, params: any): string;
  abstract urlForBatchGet(resIds: string[]): string;
  abstract urlForDelete(resId: string, params: any): string;
  abstract urlForUpdate(resId: string, params: any): string;
  abstract urlForList(params: any): string;
  abstract urlForCreate(params: any): string;

  abstract processListResponse(response: Response): ResType[];
  abstract processBatchGetResponse(response: Response): StringMap<ResType>;
  abstract processGetResponse(response: Response): Nullable<ResType>;
  abstract processDeleteResponse(response: Response): boolean;
  abstract processUpdateResponse(response: Response): ResType;
  abstract processCreateResponse(response: Response): ResType;
  abstract processUpdateParams(params: any): any;
  abstract processCreateParams(params: any): any;

  async create(params: any): Promise<ResType> {
    const url = this.urlForCreate(params);
    const response = await axios.post(url, this.processCreateParams(params));
    return this.processCreateResponse(response);
  }

  async batchGet(...resIds: string[]): Promise<StringMap<ResType>> {
    const url = this.urlForBatchGet(resIds);
    const response = await axios.get(url);
    return this.processBatchGetResponse(response);
  }

  async get(resId: string, params: any): Promise<Nullable<ResType>> {
    const url = this.urlForGet(resId, params);
    const response = await axios.get(url);
    return this.processGetResponse(response);
  }

  async list(params: any): Promise<ResType[]> {
    const url = this.urlForList(params);
    const response = await axios.get(url);
    return this.processListResponse(response);
  }

  async update(resId: string, params: any): Promise<ResType> {
    const url = this.urlForUpdate(resId, params);
    const response = axios.post(url, this.processUpdateParams(params));
    return this.processUpdateResponse(response);
  }

  async delete(resId: string, params: any): Promise<boolean> {
    const url = this.urlForDelete(resId, params);
    const response = await axios({ method: "delete", url: url });
    return this.processDeleteResponse(response);
  }
}
