const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const DB = require(__dirname + "/db.js");
const axios = require("axios");

const app = express();
app.set("view engine", "ejs");
app.set("views", __dirname + "/views");

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

//required for flash messages 
app.use(
  session({
    secret: "Utr@1010",
    resave: true,
    saveUninitialized: true,
  })
);

//flash messages middleware
app.use((req, res, next) => {
  res.locals.message = req.session.message;
  delete req.session.message;
  next();
});



//connect to database
DB.connection();

//create or return a pre-created scheduler collection
const TaskModel = DB.createSchedulerCollection();

//tasks maps taskId with its setTimeout() function call
let tasks = new Map();


/*********************** Start of helper functions for routes ************************/

//retrieves parameters passed with the scheduled task in endpoint /schedule
function getParams(req) {
  let ind = 0;
  var params = [];
  let checkbox = req.body.checkbox0;
  while (typeof checkbox != "undefined") {
    let temp = "";
    if (checkbox == "on") {
      temp = "key" + ind;
      const key = req.body[temp];
      temp = "value" + ind;
      const value = req.body[temp];
      if (key != "" || value != "") {
        params.push({ key, value });
      }
    }
    ind++;
    temp = "checkbox" + ind;
    checkbox = req.body[temp];
  }
  return params;
}

/*
  function provided:
  1) create a new task
  2) save task as 'scheduled' in database
  3) schedule the task using setTimeout function
*/
function saveScheduledTask(res, req, url, timeDelay, taskState) {
  let params = getParams(req);
  const taskInfo = new TaskModel({
    lambdaURL: url,
    timeDelayInMs: timeDelay,
    taskState: taskState,
  });
  taskInfo.save(function (err, result) {
    if (err) {
      console.log(err);
    } else {
      console.log("successfully updated taskState to scheduled");
      let id = result._id.toString();
      console.log("id " + id);
      // schedule the aws lambda task
      var task = setTimeout(function () {
        executeAWSLambda(id,url, params);
      }, timeDelay);
      tasks.set(id, task);
      req.session.message = {
        type: "success",
        intro: "Task Scheduled Successfully",
        message: "please note your taskId for future reference: " + id,
      };

      

      res.redirect("/schedule");
    }
  });
}

//Execute Lambda function
function executeAWSLambda(id,url, params) {
  //update in database taskState to running
  DB.updateTaskState(TaskModel, id, "running");
  axios.post(url, params).then(
    (response) => {
      //edge case: immediately executing tasks i.e timeDelay 0ms
      if (tasks.has(id)) {
        //update in database taskState to completed
        DB.updateTaskState(TaskModel, id, "completed");
        console.log("Task " + id + "  deleted succefully from map tasks");
        tasks.delete(id);
        console.log("successfully executed lambda");
        console.log("Response after execution");
        console.log(response);
      }
    },
    (error) => {
      if (tasks.has(id))
      {
        console.log("Task " + id + "  deleted succefully from map tasks");
        tasks.delete(id);
        //update in database taskState to failed
        DB.updateTaskState(TaskModel, id, "failed");
        console.log("error occured while executing task");
        console.log(error);
      }
      
    }
  );
}

/********************* end of helper functions for routes ***************************/


/**************************** Start of Routes *******************************/

app.get("/", function (req, res) {
  console.log("Requesting home page");
  res.render("home");
});

app.get("/schedule", function (req, res) {
  res.render("scheduler/scheduleTask");
});

app.post("/schedule",function (req, res) {
      const url = req.body.URL;
      const timeDelay = req.body["timeInMs"];
      const taskState = "Invalid";
      console.log("url: " + url);
      console.log("timeInMs: " + timeDelay);

      //helper function defined above in app.js
      saveScheduledTask(res, req, url, timeDelay, "scheduled");
    
    }
);

app.get("/retrieve-task-instances",function(req,res){
  res.render('scheduler/retrieveTaskInstances',{request:'get',results:[]});
});

app.post("/retrieve-task-instances",function(req,res){
  let taskState = req.body.taskState;
  TaskModel.find({taskState:taskState},function(err,results){
     if(err)
     {
        res.send(err);
     }
     else{
       res.render('scheduler/retrieveTaskInstances',{request:'post',results:results});
       //res.send(results);
     }
  })
});

app.get("/cancel", function (req, res) {
  res.render("scheduler/cancelTask");
});

app.post("/cancel",function (req, res) {
    let taskId = req.body.taskId;

      if (tasks.has(taskId)) {
        
        clearTimeout(tasks.get(taskId));
        tasks.delete(taskId);
        //update taskState to cancelled in DB
        DB.updateTaskState(TaskModel, taskId, "cancelled");
        req.session.message = {
          type: "success",
          intro: "Task Deleted",
          message: "Task with id " + taskId + " has been deleted successfully",
        };
      } else {
        req.session.message = {
          type: "danger",
          intro: "",
          message:
            "Task with id " +
            taskId +
            " cannot be Deleted!",
        };
      }
    res.redirect("/cancel");
});

/* Authenication routes */
app.get("/login",function(req,res){
  res.render('userAuth/login');
});

app.get("/forgot",function(req,res){
  res.render("userAuth/forgot");
});

app.get("/register",function(req,res){
  res.render("userAuth/register");
});

app.get("/reset",function(req,res){
  res.render("userAuth/reset");
})

/**************************** End of Routes *******************************/

app.listen(3000, function () {
  console.log("server started at port 3000");
});
