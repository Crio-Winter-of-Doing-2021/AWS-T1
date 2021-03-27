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

router.get("/retrieve-tasks", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("scheduler/retrieveTasks", {
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



router.post("/schedule", function (req, res) {
  if (req.isAuthenticated()) {
    const taskName = req.body.taskName;
    const url = req.body.URL;
    const scheduledDate = req.body.datefield;
    const scheduledTime = req.body.timefield;
    const retriesCount = req.body.retriesCount;
    const timeDelayBetweenRetries = req.body.timeDelayBetweenRetries;
    //get parameters passed with task
    let params = utils.getParams(req);
    const taskState = "";
    console.log("url: " + url);
    console.log("schedluedDate: " + scheduledDate);
    console.log("scheduledTime: "+scheduledTime);
    console.log("retries count "+retriesCount);
    console.log("time delay between retries "+timeDelayBetweenRetries);
    //calculate time delay from provided scheduled date and time
    var presentTimeInMsSinceEpoch = Date.now();
    let time = scheduledDate+" "+scheduledTime;
    var schedimeInMsSinceEpoch = Date.parse(time);
    var timeDelay = schedimeInMsSinceEpoch- presentTimeInMsSinceEpoch;
    console.log("delay in Ms "+ timeDelay);
    //If we provide time which is already<div></div> passed tasks are executed immediately
    if(timeDelay<0)
    {
      timeDelay = 0;
    }
    //create a task from TaskModel
    const taskInfo = new TaskModel({
      username: req.user.username,
      taskName: taskName,
      lambdaURL: url,
      scheduledTime:time,
      retriesCount: retriesCount,
      timeDelayBetweenRetries: timeDelayBetweenRetries,
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
        taskDetails.set(id,{url:url,params:params,
                        retriesCount:retriesCount,timeDelayBetweenRetries:timeDelayBetweenRetries});
        // schedule the aws lambda task
        var task = setTimeout(function () {
          utils.executeAWSLambda(id, url, params,retriesCount,timeDelayBetweenRetries);
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

router.post("/retrieve-tasks", function (req, res) {
  if (req.isAuthenticated()) {
    let taskInstance = req.body.taskInstance;
    if(taskInstance=="All")
    {
      TaskModel.find({ username: req.user.username }, function (err, results) {
        if (err) {
          console.log(err);
          res.redirect("/retrieve-tasks");
        } else {
          res.render("scheduler/retrieveTasks", {
            taskInstance: taskInstance,
            results: results,
          });
        }
      });
    }
    else{
      TaskModel.find(
        { username: req.user.username, taskState: taskInstance },
        function (err, results) {
          if (err) {
            console.log(err);
            res.redirect("/retrieve-tasks");
          } else {
            res.render("scheduler/retrieveTasks", {
              taskInstance: taskInstance,
              results: results,
            });
          }
        }
      );
    }
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
              "Lambda already triggered",
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
            const modifiedDate = req.body.datefield;
            const modifiedTime = req.body.timefield;
            console.log("modifiedDate "+modifiedDate);
            console.log("modifiedTime "+modifiedTime);
            //calculate time delay from provided scheduled date and time
            var presentTimeInMsSinceEpoch = Date.now();
            let time = modifiedDate+" "+modifiedTime;
            DB.modifyTaskScheduledTime(TaskModel,taskId,time);
            var modifiedTimeInMsSinceEpoch = Date.parse(time);
            var timeDelay = modifiedTimeInMsSinceEpoch - presentTimeInMsSinceEpoch;
            console.log("delay in Ms "+ timeDelay);
            //If we provide time which is already passed tasks are executed immediately
            if(timeDelay<0)
            {
              timeDelay = 0;
            }
            //retrieve task details from taskDetails map 
            let url = taskDetails.get(taskId).url;
            let params = taskDetails.get(taskId).params;
            let retriesCount = taskDetails.get(taskId).retriesCount;
            let timeDelayBetweenRetries = taskDetails.get(taskId).timeDelayBetweenRetries;
            console.log('url '+url);
            console.log('params '+JSON.stringify(params));
            console.log('retriesCount '+retriesCount);
            console.log('timeDelayBetweenRetries '+timeDelayBetweenRetries);
            //cancel previously scheduled task
            clearTimeout(tasks.get(taskId));
            // schedule a new aws lambda task with same url and params as previous task
            var task = setTimeout(function () {
              utils.executeAWSLambda(taskId, url, params,retriesCount,timeDelayBetweenRetries);
            }, timeDelay);
            //update tasks map with the new task
            tasks.set(taskId, task);
            console.log("successfully modified task with id "+taskId+" to timedelay "+timeDelay);
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
              "Lambda already triggered",
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
