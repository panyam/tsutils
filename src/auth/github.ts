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
      },
      defaultVerifyCallback(vbParams)
    )
  );

  return createProviderRouter("github");
}
