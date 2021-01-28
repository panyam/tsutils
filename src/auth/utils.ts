import { Nullable } from "../../lib/types";
import { Datastore } from "./datastore";
import { AuthFlowCallback, AuthFlow, User } from "./models";
const express = require("express");
const passport = require("passport");
const request = require("request");

/**
 *
 * General flow goes as follows:
 *
 * 1. User Visits  /xyz
 * 2. Request handler for /xyz kicks off an auth if not logged in (more in step 10).
 * 3. Handler(/xyz) redirects to /auth/login?callbackURL=calbackURL
 * 4. User selects one of the login types /auth/<provider>/login?callbackURL=
 * 5. Login handler creates a new authFlow instance and saves it in the
 *    session.  This will be used later.  In (3) instead of a callbackURL
 *    an authFlow can also be provided in which a new AuthFlow wont be
 *    created.
 * 6. Here passport forwards off to the provider login callback to
 *    perform all manner of logins.
 * 7. After login is completed the callback URL is called with credentials
 *    (or failures in which case failure redirect is called).
 * 8. Here continueAuthFlow is called with a successful auth flow.
 * 9. Here we have the chance to handle the channel that was created
 *      - saved as req.currChannel
 * 10. Now is a chance to create req.loggedInUser so it is available for
 *     other requests going forward.
 */

const wrapAsync = (fn: any) => (...args: any[]) => Promise.resolve(fn(...args)).catch(args[2]);

/**
 * Redirects users to login screen of they are not logged in
 * @param req Request object
 * @param res Response object
 * @param next next function
 */
export function ensureLogin() {
  return wrapAsync(async (req: any, res: any, next: any) => {
    if (!req.session.loggedInUser) {
      // Redirect to a login if user not logged in
      const redirUrl = `/auth/login?callbackURL=${encodeURIComponent(req.originalUrl)}`;
      res.redirect(redirUrl);
    } else {
      next();
    }
  });
}

export type ProfileToIdFunc = (profile: any) => string;
// export type ProfileToUserFunc = (profile: any) => string;

export function defaultVerifyCallback(params?: any): any {
  params = params || {};
  const profileToId: Nullable<ProfileToIdFunc> = params.profileToId || null;
  // const profileToUser: Nullable<ProfileToUserFunc> = params.profileToUser || null;
  const datastore = Datastore.getInstance();
  return async function (req: any, accessToken: string, refreshToken: string, params: any, profile: any, done: any) {
    try {
      console.log("Verify Callback, Profile: ", req, profile, params);
      // ensure channel is created
      let id = profile.id;
      if (profileToId != null) {
        id = profileToId(profile);
      }
      // const authFlow = await datastore.getAuthFlowById(authFlowId);
      // TODO - Use the authFlow.purpose to ensure loginUser is not lost
      const [channel, newCreated] = await datastore.ensureChannel(profile.provider, id, {
        credentials: {
          accessToken: accessToken,
          refreshToken: refreshToken,
        },
        expiresIn: params["expires_in"] || 0,
        profile: profile,
      });
      return done(null, channel);
    } catch (err) {
      return done(err, null);
    }
  };
}

export async function kickOffAuth(authFlow: AuthFlow): Promise<string> {
  const datastore = Datastore.getInstance();
  authFlow = await datastore.saveAuthFlow(authFlow);
  return `/auth/${authFlow.provider}/?authFlow=${authFlow.id}`;
}

export function createProviderRouter(provider: string, params: any = {}): any {
  const datastore = Datastore.getInstance();
  const router = express.Router();
  router.get(
    "/",
    wrapAsync(async (req: any, res: any, next: any) => {
      const authFlowId = req.query["authFlow"] || null;
      const callbackURL = req.query["callbackURL"] || "/";
      let authFlow: Nullable<AuthFlow> = null;
      if (authFlowId == null) {
        // create a new session if it was not provided
        authFlow = await datastore.saveAuthFlow(
          new AuthFlow({
            provider: provider,
            handlerName: "login",
            handlerParams: { callbackURL: callbackURL },
          }),
        );
      } else {
        authFlow = await datastore.getAuthFlowById(authFlowId);
      }
      if (authFlow == null || authFlow.provider != provider) {
        // Invalid request as auth session is invalid or
        // does not match provider
        res.sendStatus(403);
      } else {
        // Save the auth flow so we can associate all requests together
        req.session.authFlowId = authFlow!.id;

        // Kick off an auth we can have different kinds of auth
        passport.authenticate(provider, { scope: params.scope, state: `${authFlow.id}` })(req, res, next);
      }
    }),
  );

  router.get(
    "/callback",
    passport.authenticate(provider, { failureRedirect: `/auth/${provider}/fail` }),
    /*
    (...args: any[]) => {
      const x = passport.authenticate(provider, { failureRedirect: `/auth/${provider}/fail` });
      return x(...args)
    },
    */
    wrapAsync(continueAuthFlow),
  );

  router.get("/fail", (req: any, res: any) => {
    res.send("Login Failed for Provider: " + provider);
  });
  return router;
}

export async function continueAuthFlow(req: any, res: any, next: any) {
  // Successful authentication, redirect success.
  const datastore = Datastore.getInstance();
  const authFlowId = req.query["state"].trim();
  const authFlow = await datastore.getAuthFlowById(authFlowId);

  // We are done with the AuthFlow so clean it up
  req.session.authFlowId = null;

  if (authFlow != null) {
    const handler = req.app.get("authFlows")[authFlow.handlerName] as AuthFlowCallback;
    if (handler != null) {
      handler(authFlow, req, res, next);
      return;
    }
  }
  res.redirect("/");
}
