const express = require("express");
const nodemailer = require("nodemailer");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const DB = require("../db.js");
const router = express.Router();

const userModel = DB.createUsersCollection();
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
  if(req.isAuthenticated())
    res.render("userAuth/reset", { resetMessage: null, type: null });
  else{
    res.redirect("/auth/login");
  }
});

router.get("/logout", function (req, res) {
  if(req.isAuthenticated()){
    req.logout();
    res.redirect("/");
  }
  else{
    res.redirect("/auth/login");
  }
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
    successRedirect: "/scheduler/schedule",
    failureRedirect: "/auth/login",
    failureFlash: true,
  })
);

router.post("/reset", function (req, res) {
  if(req.isAuthenticated())
  {
    userModel.find({ username: req.user.username }, function (err, result) {
      if (err) {
        res.render("userAuth/reset", {
          resetMessage: "error! Please try again!!",
          type: "danger",
        });
      } else {
        var user = result[0];
        user.changePassword(
          req.body.oldPassword,
          req.body.newPassword,
          function (err, result) {
            if (err) {
              console.log(err);
              res.render("userAuth/reset", {
                resetMessage: "error! Please try again!!",
                type: "danger",
              });
            } else {
              res.render("userAuth/reset", {
                resetMessage: "password updated successfully!",
                type: "success",
              });
            }
          }
        );
      }
    });
  }
  else{
    res.redirect("/auth/login");
  }
  
});

router.post("/forgot", function (req, res) {
  let username = req.body.username;
  var transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "email@gmail.com",
      pass: "",
    },
  });

  userModel.findByUsername(req.body.username, function (err, user) {
    if (err) {
      req.session.message = {
        type: "danger",
        intro: "",
        message: "Email address is not registered!",
      };
      res.redirect("/auth/forgot");
    } else {
      //var user = result[0];
      //console.log(user);
      var password = Math.random().toString(36).slice(-8);
      console.log(password);
      user.setPassword(password, function (err, user) {
        if (err) {
          console.log("err " + err);
          //console.log('user '+user);
          //console.log(err);
          req.session.message = {
            type: "danger",
            intro: "Error",
            message: "error in setting password. Please try again",
          };
          res.redirect("/auth/forgot");
        } else {
          user.save();
          //
          var text ='your new password is '+ password +' you are advised to reset it once you login with this password';
          var mailOptions = {
            from: "email@gmail.com",
            to: username,
            subject: "Password change",
            text: text,
          };
          transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
              req.session.message = {
                type: "danger",
                intro: "Error",
                message: "error in sending password. please try again",
              };
              //res.redirect("/forgot");
            } else {
              req.session.message = {
                type: "success",
                intro: "",
                message: "your new password is sent to your registered email",
              };
            }
            res.redirect("/auth/forgot");
          });
        }
      });
    }
  });
});

module.exports = router;
