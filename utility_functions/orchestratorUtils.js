const DB = require("../db.js");
const orchestrator = require("../routes/orchestrator");
const axios = require("axios");

module.exports.retries = function(id,conditionCheckRetries,timeDelayForRetries,conditionCheckURL,secondTaskURL,fallbackTaskURL){
    const TaskModel = orchestrator.TaskModel;
    let tasks = orchestrator.tasks;
    setTimeout(function(){
        if(conditionCheckRetries>0)
        {
            console.log(conditionCheckRetries);
            conditionCheckRetries-=1;
            DB.updateTaskState(TaskModel,id,'condition-check-task running');
            axios.get(conditionCheckURL)
            .then((response)=>
            {
                DB.updateTaskState(TaskModel,id,'condition-check-task completed');
                console.log('condition check executed');
                console.log(response.data);
                if(response.data.conditionSatisfied == 1)
                {
                    DB.updateTaskState(TaskModel,id,'second-task running');
                    console.log('got here');
                    axios.get(secondTaskURL)
                    .then((response)=>
                    {
                        DB.updateTaskState(TaskModel,id,'second-task completed');
                        console.log('second task executed');
                    },
                    (error)=>{
                        DB.updateTaskState(TaskModel,id,'second-task failed');
                        console.log('error in executing second task');
                        //recursive statement
                        retries(id,conditionCheckRetries-1,timeDelayForRetries,conditionCheckURL,secondTaskURL,fallbackTaskURL);
                    });
                }
                else{
                    DB.updateTaskState(TaskModel,id,'condition-check-task condtion-failure');
                    //recursive statement
                    retries(id,conditionCheckRetries-1,timeDelayForRetries,conditionCheckURL,secondTaskURL,fallbackTaskURL);
                }
            },
            (error)=>{
                DB.updateTaskState(TaskModel,id,'condition-check-task failed');
                console.log('error in executing condition check');
                //recursive statement
                retries(id,conditionCheckRetries-1,timeDelayForRetries,conditionCheckURL,secondTaskURL,fallbackTaskURL)
            });
        }
        else
        {
            DB.updateTaskState(TaskModel,id,'fallback-task running');
            axios.get(fallbackTaskURL)
            .then((response)=>
            {
                DB.updateTaskState(TaskModel,id,'fallback-task completed');
                console.log('fallback task executed');
                //console.log(response);
            },
            (error)=>{
                DB.updateTaskState(TaskModel,id,'fallback-task failed');
                console.log('error in executing fallback task');
            });
        }
    },timeDelayForRetries);  
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


