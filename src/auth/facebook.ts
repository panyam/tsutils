import { defaultVerifyCallback, createProviderRouter } from "./utils";
const passport = require("passport");
const FacebookStrategy = require("passport-facebook").Strategy;

export function facebookAuthRouter(config: any, vbParams: any): any {
  passport.use(
    new FacebookStrategy(
      {
        clientID: config.FACEBOOK.APP_ID,
        clientSecret: config.FACEBOOK.APP_SECRET,
        callbackURL: config.FACEBOOK.CALLBACK_URL,
        passReqToCallback: true,
        profileFields: ["email", "name"],
      },
      defaultVerifyCallback({
        profileToId: (profile: any) => ((profile.emails || []).length > 0 ? profile.emails[0].value : profile.id),
      }),
    ),
  );

  return createProviderRouter("facebook", { scope: ["email"] });
}
