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
        profileFields: ["email", "name"],
      },
      defaultVerifyCallback(vbParams)
    )
  );

  return createProviderRouter("facebook");
}
