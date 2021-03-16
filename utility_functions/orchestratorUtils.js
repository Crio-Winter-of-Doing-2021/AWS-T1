const DB = require("../db.js");
const orchestrator = require("../routes/orchestrator");
const axios = require("axios");

function retries(id,conditionCheckRetries,timeDelayForRetries,conditionCheckURL,secondTaskURL,fallbackTaskURL){
    const TaskModel = orchestrator.TaskModel;
    let tasks = orchestrator.tasks;
    var conditionCheck = setInterval(function(){
        if(conditionCheckRetries>0)
        {
            console.log(conditionCheckRetries);
            conditionCheckRetries-=1;
            axios.get(conditionCheckURL)
            .then((response)=>
            {
                console.log('condition check executed');
                console.log(response);
                if(response.data.conditionSatisfied == 1)
                {
                    console.log('got here');
                    axios.get(secondTaskURL)
                    .then((response)=>
                    {
                        console.log('second task executed');
                        tasks.delete(id);
                        clearInterval(conditionCheck);
                    },
                    (error)=>{
                        console.log('error in executing second task');
                    });
                }
            },
            (error)=>{
                console.log('error in executing condition check');
            });
        }
        else
        {
            clearInterval(conditionCheck);
            tasks.delete(id);
            axios.get(fallbackTaskURL)
            .then((response)=>
            {
                console.log('fallback task executed');
                //console.log(response);
            },
            (error)=>{
                console.log('error in executing fallback task');
            });
        }
    },timeDelayForRetries);  
}
