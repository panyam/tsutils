import { defaultVerifyCallback, createProviderRouter } from "./utils";
const passport = require("passport");
const GithubStrategy = require("passport-github").Strategy;

export function githubAuthRouter(config: any, vbParams: any): any {
  passport.use(
    new GithubStrategy(
      {
        clientID: config.GITHUB.CLIENT_ID,
        clientSecret: config.GITHUB.CLIENT_SECRET,
        callbackURL: config.GITHUB.CALLBACK_URL,
        passReqToCallback: true,
        profileFields: ["email", "name"],
      },
      defaultVerifyCallback({
        profileToId: (profile: any) => {
          if (profile.username && profile.username.trim().length > 0) {
            return profile.username.trim();
          }
          else if ((profile.emails || []).length > 0) {
            return profile.emails[0].value;
          } else {
            return profile.id;
          }
        }
      })
    )
  );

  return createProviderRouter("github", { scope: ["email"] });
}
