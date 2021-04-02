import { Nullable, assert } from "../types";

/**
 * Actors are the base classes of any physical entity that can
 * belong in a system.
 */
export abstract class Actor {
  processMessage(msg: Message): void {
    assert(msg.target == this, "Cannot handle messages whose target is not this.");
    if (msg.isReply) {
      const reply = msg as Reply;
      assert(
        reply.responseTo.spawnedFrom != null,
        "Cannot spawn a reply for a send that itself was not spawned from another send",
      );
      this.processReply(reply);
    } else {
      this.processSend(msg as Send);
    }
  }

  /**
   * Called to handle a Send message to this actor.
   */
  processSend(send: Send): void {
    // Drop it
  }

  /**
   * Called to handle a Reply message to this actor.
   */
  processReply(_reply: Reply): void {
    // Drop it
  }

  /*
  replyToSend(send: Send, error?: any): Reply {
    const out = send.spawnReply(error);
    out.target.processReply(out);
    return out;
  }

  forwardReply(inboundReply: Reply): Nullable<Reply> {
    const spawnedFromSend = inboundReply.responseTo.spawnedFrom;
    if (spawnedFromSend.reply == null) {
      // we are receiving a reply from the downstream so forward it back
      const outboundReply = inboundReply.spawn(spawnedFromSend);
      world.inject(outboundReply);
      return outboundReply;
    } else {
      // This send had already been replied (ie with an error -
      // say due to timeout, act of god etc)
      // So we can ignore sending this reply
      return null;
    }
  }
  */
}

export abstract class Message {
  // Globally unique ID for all elements.
  private static counter = 0;

  readonly uuid = Message.counter++;

  /**
   * Name of the message.
   */
  readonly name: string;

  readonly isReply: boolean;

  /**
   * The actor this message originated from.
   */
  readonly source: Actor;

  /**
   * Target actor for this message.
   */
  readonly target: Actor;

  /**
   * Data that can be set by the source actor that only *it* can
   * use.
   */
  sourceData: any = null;

  /**
   * Message payload.
   * Specific to the message.
   */
  payload: any = null;

  /**
   * Descriptive label for the Message.
   */
  label: string;

  constructor(name: string, source: Actor, target: Actor) {
    assert(source != null, "Source cannot be null");
    assert(target != null, "Target cannot be null");
    this.name = name;
    this.source = source;
    this.target = target;
  }
}

abstract class ForwardableBase<T> extends Message {
  /**
   * The first/root message in the forward chain.
   */
  private _rootMessage: ForwardableBase<T>;

  /**
   * The message that is being forwarded.
   */
  private _spawnedFrom: Nullable<this> = null;

  get spawnedFrom(): Nullable<this> {
    return this._spawnedFrom;
  }

  protected setSpawnedFrom(msg: Nullable<this>): void {
    this._spawnedFrom = msg;
    if (msg == null) this._rootMessage = this;
    else this._rootMessage = msg.rootMessage;
  }

  get rootMessage(): this {
    return this._rootMessage as this;
  }
}

export class Reply extends ForwardableBase<Reply> {
  readonly isReply = true;

  /**
   * The message this is in response to
   */
  responseTo: Send;

  /**
   * Whether this reply is an error or not.
   */
  isError: boolean;

  /**
   * If Reply is an error then a few summary fields about the error.
   */
  error?: any;

  constructor(responseTo: Send, error?: any) {
    // Reverse target and source
    super(responseTo.name, responseTo.target, responseTo.source);
    assert(responseTo.reply == null, "Send's reply has already been set");
    this.responseTo = responseTo;
    this.error = error || null;
    this.isError = this.error != null;
    responseTo.reply = this;
  }

  spawn(responseTo: Send, error?: any): Reply {
    const child = new Reply(responseTo, error);
    child.setSpawnedFrom(this);
    return child;
  }
}

export class Send extends ForwardableBase<Send> {
  readonly isReply = false;

  /**
   * All child sends that were spawned from this Send.
   * The parent/spawnedFrom and child message references help us
   * form a call tree/trace of a message as it traverses
   * the system.
   */
  children: Send[] = [];

  /**
   * Tells which message is a reply to this message.
   */
  reply: Nullable<Reply> = null;

  /**
   * When the Send was cancelled (if it was).
   */
  cancelledAt: Nullable<number> = null;

  spawn(nextTarget: Actor): Send {
    const child = new Send(this.name, this.target, nextTarget);
    child.setSpawnedFrom(this);
    this.children.push(child);
    return child;
  }

  spawnReply(error?: any): Reply {
    return new Reply(this, error);
  }
}
