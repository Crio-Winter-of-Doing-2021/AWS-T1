const express = require("express");
const utils = require("../utility_functions/orchestratorUtils.js");
const DB = require("../db.js");
const axios = require("axios");

//create or return a pre-created orchestrator collection
const TaskModel = DB.createOrchestratorCollection();

//tasks maps taskId with its setTimeout() function call
let tasks = new Map();

//export TaskModel and tasks for use in other files(utils.js)
module.exports.TaskModel = TaskModel;
module.exports.tasks = tasks;

const router = express.Router();

router.get("/orchestrate",function(req,res){
    if(req.isAuthenticated())
    {
        res.render("orchestrator/scheduleOrchestration");
    }
    else{
        res.redirect("/login");
    }
});

router.post("/orchestrate",function(req,res){
    if(req.isAuthenticated())
    {
        let firstTaskURL = req.body.firstTaskURL;
        let initialDelay = req.body.initialDelay;
        let secondTaskURL = req.body.secondTaskURL;
        let conditionCheckURL = req.body.conditionCheckURL;
        let fallbackTaskURL = req.body.fallbackTaskURL;
        let timeDelayForConditionCheck = req.body.timeDelayForConditionCheck;
        let conditionCheckRetries = req.body.conditionCheckRetries;
        let timeDelayForRetries = req.body.timeDelayForRetries;
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
            firstTaskURL: firstTaskURL,
            secondTaskURL: secondTaskURL,
            conditionCheckURL: conditionCheckURL,
            fallbackTaskURL: fallbackTaskURL,
            taskState:'scheduled',
            conditionCheckRetries: conditionCheckRetries
        });
        //save the task in database
        taskInfo.save(function (err, result) {
            if (err) {
            console.log(err);
            } 
            else 
            {
                let id = result._id.toString();
                console.log("orchestration successfully scheduled");
                var task = setTimeout(function () {
                    utils.executeOrchestration(id,conditionCheckRetries,timeDelayForRetries,timeDelayForConditionCheck,conditionCheckURL,firstTaskURL,secondTaskURL,fallbackTaskURL)
                },initialDelay);
                tasks.set(id,task);
            }
        });
        utils.setFlashMessage(req,'success','success','orchestration successfully scheduled!');
        res.redirect("/orchestrate");
    }
    else{
        res.redirect("/login");
    }
});



module.exports = router;