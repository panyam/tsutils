import { defaultVerifyCallback, createProviderRouter } from "./utils";
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth").OAuth2Strategy;

export function googleAuthRouter(config: any, vbParams: any): any {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.GOOGLE.CLIENT_ID,
        clientSecret: config.GOOGLE.CLIENT_SECRET,
        callbackURL: config.GOOGLE.CALLBACK_URL,
        passReqToCallback: true,
      },
      defaultVerifyCallback({
        profileToId: (profile: any) =>(profile.emails || []).length > 0 ? profile.emails[0].value : profile.id,
      }),
      // defaultVerifyCallback(vbParams)
    )
  );

  return createProviderRouter("google", { scope: ["profile", "email"] });
}
