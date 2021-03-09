const express = require("express");
const session = require("express-session");
const userRouter = require("./routes/user.js");
const schedulerRouter = require("./routes/scheduler.js");
const DB = require(__dirname + "/db.js");

const app = express();

app.set("view engine", "ejs");
app.set("views", __dirname + "/views");

app.use(express.static("public"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

//create a session
app.use(
  session({
    secret: "Utr@1010",
    resave: true,
    saveUninitialized: true,
  })
);

app.use((req, res, next) => {
  res.locals.message = req.session.message;
  delete req.session.message;
  next();
});

app.use(userRouter);
app.use(schedulerRouter);

//connect to database
DB.connection();

app.get("/",function(req,res){
  res.render('home');
})
app.listen(3000, function () {
  console.log("server started at port 3000");
});
