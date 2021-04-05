const DB = require("../db.js");
const orchestrator = require("../routes/orchestrator");
const axios = require("axios");

/*Retry orchestration */
function retries(id,conditionCheckRetries,timeDelayForRetries,conditionCheckURL,secondTaskURL,fallbackTaskURL){
    const TaskModel = orchestrator.TaskModel;
    if(conditionCheckRetries>0)
    {
        setTimeout(function(){
            DB.updateTaskState(TaskModel,id,'conditionCheckTaskRunning');
            axios.get(conditionCheckURL)
            .then((response)=>
            {
                DB.updateTaskState(TaskModel,id,'conditionCheckTaskSuccess');
                DB.updateTaskState(TaskModel,id,'secondTaskRunning');
                    axios.get(secondTaskURL)
                    .then((response)=>
                    {
                        DB.updateTaskState(TaskModel,id,'secondTaskSuccess');
                        console.log(response.data);
                    },
                    (error)=>{
                        DB.updateTaskState(TaskModel,id,'secondTaskFailed');
                    });
            },
            (error)=>{
                DB.updateTaskState(TaskModel,id,'conditionCheckTaskFailed');
                //recursive statement
                retries(id,conditionCheckRetries-1,timeDelayForRetries,conditionCheckURL,secondTaskURL,fallbackTaskURL);
            });
        },timeDelayForRetries); 
    }
    else{
        DB.updateTaskState(TaskModel,id,'fallbackTaskRunning');
        axios.get(fallbackTaskURL)
        .then((response)=>
        {
            DB.updateTaskState(TaskModel,id,'fallbackTaskSuccess');
        },
        (error)=>{
            DB.updateTaskState(TaskModel,id,'fallbackTaskFailed');
        });
    } 
}

/* perform orchestration */
module.exports.executeOrchestration = function(id,conditionCheckRetries,timeDelayForRetries,timeDelayForConditionCheck,conditionCheckURL,firstTaskURL,secondTaskURL,fallbackTaskURL){
    const TaskModel = orchestrator.TaskModel;
    let tasks = orchestrator.tasks;
    if(tasks.has(id))
    {
        tasks.delete(id);
        console.log('Deleted orchestration with id '+id +' from tasks map');
    }
    DB.updateTaskState(TaskModel,id,'firstTaskRunning');
    axios.get(firstTaskURL)
    .then((response)=>
    {
        DB.updateTaskState(TaskModel,id,'firstTaskSuccess');
        setTimeout(function(){
            DB.updateTaskState(TaskModel,id,'conditionCheckTaskRunning');
            axios.get(conditionCheckURL)
            .then((response)=>
            {
                DB.updateTaskState(TaskModel,id,'conditionCheckTaskSuccess');
                console.log(response.data);
                DB.updateTaskState(TaskModel,id,'secondTaskRunning');
                axios.get(secondTaskURL)
                .then((response)=>
                {
                    DB.updateTaskState(TaskModel,id,'secondTaskSuccess');
                },
                (error)=>{
                    DB.updateTaskState(TaskModel,id,'secondTaskFailed');
                });
            },
            (error)=>{
                DB.updateTaskState(TaskModel,id,'conditionCheckTaskFailed');
                retries(id,conditionCheckRetries,timeDelayForRetries,conditionCheckURL,secondTaskURL,fallbackTaskURL);
            });
        },timeDelayForConditionCheck);
    },
    (error) =>{
        DB.updateTaskState(TaskModel,id,'firstTaskFailed');
    });
}


/*
    sets flash message
*/
module.exports.setFlashMessage = function (req, type, intro, message) {
    req.session.message = {
        type: type,
        intro: intro,
        message: message,
    };
};


