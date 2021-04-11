const DB = require("../db.js");
const orchestrator = require("../routes/orchestrator");
const axios = require("axios");
const { response } = require("express");

function serverResponseHandler(obj,id,flag)
{
    TaskModel = orchestrator.TaskModel;
    /* flag==0 -> got response, flag==1 -> got error */
    if(flag==0)
    {
        response=obj;
        let msg = {status:response.status,data:response.data};
        msg=JSON.stringify(msg);
        DB.updateServerResponse(TaskModel,id,msg);
    }
    else{
        error=obj;
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            let msg = {status:error.response.status,data:error.response.data};
            msg=JSON.stringify(msg);
            DB.updateServerResponse(TaskModel,id,msg);
          } else if (error.request) {
            // The request was made but no response was received
            // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
            // http.ClientRequest in node.js
            DB.updateServerResponse(TaskModel,id,"The request was made but no response was received");
          } else {
            // Something happened in setting up the request that triggered an Error
            let msg = JSON.stringify(error.message);
            msg=JSON.stringify(msg);
            DB.updateServerResponse(TaskModel,id,msg);
          }
    }
}

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
                        serverResponseHandler(response,id,0);
                        console.log(response.data);
                    },
                    (error)=>{
                        DB.updateTaskState(TaskModel,id,'secondTaskFailed');
                        serverResponseHandler(error,id,1);
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
            serverResponseHandler(response,id,0);
        },
        (error)=>{
            DB.updateTaskState(TaskModel,id,'fallbackTaskFailed');
            serverResponseHandler(error,id,1);
        });
    } 
}

function executeTask(url, callback){
    axios.get(url)
    .then((response)=>
    {
        callback(response, null)
    },
    (error) => {
        callback(null, error)
    })
}

function recurse(id, taskURL, ind, tot_ind, conditionCheckURL, timeDelayForConditionCheck, timeDelayForRetries, fallbackTaskURL, conditionCheckRetries){
    if (ind>=tot_ind){
        return 
    }
    DB.updateTaskState(orchestrator.TaskModel,id,'Running-'+(ind+1));
    executeTask(taskURL[ind], (res, err)=>{
        if(err){
            DB.updateTaskState(orchestrator.TaskModel,id,'Failed-'+(ind+1));
            serverResponseHandler(err,id,1);
        }
        else{
            DB.updateTaskState(orchestrator.TaskModel, id, 'Success-'+(ind+1));
            serverResponseHandler(res,id,1);
            setTimeout(function(){
                axios.get(conditionCheckURL)
                .then(response=>{
                    DB.updateTaskState(orchestrator.TaskModel, id, 'conditionCheckSuccess-'+(ind+1));
                    console.log(response.data);
                    recurse(id, taskURL, ind+1, tot_ind, conditionCheckURL, timeDelayForConditionCheck, timeDelayForRetries, fallbackTaskURL);
                },
                error=>{
                    DB.updateTaskState(orchestrator.TaskModel, id, 'conditionCheckFailed');
                    retries(id,conditionCheckRetries,timeDelayForRetries,conditionCheckURL,secondTaskURL,fallbackTaskURL);
                })
            }, timeDelayForConditionCheck)
        }
    })
}
/* perform orchestration */
module.exports.executeOrchestration = function(id,conditionCheckRetries,timeDelayForRetries,timeDelayForConditionCheck,conditionCheckURL,tasksURL,fallbackTaskURL){
    const TaskModel = orchestrator.TaskModel;
    let tasks = orchestrator.tasks;
    if(tasks.has(id))
    {
        tasks.delete(id);
        console.log('Deleted orchestration with id '+id +' from tasks map');
    }
    if (!tasksURL){
        DB.updateTaskState(TaskModel, id, 'Failed')
        return
    }
    recurse(id, tasksURL, 0, tasksURL.length, conditionCheckURL, timeDelayForRetries, timeDelayForConditionCheck, fallbackTaskURL, conditionCheckRetries);
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


