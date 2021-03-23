const DB = require("../db.js");
const orchestrator = require("../routes/orchestrator");
const axios = require("axios");

/*Retry orchestration */
function retries(id,conditionCheckRetries,timeDelayForRetries,timeDelayForConditionCheck,conditionCheckURL,secondTaskURL,fallbackTaskURL){
    const TaskModel = orchestrator.TaskModel;
    let tasks = orchestrator.tasks;
    setTimeout(function(){
        //If condition-check retries exhausts execute fallback task
        if(conditionCheckRetries>0)
        {
            console.log('condition check retries '+ conditionCheckRetries);
            setTimeout(function(){
                DB.updateTaskState(TaskModel,id,'condition-check-task running');
                axios.get(conditionCheckURL)
                .then((response)=>
                {
                    DB.updateTaskState(TaskModel,id,'condition-check-task completed');
                    console.log(response.data);
                    if(response.data.conditionSatisfied == 1)
                    {
                        DB.updateTaskState(TaskModel,id,'second-task running');
                        axios.get(secondTaskURL)
                        .then((response)=>
                        {
                            tasks.delete(id);
                            console.log('successfully deleted task with id '+id +' from tasks map');
                            DB.updateTaskState(TaskModel,id,'second-task completed');
                            console.log('orchestration successful');
                            console.log(response);
                        },
                        (error)=>{
                            DB.updateTaskState(TaskModel,id,'second-task failed');
                            //recursive statement
                            retries(id,conditionCheckRetries-1,timeDelayForRetries,timeDelayForConditionCheck,conditionCheckURL,secondTaskURL,fallbackTaskURL);
                        });
                    }
                    else{
                        DB.updateTaskState(TaskModel,id,'condition-check-task condtion-failure');
                        //recursive statement
                        retries(id,conditionCheckRetries-1,timeDelayForRetries,timeDelayForConditionCheck,conditionCheckURL,secondTaskURL,fallbackTaskURL);
                    }
                },
                (error)=>{
                    DB.updateTaskState(TaskModel,id,'condition-check-task failed');
                    //recursive statement
                    retries(id,conditionCheckRetries-1,timeDelayForRetries,timeDelayForConditionCheck,conditionCheckURL,secondTaskURL,fallbackTaskURL)
                });
            },timeDelayForConditionCheck); 
        }
        else
        {
            tasks.delete(id);
            console.log('successfully deleted task with id '+id +' from tasks map');
            DB.updateTaskState(TaskModel,id,'fallback-task running');
            axios.get(fallbackTaskURL)
            .then((response)=>
            {
                DB.updateTaskState(TaskModel,id,'fallback-task completed');
                //console.log(response);
            },
            (error)=>{
                DB.updateTaskState(TaskModel,id,'fallback-task failed');
            });
        }
    },timeDelayForRetries);  
}

/* perform orchestration */
module.exports.executeOrchestration = function(id,conditionCheckRetries,timeDelayForRetries,timeDelayForConditionCheck,conditionCheckURL,firstTaskURL,secondTaskURL,fallbackTaskURL){
    const TaskModel = orchestrator.TaskModel;
    let tasks = orchestrator.tasks;
    DB.updateTaskState(TaskModel,id,'first-task running');
    axios.get(firstTaskURL)
    .then((response)=>
    {
        DB.updateTaskState(TaskModel,id,'first-task completed');
        setTimeout(function(){
            DB.updateTaskState(TaskModel,id,'condition-check-task running');
            axios.get(conditionCheckURL)
            .then((response)=>
            {
                DB.updateTaskState(TaskModel,id,'condition-check-task completed');
                console.log(response.data);
                if(response.data.conditionSatisfied == 1)
                {
                    DB.updateTaskState(TaskModel,id,'second-task running');
                    axios.get(secondTaskURL)
                    .then((response)=>
                    {
                        DB.updateTaskState(TaskModel,id,'second-task completed');
                        tasks.delete(id);
                    },
                    (error)=>{
                        DB.updateTaskState(TaskModel,id,'second-task failed');
                        retries(id,conditionCheckRetries,timeDelayForRetries,conditionCheckURL,secondTaskURL,fallbackTaskURL);
                    });
                }
                else{
                    DB.updateTaskState(TaskModel,id,'condition-check-task condition-failure');
                    retries(id,conditionCheckRetries,timeDelayForRetries,timeDelayForConditionCheck,conditionCheckURL,secondTaskURL,fallbackTaskURL);
                }
            },
            (error)=>{
                DB.updateTaskState(TaskModel,id,'condition-check-task failed');
                retries(id,conditionCheckRetries,timeDelayForRetries,conditionCheckURL,secondTaskURL,fallbackTaskURL);
            });
        },timeDelayForConditionCheck);
    },
    (error) =>{
        console.log(error);
        DB.updateTaskState(TaskModel,id,'first-task failed');
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


