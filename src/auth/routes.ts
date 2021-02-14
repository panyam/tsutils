import express = require("express");
import { facebookAuthRouter } from "./facebook";
import { githubAuthRouter } from "./github";
import { googleAuthRouter } from "./google";
import { User, Channel } from "./models";
import { Datastore } from "./datastore";
const passport = require("passport");

export function authRouter(config: any): any {
  /* GET login page. */
  // Setup passport's user ser/deser functions
  passport.serializeUser(function (user: any, done: any) {
    done(null, (user as Channel).key);
  });

  passport.deserializeUser(async function (channekKey: any, done: any) {
    const channel = await Datastore.getInstance().getChannelByKey(channekKey);
    done(null, channel);
  });

  const router = express.Router();
  router.use("/login", loginRouter(config));

  // Setup different Auths
  router.use("/github", githubAuthRouter(config, {}));

  router.use("/google", googleAuthRouter(config, {}));

  router.use("/facebook", facebookAuthRouter(config, {}));

  return router;
}

export function loginRouter(config: any): any {
  const router = express.Router();
  /* GET home page. */
  router.get("/", function (req: any, res: any, next: any) {
    const callbackURL = req.query["callbackURL"] || "/";
    // TODO - make this provided by client
    res.render("login/index.html", {
      h1: "Login",
      callbackURL: encodeURIComponent(callbackURL),
    });
  });
  return router;
}
