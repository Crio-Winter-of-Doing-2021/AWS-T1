const express = require("express");
const utils = require("../utility_functions/schedulerUtils.js");
const DB = require("../db.js");

const router = express.Router();

//create or return a pre-created scheduler collection
const TaskModel = DB.createSchedulerCollection();

//tasks maps taskId with its setTimeout() function call
let tasks = new Map();

//maps taskId with an object containing its lambda-url and paramaters
let taskDetails = new Map();

//export TaskModel and tasks for use in other files(utils.js)
module.exports.TaskModel = TaskModel;
module.exports.tasks = tasks;

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
      taskInstance: "",
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

router.get("/modify",function(req,res){
  if (req.isAuthenticated()) {
    res.render("scheduler/modifyTask");
  } else {
    res.redirect("/login");
  }
});

router.get("/retrieve-all-tasks", function (req, res) {
  if (req.isAuthenticated()) {
    TaskModel.find({ username: req.user.username }, function (err, results) {
      if (err) {
        console.log(err);
        res.redirect("/retrieve-all-tasks");
      } else {
        res.render("scheduler/retrieveAllTasks", {
          results: results,
        });
      }
    });
  } else {
    res.redirect("/login");
  }
});

router.post("/schedule", function (req, res) {
  if (req.isAuthenticated()) {
    const url = req.body.URL;
    const timeDelay = req.body["timeInMs"];

    //get parameters passed with task
    let params = utils.getParams(req);
    const taskState = "";
    console.log("url: " + url);
    console.log("timeInMs: " + timeDelay);
    
    
    //create a task from TaskModel
    const taskInfo = new TaskModel({
      username: req.user.username,
      lambdaURL: url,
      timeDelayInMs: timeDelay,
      parameters: JSON.stringify(params),
      taskState: "scheduled",
    });
    //save the task in database
    taskInfo.save(function (err, result) {
      if (err) {
        console.log(err);
        //flash message
        utils.setFlashMessage(
          req,
          "Failed",
          "Could not schedule",
          "please try again"
        );
      } else {
        
        let id = result._id.toString();
        console.log("successfully updated taskState to scheduled of task with id "+id);
        //store task details in taskDetails map
        taskDetails.set(id,{url:url,params:params});
        // schedule the aws lambda task
        var task = setTimeout(function () {
          utils.executeAWSLambda(id, url, params);
        }, timeDelay);
        tasks.set(id, task);
        //print tasks map
        // console.log("tasks map");
        // for (const [key, value] of tasks.entries()) {
        //   console.log(key, value);
        // }
        //flash message(utility function present in schdulerUtils.js)
        utils.setFlashMessage(
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
            taskInstance: taskState,
            results: results,
          });
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
        utils.setFlashMessage(
          req,
          "danger",
          "",
          "Error occured! please try again"
        );
      } else if (result == null) {
        utils.setFlashMessage(
          req,
          "danger",
          "Task not found",
          "Task with id " + taskId + " does not exists"
        );
      } else {
        //If task is created by current user
        if (result.username === req.user.username) {
          //if task is present in tasks map
          if (tasks.has(taskId)) {
            clearTimeout(tasks.get(taskId));
            tasks.delete(taskId);
            taskDetails.delete(taskId);
            //update taskState to cancelled in DB
            DB.updateTaskState(TaskModel, taskId, "cancelled");
            utils.setFlashMessage(
              req,
              "success",
              "",
              "Task with id " + taskId + " successfully deleted!"
            );
          } else {
            utils.setFlashMessage(
              req,
              "danger",
              "Already Executed",
              "Task with id " + taskId + " cannot be Deleted."
            );
          }
        } else {
          utils.setFlashMessage(
            req,
            "danger",
            "Unauthorised",
            "Task with id " + taskId+" is not scheduled by you."
          );
        }
      }
      res.redirect("/cancel");
    });
  } else {
    res.redirect("/login");
  }
});

router.post("/modify",function(req,res){
  if (req.isAuthenticated()) {
    let taskId = req.body.taskId;
   
    TaskModel.findById(taskId, function (err, result) {
      if (err) {
        //helper function defined below
        utils.setFlashMessage(
          req,
          "danger",
          "",
          "Error occured! please try again"
        );
      } else if (result == null) {
        utils.setFlashMessage(
          req,
          "danger",
          "Task Not Found",
          "Task with id " + taskId + " does not exists"
        );
      } else {
        //If task is created by current user
        if (result.username === req.user.username) {
          //if task is present in tasks map i.e task is in scheduled state
          if (tasks.has(taskId)) {
            //retrieve task details from taskDetails map 
            let timeDelay = req.body.timeInMs;
            let url = taskDetails.get(taskId).url;
            let params = taskDetails.get(taskId).params;
            console.log(url);
            console.log(JSON.stringify(params));
            //cancel previously scheduled task
            clearTimeout(tasks.get(taskId));
            // schedule a new aws lambda task with same url and params as previous task
            var task = setTimeout(function () {
              utils.executeAWSLambda(taskId, url, params);
            }, timeDelay);
            //update tasks map with the new task
            tasks.set(taskId, task);
            console.log("successfully modified task with "+taskId+" to timedelay "+timeDelay);
            utils.setFlashMessage(
              req,
              "success",
              "",
              "Task with id " + taskId + " successfully modified!"
            );
          } else {
            utils.setFlashMessage(
              req,
              "danger",
              "Already Executed",
              "Task with id " + taskId + " cannot be Modified."
            );
          }
        } else {
          utils.setFlashMessage(
            req,
            "danger",
            "Unauthorised",
            "Task with id " + taskId+" is not scheduled by you."
          );
        }
      }
      res.redirect("/modify");
    });
  } else {
    res.redirect("/login");
  }

});

/**************************** End Scheduler Routes *******************************/

module.exports = router;
