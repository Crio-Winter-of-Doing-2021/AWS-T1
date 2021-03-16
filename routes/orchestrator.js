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
    res.render("orchestrator/scheduleOrchestration");
});

router.post("/orchestrate",function(req,res){
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
                DB.updateTaskState(TaskModel,id,'first-task running');
                axios.get(firstTaskURL)
                .then((response)=>
                {
                    console.log('first task executed successfully');
                    DB.updateTaskState(TaskModel,id,'first-task completed');
                    var checkCondition = setTimeout(function(){
                        DB.updateTaskState(TaskModel,id,'condition-check-task running');
                        axios.get(conditionCheckURL)
                        .then((response)=>
                        {
                            DB.updateTaskState(TaskModel,id,'condition-check-task completed');
                            console.log('condition-check-task executed successfully');
                            console.log(response.data);
                            if(response.data.conditionSatisfied == 1)
                            {
                                DB.updateTaskState(TaskModel,id,'second-task running');
                                axios.get(secondTaskURL)
                                .then((response)=>
                                {
                                    DB.updateTaskState(TaskModel,id,'second-task completed');
                                    console.log('second task executed');
                                    tasks.delete(id);
                                },
                                (error)=>{
                                    DB.updateTaskState(TaskModel,id,'second-task failed');
                                    utils.retries(id,conditionCheckRetries,timeDelayForRetries,conditionCheckURL,secondTaskURL,fallbackTaskURL);
                                    console.log('error in executing second task');
                                });
                            }
                            else{
                                DB.updateTaskState(TaskModel,id,'condition-check-task condition-failure');
                                utils.retries(id,conditionCheckRetries,timeDelayForRetries,conditionCheckURL,secondTaskURL,fallbackTaskURL);
                            }
                        },
                        (error)=>{
                            DB.updateTaskState(TaskModel,id,'condition-check-task failed');
                            console.log('error in executing condition check');
                            utils.retries(id,conditionCheckRetries,timeDelayForRetries,conditionCheckURL,secondTaskURL,fallbackTaskURL);
                        });
                    },timeDelayForConditionCheck);
                },
                (error) =>{
                    console.log(error);
                    DB.updateTaskState(TaskModel,id,'first-task failed');
                    console.log("failed execution of first task");
                });
            },initialDelay);
            tasks.set(id,task);
        }
    });
    utils.setFlashMessage(req,'success','success','orchestration successfully scheduled!');
    res.redirect("/orchestrate");
});



module.exports = router;