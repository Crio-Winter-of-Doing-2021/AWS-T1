const DB = require("../db.js");
const orchestrator = require("../routes/orchestrator");
const axios = require("axios");

function serverResponseHandler(obj,id,flag)
{
    const TaskModel = orchestrator.TaskModel;
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
function retries(id,conditionCheckRetries,timeDelayForRetries,conditionCheckURL,tasksURL,ind,fallbackTaskURL){
    const TaskModel = orchestrator.TaskModel;
    if(conditionCheckRetries>0)
    {
        setTimeout(function(){
            DB.updateTaskStateDetailed(TaskModel,id,'conditionCheckTaskRunning');
            axios.get(conditionCheckURL)
            .then((response)=>
            {
                DB.updateTaskStateDetailed(TaskModel,id,'conditionCheckTaskSuccess');
                recurse(id, tasksURL, ind+1,conditionCheckURL, timeDelayForConditionCheck, timeDelayForRetries, fallbackTaskURL, conditionCheckRetries)
            },
            (error)=>{
                DB.updateTaskStateDetailed(TaskModel,id,'conditionCheckTaskFailed');
                //recursive statement
                retries(id,conditionCheckRetries-1,timeDelayForRetries,conditionCheckURL,tasksURL,ind,fallbackTaskURL);
            });
        },timeDelayForRetries); 
    }
    else{
        DB.updateTaskState(TaskModel,id,'failed');
        DB.updateTaskStateDetailed(TaskModel,id,'fallbackTaskRunning');
        axios.get(fallbackTaskURL)
        .then((response)=>
        {
            DB.updateTaskStateDetailed(TaskModel,id,'fallbackTaskSuccess');
            serverResponseHandler(response,id,0);
        },
        (error)=>{
            DB.updateTaskStateDetailed(TaskModel,id,'fallbackTaskFailed');
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

function recurse(id, tasksURL, ind, conditionCheckURL, timeDelayForConditionCheck, timeDelayForRetries, fallbackTaskURL, conditionCheckRetries){
    if (ind>=tasksURL.length){
        DB.updateTaskState(orchestrator.TaskModel,id,'completed');
        return;
    }
    executeTask(tasksURL[ind], (res, err)=>{
        if(err){
            DB.updateTaskStateDetailed(orchestrator.TaskModel,id,'Failed-'+(ind+1));
            DB.updateTaskState(orchestrator.TaskModel, id, 'failed');
            serverResponseHandler(err,id,1);
        }
        else{
            DB.updateTaskStateDetailed(orchestrator.TaskModel, id, 'Success-'+(ind+1));
            serverResponseHandler(res,id,0);
            if(ind!=tasksURL.length-1)
            {
                setTimeout(function(){
                    DB.updateTaskStateDetailed(orchestrator.TaskModel, id, 'conditionCheckTaskRunning');
                    axios.get(conditionCheckURL)
                    .then(response=>{
                        DB.updateTaskStateDetailed(orchestrator.TaskModel, id, 'conditionCheckTaskSuccess');
                        console.log(response.data);
                        recurse(id, tasksURL, ind+1, conditionCheckURL, timeDelayForConditionCheck, timeDelayForRetries, fallbackTaskURL,conditionCheckRetries);
                    },
                    error=>{
                        DB.updateTaskStateDetailed(orchestrator.TaskModel, id, 'conditionCheckTaskFailed');
                        retries(id,conditionCheckRetries,timeDelayForRetries,conditionCheckURL,tasksURL,ind,fallbackTaskURL);
                    })
                }, timeDelayForConditionCheck);
            }
            else{
                DB.updateTaskState(orchestrator.TaskModel,id,'completed');
            }
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
        DB.updateTaskState(TaskModel, id, 'failed');
        return;
    }
    DB.updateTaskState(orchestrator.TaskModel,id,'running');
    recurse(id, tasksURL, 0, conditionCheckURL, timeDelayForRetries, timeDelayForConditionCheck, fallbackTaskURL, conditionCheckRetries);
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


