const express = require("express");
const utils = require("../utility_functions/orchestratorUtils.js");
const DB = require("../db.js");
const axios = require("axios");

const router = express.Router();

//create or return a pre-created orchestrator collection
const TaskModel = DB.createOrchestratorCollection();

//tasks maps taskId with its setTimeout() function call
let tasks = new Map();

//export TaskModel and tasks for use in other files(utils.js)
module.exports.TaskModel = TaskModel;
module.exports.tasks = tasks;



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
    res.render("orchestrator/scheduleOrchestration");
});

router.get("/retrieve-tasks",function(req,res){
    res.render("orchestrator/retrieveOrchestrations",{
        taskInstance: "",
        results: [],
      });
});

router.post("/orchestrate",function(req,res){
    let taskName=req.body.taskName;
    let firstTaskURL = req.body.firstTaskURL;
    let initialDelay = req.body.initialDelay;
    let secondTaskURL = req.body.secondTaskURL;
    let conditionCheckURL = req.body.conditionCheckURL;
    let fallbackTaskURL = req.body.fallbackTaskURL;
    let timeDelayForConditionCheck = req.body.timeDelayForConditionCheck;
    let conditionCheckRetries = req.body.conditionCheckRetries;
    let timeDelayForRetries = req.body.timeDelayForRetries;
    console.log("taskName: "+taskName);
    console.log("firstTaskURL: "+firstTaskURL);
    console.log("initialDelay: "+initialDelay);
    console.log("secondTaskURL: "+secondTaskURL);
    console.log("conditionCheckURL: "+conditionCheckURL);
    console.log("fallbackTaskURL: "+fallbackTaskURL);
    console.log("timeDelayForConditionCheck: "+timeDelayForConditionCheck);
    console.log("conditionCheckRetries: "+conditionCheckRetries);
    console.log("timeDelayForRetries: "+timeDelayForRetries);
    //create a task from TaskModel
    const taskInfo = new TaskModel({
        username:req.user.username,
        taskName:taskName,
        firstTaskURL: firstTaskURL,
        secondTaskURL: secondTaskURL,
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
            utils.setFlashMessage(req,'success','success','orchestration successfully scheduled!');
            var task = setTimeout(function () {
                utils.executeOrchestration(id,conditionCheckRetries,timeDelayForRetries,timeDelayForConditionCheck,conditionCheckURL,firstTaskURL,secondTaskURL,fallbackTaskURL)
            },initialDelay);
            tasks.set(id,task);
        }
        res.redirect("/orchestrator/orchestrate");
    }); 
});

router.post("/retrieve-tasks", function (req, res) {
    let taskInstance = req.body.taskInstance;
    console.log(taskInstance);
    if(taskInstance=="All")
    {
      TaskModel.find({}, function (err, results) {
        if (err) {
          console.log(err);
          res.redirect("/orchestrator/retrieve-tasks");
        } else {
          res.render("orchestrator/retrieveOrchestrations", {
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
            res.render("orchestrator/retrieveOrchestrations", {
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
          taskDetails['scheduledBy']=result.username;
          taskDetails['taskState']=result.taskState;
          taskDetails['firstTaskURL']=result.firstTaskURL;
          taskDetails['secondTaskURL']=result.secondTaskURL;
          taskDetails['conditionCheckURL']=result.conditionCheckURL;
          taskDetails['fallbackTaskURL']=result.fallbackTaskURL;
          taskDetails['conditionCheckRetries']=result.conditionCheckRetries;
          taskDetails['initialDelay']=result.initialDelay;
          taskDetails['timeDelayBetweenRetries']=result.timeDelayBetweenRetries;
          taskDetails['timeDelayForConditionCheck']=result.timeDelayForConditionCheck;
          res.json(taskDetails);
      } 
    });
  });
  
module.exports = router;