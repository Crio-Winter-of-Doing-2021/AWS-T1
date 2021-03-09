const express = require("express");
const axios = require("axios");
const DB = require("../db.js");

const router = express.Router();

//create or return a pre-created scheduler collection
const TaskModel = DB.createSchedulerCollection();

//tasks maps taskId with its setTimeout() function call
var tasks = new Map();

/**************************** Scheduler Routes *******************************/

router.get("/schedule", function (req, res) {
  if (req.isAuthenticated()) {
    //console.log(req.user);
    res.render("scheduler/scheduleTask");
  } else {
    res.redirect("/login");
  }
});

router.get("/retrieve-task-instances", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("scheduler/retrieveTaskInstances", {
      request: "get",
      results: [],
    });
  } else {
    res.redirect("/login");
  }
});

router.get("/cancel", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("scheduler/cancelTask");
  } else {
    res.redirect("/login");
  }
});

router.post("/schedule", function (req, res) {
  if (req.isAuthenticated()) {
    const url = req.body.URL;
    const timeDelay = req.body["timeInMs"];
    //get parameters passed with task
    let params = getParams(req);
    const taskState = "Invalid";
    console.log("url: " + url);
    console.log("timeInMs: " + timeDelay);
    //parameters passed
    // console.log("parameters passed");
    // console.log(JSON.stringify(params));

    //create a task from TaskModel
    const taskInfo = new TaskModel({
      username: req.user.username,
      lambdaURL: url,
      timeDelayInMs: timeDelay,
      taskState: taskState,
    });
    //save the task in database
    taskInfo.save(function (err, result) {
      if (err) {
        console.log(err);
        //flash message
        setFlashMessage(
          req,
          "Failed",
          "Could not schedule",
          "please try again"
        );
      } else {
        console.log("successfully updated taskState to scheduled");
        let id = result._id.toString();
        console.log("id " + id);
        // schedule the aws lambda task
        var task = setTimeout(function () {
          executeAWSLambda(id, url, params);
        }, timeDelay);
        tasks.set(id, task);
        //print tasks map
        // console.log("tasks map");
        // for (const [key, value] of tasks.entries()) {
        //   console.log(key, value);
        // }
        //flash message
        setFlashMessage(
          req,
          "success",
          "Task Scheduled Successfully",
          "please note your taskId for future reference: " + id
        );
      }
      res.redirect("/schedule");
    });
  } else {
    res.redirect("/login");
  }
});

router.post("/retrieve-task-instances", function (req, res) {
  if (req.isAuthenticated()) {
    let taskState = req.body.taskState;
    TaskModel.find(
      { username: req.user.username, taskState: taskState },
      function (err, results) {
        if (err) {
          console.log(err);
          res.redirect("/retrieve-task-instances");
        } else {
          res.render("scheduler/retrieveTaskInstances", {
            request: "post",
            results: results,
          });
          //res.send(results);
        }
      }
    );
  } else {
    res.redirect("/login");
  }
});

router.post("/cancel", function (req, res) {
  if (req.isAuthenticated()) {
    let taskId = req.body.taskId;
    TaskModel.findById(taskId, function (err, result) {
      if (err) {
        //helper function defined below
        setFlashMessage(req, "danger", "", "Error occured! please try again");
      } else if (result.length == 0) {
        setFlashMessage(
          req,
          "danger",
          "",
          "Task with id " + taskId + " does not exists"
        );
      } else {
        //If task is created by current user
        if ((result.username === req.user.username)) {
          //if task is present in tasks map
          if (tasks.has(taskId)) {
            clearTimeout(tasks.get(taskId));
            tasks.delete(taskId);
            //update taskState to cancelled in DB
            DB.updateTaskState(TaskModel, taskId, "cancelled");
            setFlashMessage(
              req,
              "success",
              "",
              "Task with id " + taskId + " successfully deleted!"
            );
          } else {
            setFlashMessage(
              req,
              "danger",
              "",
              "Task with id " + taskId + " cannot be Deleted!"
            );
          }
        } else {
          setFlashMessage(
            req,
            "danger",
            "Not scheduled",
            "You have not scheduled Task with id " + taskId
          );
        }
      }
      res.redirect("/cancel");
    });
  } else {
    res.redirect("/login");
  }
});

/**************************** End Scheduler Routes *******************************/

/*********************** helper functions ************************/

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
  sets flash message
*/
function setFlashMessage(req, type, intro, message) {
  req.session.message = {
    type: type,
    intro: intro,
    message: message,
  };
}

//Execute Lambda function
function executeAWSLambda(id, url, params) {
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
      } else {
        console.log("There is no task with taskId " + id);
      }
    },
    (error) => {
      if (tasks.has(id)) {
        console.log("Task " + id + "  deleted succefully from map tasks");
        tasks.delete(id);
        //update in database taskState to failed
        DB.updateTaskState(TaskModel, id, "failed");
        console.log("error occured while executing task");
        console.log(error);
      } else {
        console.log("There is no task with taskId " + id);
      }
    }
  );
}

/********************* end helper functions ***************************/

module.exports = router;
