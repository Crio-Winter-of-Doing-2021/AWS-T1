const express = require("express");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const userRouter = require("./routes/user.js");
const schedulerRouter = require("./routes/scheduler.js");
const orchestratorRouter = require('./routes/orchestrator.js');
const DB = require(__dirname + "/db.js");


const app = express();

app.set("view engine", "ejs");
app.set("views", __dirname + "/views");

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(flash());
//create a session
app.use(
  session({
    secret: "Utr@1010",
    resave: true,
    saveUninitialized: true
  })
);

//authentication middleware
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  res.locals.message = req.session.message;
  delete req.session.message;
  next();
});

//middle-ware for checking if user is logged in
app.use(function (req, res, next) {
  res.locals.login = req.isAuthenticated();
  res.locals.user = req.user;
  next();
});

app.use('/auth',userRouter);
app.use('/scheduler',schedulerRouter);
app.use('/orchestrator',orchestratorRouter);

//connect to database
DB.connection();


app.get("/", function (req, res) {
  res.render("home");
});

app.listen(3000, function () {
  console.log("server started at port 3000");
});
