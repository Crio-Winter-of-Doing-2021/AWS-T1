const express = require("express"); 
const moment = require("moment");
const utils = require("../utility_functions/orchestratorUtils.js");
const DB = require("../db.js");
const recovery = require("../utility_functions/recoverOrchestrations.js");
const router = express.Router();

//create or return a pre-created orchestrator collection
const TaskModel = DB.createOrchestratorCollection();

//tasks maps taskId with its setTimeout() function call
let tasks = new Map();

//export TaskModel and tasks for use in other files(utils.js/recover.js)
module.exports.TaskModel = TaskModel;
module.exports.tasks = tasks;

//Recover orchestrations in case of server crash
recovery.recoverOrchestratorTasks();

//middleware for authenticating orchestration routes
router.use((req,res,next)=>{
    if(!req.isAuthenticated())
    {
      res.redirect("/auth/login");
    }
    else{
      next();
    }
});

router.get("/orchestrate",function(req,res){
    res.render("orchestrator/schedule");
});

router.get("/retrieve-tasks",function(req,res){
    res.render("orchestrator/retrieve",{
        taskInstance: "",
        results: [],
      });
});

router.get("/cancel", function (req, res) {
  res.render("orchestrator/cancel");
});

router.post("/orchestrate",function(req,res){
    let taskName=req.body.taskName;
    let scheduledTime =  moment().format('LLLL');
    let tasksURL = req.body.tasksURL.trim().split(",");
    let initialDelay = req.body.initialDelay;
    let conditionCheckURL = req.body.conditionCheckURL;
    let fallbackTaskURL = req.body.fallbackTaskURL;
    let timeDelayForConditionCheck = req.body.timeDelayForConditionCheck;
    let conditionCheckRetries = req.body.conditionCheckRetries;
    let timeDelayForRetries = req.body.timeDelayForRetries;
    console.log("taskName: "+taskName);
    console.log("scheduledTime "+scheduledTime);
    console.log("tasksURL: "+tasksURL);
    console.log("initialDelay: "+initialDelay);
    console.log("conditionCheckURL: "+conditionCheckURL);
    console.log("fallbackTaskURL: "+fallbackTaskURL);
    console.log("timeDelayForConditionCheck: "+timeDelayForConditionCheck);
    console.log("conditionCheckRetries: "+conditionCheckRetries);
    console.log("timeDelayForRetries: "+timeDelayForRetries);
    //create a task from TaskModel
    const taskInfo = new TaskModel({
        username:req.user.username,
        taskName:taskName,
        scheduledTime:scheduledTime,
        tasksURL,
        conditionCheckURL: conditionCheckURL,
        fallbackTaskURL: fallbackTaskURL,
        taskState:'scheduled',
        conditionCheckRetries: conditionCheckRetries,
        initialDelay:initialDelay,
        timeDelayForRetries:timeDelayForRetries,
        timeDelayForConditionCheck:timeDelayForConditionCheck,

    });
    //save the task in database
    taskInfo.save(function (err, result) {
        if (err) {
            console.log(err);
            utils.setFlashMessage(req,'danger','','Error occured! Please try again');
        } 
        else 
        {
            let id = result._id.toString();
            utils.setFlashMessage(req,'success','orchestration successfully scheduled!',('TaskId '+id));
            var task = setTimeout(function () {
                utils.executeOrchestration(id,conditionCheckRetries,timeDelayForRetries,timeDelayForConditionCheck,conditionCheckURL,tasksURL,fallbackTaskURL)
            },initialDelay);
            tasks.set(id,task);
        }
        res.redirect("/orchestrator/orchestrate");
    }); 
});

router.post("/retrieve-tasks", function (req, res) {
    let taskInstance = req.body.taskInstance;
    if(taskInstance=="All")
    {
      TaskModel.find({}, function (err, results) {
        if (err) {
          console.log(err);
          res.redirect("/orchestrator/retrieve-tasks");
        } else {
          res.render("orchestrator/retrieve", {
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
            res.redirect("/orchestrator/retrieve-tasks");
          } else {
            res.render("orchestrator/retrieve", {
              taskInstance: taskInstance,
              results: results,
            });
          }
        }
      );
    }
});

router.get("/retrieve-tasks/:id", function (req, res) {
    let taskId=req.params.id;
    TaskModel.findById(taskId, function (err, result) {
      if (err){
        res.json(err);
      }
      else{
          var taskDetails={};
          taskDetails['taskName']=result.taskName;
          taskDetails['taskId']=result._id;
          taskDetails['scheduledBy']=result.username;
          taskDetails['taskState']=result.taskState;
          taskDetails['taskStateDetailed']=result.taskStateDetailed;
          taskDetails['scheduledTime']=result.scheduledTime;
          if(result.username==req.user.username)
          {
            taskDetails['tasksURL']=result.tasksURL;
            taskDetails['conditionCheckURL']=result.conditionCheckURL;
            taskDetails['fallbackTaskURL']=result.fallbackTaskURL;
          }
          taskDetails['conditionCheckRetries']=result.conditionCheckRetries;
          taskDetails['initialDelay']=result.initialDelay;
          taskDetails['timeDelayForRetries']=result.timeDelayForRetries;
          taskDetails['timeDelayForConditionCheck']=result.timeDelayForConditionCheck;
          if(result.username==req.user.username&&result.serverResponse!=undefined){
            taskDetails['serverResponse']=JSON.parse(result.serverResponse);
          }
          res.json(taskDetails);
      } 
    });
  });

  router.post("/cancel", function (req, res) {
    let taskId = req.body.taskId;
    //remove extra spaces from taskId
    taskId = taskId.trim();
    TaskModel.findById(taskId, function (err, result) {
      if (err) {
        utils.setFlashMessage(
          req,
          "danger",
          "Error",
          "Invalid Task Id! please try again"
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
              "Orchestration already triggered",
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
      res.redirect("/orchestrator/cancel");
    });
 
});
  
module.exports = router;