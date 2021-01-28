import { Timestamp, Nullable } from "../../lib/types";
import { BaseEntity } from "../core/models";

export class CallbackRequest {
  hostname: string;

  path: string;

  // Method to call the callback URL on
  method: string;

  // For POST/PUT methods
  rawBody: string;

  // Headers for this request
  headers: any;

  constructor(config: any) {
    config = config || {};
    this.hostname = config.hostname;
    this.path = config.path || "/";
    if (config.url && config.url.length > 0) {
      // parse hostnamea and path from url
      if (config.url.indexOf("://") < 0) {
        throw new Error(
          "Invalid URL: " +
            config.url +
            ".  Please use hostname and path instead."
        );
      }
      const u = new URL(config.url);
      console.log("Parsed URL: ", u);
    }
    this.method = config.method || "GET";
    this.headers = config.headers || {};
    this.rawBody = config.rawBody || "";
  }

  get fullURL(): string {
    if (!this.hostname.endsWith("/") && !this.path.startsWith("/")) {
      return this.hostname + "/" + this.path;
    } else {
      return this.hostname + this.path;
    }
  }
}

export type AuthFlowCallback = (
  authFlow: AuthFlow,
  req: any,
  res: any,
  next: any
) => void;

export class AuthFlow extends BaseEntity {
  // A unique Auth Session ID
  id: string;

  // Kind of login being done
  provider: string;

  // When this Auth session expires;
  expiresIn: Timestamp;

  // Call back URL for where the session needs to endup on success
  // callback: CallbackRequest;

  // Handler that will continue the flow after a successful AuthFlow.
  handlerName: string;

  // Parameters for the handler to continue with.
  handlerParams: any;

  constructor(config?: any) {
    super((config = config || {}));
    this.id = config.id || "";
    this.provider = config.provider || "";
    // this.callback = new CallbackRequest(config.callback || null);
    // Expires in 5 mins by default
    this.expiresIn = config.expiresIn || 300;
    // this.purpose = config.purpose || "login";
    this.handlerName = config.handlerName || "login";
    this.handlerParams = config.handlerParams || {};
  }

  // And others things here
  get hasKey(): boolean {
    return this.id.trim().length > 0;
  }
}

export class User extends BaseEntity {
  id: string;
  name: string;
  email: string;
  phone: string;
  channelKey: string;

  constructor(config?: any) {
    super((config = config || {}));
    this.id = config.id || "";
    this.name = config.name || "";
    this.email = config.email || "";
    this.phone = config.phone || "";
    this.channelKey = config.channelKey || "";
  }

  get hasChannel(): boolean {
    return this.channelKey.trim().length > 0;
  }

  // And others things here
  get hasKey(): boolean {
    return this.id.trim().length > 0;
  }
}

export class Channel extends BaseEntity {
  provider: string;
  loginId: string;

  /**
   * Credentials for this channel (like access tokens, passwords etc).
   */
  credentials: any;

  /**
   * Profile as passed by the provider of the channel.
   */
  profile: any;

  /**
   * When does this channel expire and needs another login/auth.
   */
  expiresIn: Nullable<Timestamp>;

  constructor(config?: any) {
    super((config = config || {}));
    this.provider = config.provider || "";
    this.loginId = config.loginId || "";
    this.credentials = config.credentials || {};
    this.expiresIn = config.expiresIn || null;
  }

  get hasKey(): boolean {
    return this.provider.trim().length > 0 && this.loginId.trim().length > 0;
  }

  get key(): string {
    return this.provider + ":" + this.loginId;
  }
}
