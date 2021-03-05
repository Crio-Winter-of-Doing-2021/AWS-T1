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
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

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
//id of the scheduled task
let id = "";

/*********************** Start of helper functions for routes ************************/

//get params passed with the scheduled task
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

//save a scheduled task in database and add task to the map tasks
function saveScheduledTask(res, req, url, timeDelay, taskState, task) {
  const taskInfo = new TaskModel({
    lambdaURL: url,
    timeDelayInMs: timeDelay,
    taskState: taskState,
  });
  taskInfo.save(function (err, result) {
    if (err) {
      console.log(err);
    } else {
      id = result._id.toString();
      console.log("id " + id);
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
function executeAWSLambda(url, params) {
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
  res.render("scheduleTask");
});

app.post("/schedule",function (req, res) {
    const url = req.body.URL;
    const timeDelay = req.body["timeInMs"];
    let isnum = /^\d+$/.test(timeDelay);
    if (url.length==0||timeDelay.length==0||!isnum) {
        console.log('in error');
      req.session.message = {
        type: "danger",
        intro: "Invalid Details",
        message: "please enter valid URL/Time",
      };
      res.redirect("/schedule");
    } else {
      
      const taskState = "Invalid";
      console.log("url: " + url);
      console.log("timeInMs: " + timeDelay);
      let params = getParams(req);
      //let id='';

      // schedule the aws lambda task
      var task = setTimeout(function () {
        executeAWSLambda(url, params);
      }, timeDelay);

      //store scheduled task details in database and task to map tasks
      saveScheduledTask(res, req, url, timeDelay, "scheduled", task);
    }
  }
);

app.get("/cancel", function (req, res) {
  res.render("cancelTask");
});

app.post("/cancel",function (req, res) {
    let taskId = req.body.taskId;
    if (taskId.length!=24) {
      req.session.message = {
        type: "danger",
        intro: "Invalid Task Id ",
        message: "Please provide a valid TaskId",
      };
    } else {
      
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
            " is either already executed or not scheduled",
        };
      }
    }
    res.redirect("/cancel");
  }
);

/**************************** End of Routes *******************************/

app.listen(3000, function () {
  console.log("server started at port 3000");
});
