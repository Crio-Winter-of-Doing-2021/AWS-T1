const utils = require("./orchestratorUtils.js");
const moment = require("moment");
const orchestrator = require("../routes/orchestrator");
const DB = require("../db.js");

module.exports.recoverOrchestratorTasks = function () {
    let tasks = orchestrator.tasks;
    const TaskModel = orchestrator.TaskModel;
    //Retrieve all orchestrations irrespective of user
    TaskModel.find({}, function (err, results) {
        if (err) {
          console.log('could not recover tasks');
        } 
        else 
        {
            // const st = new Set(["secondTaskSuccess","fallbackTaskSuccess","fallbackTaskFailed",
            // "secondTaskFailed","cancelled","firstTaskFailed","firstTaskSuccess"]);
          const st = new Set(["completed", "running", "failed", "Failed", "conditionCheckTaskRunning", "conditionCheckTaskSuccess", "conditionCheckTaskFailed"]);
            
          for(var i=0;i<results.length;i++)
          {
              var taskState=results[i].taskState;
              let id = results[i]._id.toString();
              let conditionCheckRetries=results[i].conditionCheckRetries;
              let timeDelayForRetries = results[i].timeDelayForRetries;
              let timeDelayForConditionCheck = results[i].timeDelayForConditionCheck;
              let conditionCheckURL = results[i].conditionCheckURL;
              let tasksURL = results[i].tasksURL;
              let fallbackTaskURL = results[i].fallbackTaskURL;
              //console.log(JSON.stringify(results[i]));
              if(taskState=='scheduled')
              {
                let time = results[i].scheduledTime;
                //calculate time delay from provided scheduled date and time
                var presentTimeInMsSinceEpoch = Date.now();
                //console.log(presentTimeInMsSinceEpoch);
                var scheduleTimeInMsSinceEpoch = moment(time,'LLLL').valueOf();
                console.log(scheduleTimeInMsSinceEpoch);
                scheduleTimeInMsSinceEpoch-=results[i].initialDelay;
                //console.log(scheduleTimeInMsSinceEpoch);
                var timeDelay = scheduleTimeInMsSinceEpoch - presentTimeInMsSinceEpoch;
                console.log("delay in Ms "+ timeDelay);
                //If we provide time which has passed task is executed immediately
                if(timeDelay<0)
                {
                  timeDelay = 0;
                }
                // schedule the aws lambda task
                //console.log(results[i].conditionCheckRetries);
                var task = setTimeout(function () {
                    utils.executeOrchestration(id,conditionCheckRetries,timeDelayForRetries,
                      timeDelayForConditionCheck,conditionCheckURL,tasksURL,fallbackTaskURL);
                }, timeDelay);
                tasks.set(id, task);
              }
              else if(!st.has(taskState)){
                let state = taskState.substring(0,taskState.lastIndexOf("k")+1)+"Failed";
                DB.updateTaskState(TaskModel,id,state);
              }
          }
        }
    });
  };