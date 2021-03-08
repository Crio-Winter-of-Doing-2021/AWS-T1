const express = require("express");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const DB = require("../db.js");
const flash = require("connect-flash")
const router = express.Router();

const userModel = DB.createAuthCollection();

//authentication middleware
router.use(passport.initialize());
router.use(passport.session());
router.use(flash());
passport.use(userModel.createStrategy());

passport.serializeUser(userModel.serializeUser());
passport.deserializeUser(userModel.deserializeUser());

/* Authenication routes */
router.get("/login",function(req,res){
    res.render('userAuth/login');
});

router.get("/register",function(req,res){
    res.render("userAuth/register");
});

router.get("/forgot",function(req,res){
    res.render("userAuth/forgot");
});

router.get("/reset",function(req,res){
    if(req.isAuthenticated())
    {
      res.render("userAuth/reset");
    }
    else{
      res.redirect("/login");
    }
})

router.post("/register",function(req,res){
    userModel.register({username:req.body.username},req.body.password,function(err,user){
        if(err){
            //console.log(err);
            res.json({"Registration Failed please try again":err});
        }
        else{
            //console.log(user);
            passport.authenticate("local")(req,res,function(){
            res.redirect("/schedule");
            });
        }
    })
});


router.post("/login",passport.authenticate("local",
    { 
        successRedirect: '/schedule',
        failureRedirect: '/login',
        failureFlash : { type: 'error', message: 'Invalid username or password.'}
    })
);



module.exports = router;