const express = require("express");
const utils = require("../utility_functions/schedulerUtils.js");
const DB = require("../db.js");

const router = express.Router();

//create or return a pre-created scheduler collection
const TaskModel = DB.createSchedulerCollection();

//tasks maps taskId with its setTimeout() function call
let tasks = new Map();

//export TaskModel and tasks for use in other files
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
        //res.send(results);
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

    //create a JSON object out of params to store in db as JSON string
    let data = {};
    for (var i = 0; i < params.length; i++) {
      data[params[i].key] = params[i].value;
    }
    //create a task from TaskModel
    const taskInfo = new TaskModel({
      username: req.user.username,
      lambdaURL: url,
      timeDelayInMs: timeDelay,
      parameters: JSON.stringify(data),
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
        console.log("successfully updated taskState to scheduled");
        let id = result._id.toString();
        console.log("id " + id);
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
        //flash message
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
          "",
          "Task with id " + taskId + " does not exists"
        );
      } else {
        //If task is created by current user
        if (result.username === req.user.username) {
          //if task is present in tasks map
          if (tasks.has(taskId)) {
            clearTimeout(tasks.get(taskId));
            tasks.delete(taskId);
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
              "",
              "Task with id " + taskId + " cannot be Deleted!"
            );
          }
        } else {
          utils.setFlashMessage(
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

module.exports = router;
