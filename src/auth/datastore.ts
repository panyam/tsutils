import { Datastore as BaseDatastore } from "../dal/datastore";
import { Nullable } from "../types";
import { User, Channel, AuthFlow } from "./models";

const USER_KIND = "user";
const CHANNEL_KIND = "channel";
const AUTH_FLOW_KIND = "authflow";

export class Datastore extends BaseDatastore {
  private static instance: Datastore = new Datastore();
  static getInstance(): Datastore {
    return Datastore.instance;
  }

  async getChannelByKey(key: string): Promise<Nullable<Channel>> {
    const [provider, loginId] = key.split(":");
    return this.getChannel(provider, loginId);
  }

  async getChannel(provider: string, loginId: string): Promise<Nullable<Channel>> {
    const query = this.gcds.createQuery(CHANNEL_KIND).filter("provider", provider).filter("loginId", loginId);
    const results = await this.gcds.runQuery(query);
    if (results && results.length > 0 && results[0].length > 0) {
      const channel = results[0][0];
      return this.toChannel(channel);
    }
    return null;
  }

  async getUserByChannel(channelKey: string): Promise<Nullable<User>> {
    const query = this.gcds.createQuery(USER_KIND).filter("channelKey", channelKey);
    const results = await this.gcds.runQuery(query);
    if (results && results.length > 0 && results[0].length > 0) {
      const user = results[0][0];
      return this.toUser(user);
    }
    return null;
  }

  async getUserById(userId: string): Promise<Nullable<User>> {
    const query = this.gcds.createQuery(USER_KIND).filter("id", userId);
    const results = await this.gcds.runQuery(query);
    if (results && results.length > 0 && results[0].length > 0) {
      const user = results[0][0];
      return this.toUser(user);
    }
    return null;
  }

  async getAuthFlowById(authFlowId: string): Promise<Nullable<AuthFlow>> {
    const query = this.gcds.createQuery(AUTH_FLOW_KIND).filter("id", authFlowId);
    const results = await this.gcds.runQuery(query);
    if (results && results.length > 0 && results[0].length > 0) {
      const authFlow = results[0][0];
      return this.toAuthFlow(authFlow);
    }
    return null;
  }

  async deleteAuthFlowById(authFlowId: string): Promise<boolean> {
    await this.gcds.delete({
      key: this.gcds.key([AUTH_FLOW_KIND, authFlowId]),
    });
    return true;
  }

  async saveChannel(channel: Channel): Promise<Channel> {
    const dbChannel = this.toDBChannel(channel);
    if (!channel.hasKey) {
      throw new Error("Invalid channel key: " + channel.key);
    }
    const newKey = this.gcds.key([CHANNEL_KIND, channel.key]);
    await this.gcds.save({
      key: newKey,
      data: dbChannel,
    });
    // try getting it to verify
    return channel;
  }

  async saveUser(user?: User): Promise<User> {
    // TODO - use an ID gen if id is not provided?
    user = user || new User();
    let dbUser = this.toDBUser(user);
    const newKey = this.gcds.key(USER_KIND);
    if (!user.hasKey) {
      await this.gcds.save({
        key: newKey,
        data: dbUser,
      });
      if (!newKey.id) {
        throw new Error("User key is invalid.  Save failed.");
      }
      user.id = newKey.id;
      dbUser = this.toDBUser(user);
    } else {
      newKey.id = user.id;
    }

    // Now update with the
    await this.gcds.upsert({
      key: newKey,
      data: dbUser,
    });
    return user;
  }

  /**
   * Creates a new auth session object to track a login request.
   */
  async saveAuthFlow(authFlow?: AuthFlow): Promise<AuthFlow> {
    authFlow = authFlow || new AuthFlow();
    let dbAuthFlow = this.toDBAuthFlow(authFlow);
    const newKey = this.gcds.key(AUTH_FLOW_KIND);
    if (!authFlow.hasKey) {
      await this.gcds.save({
        key: newKey,
        data: dbAuthFlow,
      });
      if (!newKey.id) {
        throw new Error("AuthFlow key is invalid.  Save failed.");
      }
      authFlow.id = newKey.id;
      dbAuthFlow = this.toDBAuthFlow(authFlow);
    } else {
      newKey.id = authFlow.id;
    }

    // Now update with the
    await this.gcds.upsert({
      key: newKey,
      data: dbAuthFlow,
    });

    // try getting it to verify
    return authFlow;
  }

  toUser(dbUser: any): User {
    return new User({
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      phone: dbUser.phone,
      channelKey: dbUser.channelKey,
      isActive: dbUser.isActive,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
    });
  }

  toDBUser(user: User): any {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      channelKey: user.channelKey,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  toChannel(dbChannel: any): Channel {
    return new Channel({
      provider: dbChannel.provider,
      loginId: dbChannel.loginId,
      credentials: dbChannel.credentials,
      profile: dbChannel.profile,
      expiresIn: dbChannel.expiresIn,
      createdAt: dbChannel.createdAt,
      updatedAt: dbChannel.updatedAt,
      isActive: dbChannel.isActive,
    });
  }

  toDBChannel(channel: Channel): any {
    return {
      provider: channel.provider,
      loginId: channel.loginId,
      credentials: channel.credentials,
      profile: channel.profile,
      expiresIn: channel.expiresIn,
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt,
      isActive: channel.isActive,
    };
  }

  toAuthFlow(dbAuthFlow: any): AuthFlow {
    return new AuthFlow({
      id: dbAuthFlow.id,
      provider: dbAuthFlow.provider,
      handlerName: dbAuthFlow.handlerName,
      handlerParams: dbAuthFlow.handlerParams,
      expiresIn: dbAuthFlow.expiresIn,
    });
  }

  toDBAuthFlow(authFlow: AuthFlow): any {
    return {
      id: authFlow.id,
      provider: authFlow.provider,
      handlerName: authFlow.handlerName,
      handlerParams: authFlow.handlerParams,
      expiresIn: authFlow.expiresIn,
    };
  }

  // Helper methods
  async ensureChannel(provider: string, loginId: string, params?: any): Promise<[Channel, boolean]> {
    // get channel if exists
    // See if a channel exist - create if it does not
    let channel: Nullable<Channel> = await this.getChannel(provider, loginId);
    const newCreated = channel == null;
    if (channel == null) {
      channel = new Channel(params);
      channel.provider = provider;
      channel.loginId = loginId;
      channel.createdAt = Date.now();
    }
    channel.credentials = params.credentials;
    channel.profile = params.profile;
    channel = await this.saveChannel(channel);
    return [channel, newCreated];
  }

  async ensureUser(channel: Channel, userParams?: any): Promise<[User, boolean]> {
    userParams = userParams || {};
    let user = await this.getUserByChannel(channel.key);
    const newCreated = user == null;
    if (user == null) {
      user = new User(userParams);
      user.channelKey = channel.key;
      user = await this.saveUser(user);
    }
    return [user, newCreated];
  }
}
