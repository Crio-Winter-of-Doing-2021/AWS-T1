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
            var task = setTimeout(function () {
                console.log("in set timeout for first task");
                axios.get(firstTaskURL)
                .then((response)=>
                {
                    console.log('first task executed successfully');
                    var checkCondition = setTimeout(function(){
                        axios.get(conditionCheckURL)
                        .then((response)=>
                        {
                            console.log('condition check executed successfully');
                            console.log(response.data);
                            if(response.data.conditionSatisfied == 1)
                            {
                                axios.get(secondTaskURL)
                                .then((response)=>
                                {
                                    console.log('second task executed');
                                    tasks.delete(id);
                                },
                                (error)=>{
                                    utils.retries(id,conditionCheckRetries,timeDelayForRetries,conditionCheckURL,secondTaskURL,fallbackTaskURL);
                                    console.log('error in executing second task');
                                });
                            }
                            else{
                                utils.retries(id,conditionCheckRetries,timeDelayForRetries,conditionCheckURL,secondTaskURL,fallbackTaskURL);
                            }
                        },
                        (error)=>{
                            console.log('error in executing condition check');
                            utils.retries(id,conditionCheckRetries,timeDelayForRetries,conditionCheckURL,secondTaskURL,fallbackTaskURL);
                        });
                    },timeDelayForConditionCheck);
                },
                (error) =>{
                    console.log(error);
                    console.log("failed execution of first task");
                });
            },initialDelay);
            tasks.set(id,task);
        }
    });
    res.send('posted orchestrator');
});



module.exports = router;