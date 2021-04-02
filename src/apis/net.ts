/**
 * A helper for building URLs.
 */
export class URLBuilder {
  baseUrl: string;
  path: string;
  params: any = [];
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  appendPath(path: string): this {
    if (!this.baseUrl.endsWith("/") && !path.startsWith("/")) {
      this.baseUrl += "/";
    }
    this.baseUrl += path;
    return this;
  }

  addParam(key: string, value: string): this {
    this.params.push([key, value]);
    return this;
  }

  addParams(params: any): this {
    for (const key in params) {
      this.addParam(key, params[key]);
    }
    return this;
  }

  build(): string {
    const url = this.baseUrl;
    const path = this.path;
    const params = this.params;
    const paramString = params
      .map((item: any, _index: number) => {
        const [key, value] = item;
        return encodeURIComponent(key) + "=" + encodeURIComponent(value);
      })
      .join("&");
    if (paramString.length > 0) {
      return url + (url.indexOf("?") >= 0 ? "&" : "?") + paramString;
    } else {
      return url;
    }
  }
}

export class Request {
  url: string;
  options: any;

  constructor(url: string, options: any) {
    this.url = url;
    this.options = options || {};
    this.options.headers = this.options.headers || {};
    this.options.body = this.options.body || null;
  }

  get method(): string {
    return this.options.method || "GET";
  }

  set method(method: string) {
    this.options.method = method;
  }

  get body(): any {
    return this.options.body;
  }

  set body(body: any) {
    this.options.body = body;
  }

  get headers(): any {
    return this.options.headers;
  }

  get contentType(): string {
    return this.options.contentType;
  }
}

export class Response {
  status: number;
  statusText: string;
  headers: any = {};
  data: any = null;
  error: any = null;

  constructor(status = 200, statusText = "", data: any = null) {
    this.status = status;
    this.statusText = statusText;
    this.data = data;
  }
}
