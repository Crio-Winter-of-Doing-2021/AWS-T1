const express = require("express");

const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const DB = require("../db.js");
const router = express.Router();

const userModel = DB.createUsersCollection();

//authentication middleware
router.use(passport.initialize());
router.use(passport.session());

passport.use(userModel.createStrategy());

passport.serializeUser(userModel.serializeUser());
passport.deserializeUser(userModel.deserializeUser());

/* Authenication routes */
router.get("/login", function (req, res) {
  res.render("userAuth/login", { loginMessage: req.flash("error") });
});

router.get("/register", function (req, res) {
  res.render("userAuth/register", { registerMessage: null });
});

router.get("/forgot", function (req, res) {
  res.render("userAuth/forgot");
});

router.get("/reset", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("userAuth/reset");
  } else {
    res.redirect("/login");
  }
});

router.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});

router.post("/register", function (req, res) {
  userModel.register(
    { username: req.body.username },
    req.body.password,
    function (err, user) {
      if (err) {
        //console.log(err);
        res.render("userAuth/register", {
          registerMessage: "username already exists!",
          type: "danger",
        });
      } else {
        //console.log(user);
        passport.authenticate("local")(req, res, function () {
          res.render("userAuth/register", {
            registerMessage: "succesfully registered",
            type: "success",
          });
        });
      }
    }
  );
});

router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/schedule",
    failureRedirect: "/login",
    failureFlash: true,
  })
);

module.exports = router;
