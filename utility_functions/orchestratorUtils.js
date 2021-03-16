const DB = require("../db.js");
const orchestrator = require("../routes/orchestrator");
const axios = require("axios");

module.exports.retries = function(id,conditionCheckRetries,timeDelayForRetries,conditionCheckURL,secondTaskURL,fallbackTaskURL){
    const TaskModel = orchestrator.TaskModel;
    let tasks = orchestrator.tasks;
    var conditionCheck = setInterval(function(){
        
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
                        tasks.delete(id);
                        clearInterval(conditionCheck);
                    },
                    (error)=>{
                        DB.updateTaskState(TaskModel,id,'second-task failed');
                        console.log('error in executing second task');
                    });
                }
                else{
                    DB.updateTaskState(TaskModel,id,'condition-check-task condtion-failure');
                }
            },
            (error)=>{
                DB.updateTaskState(TaskModel,id,'condition-check-task failed');
                console.log('error in executing condition check');
            });
        }
        else
        {
            clearInterval(conditionCheck);
            tasks.delete(id);
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


