const scheduler = require("../routes/scheduler");
const utils = require("./schedulerUtils.js");
const DB = require("../db.js");


module.exports.recoverTasks = function () {
    let tasks = scheduler.tasks;
    let taskDetails = scheduler.taskDetails;
    const TaskModel = scheduler.TaskModel;
    TaskModel.find({}, function (err, results) {
        if (err) {
          console.log('could not recover tasks');
        } else {
          for(var i=0;i<results.length;i++)
          {
              var taskState=results[i].taskState;
              if(taskState=='running')
              {
                DB.updateTaskState(TaskModel,results[i]._id,'failed');
              }
              else if(taskState=='scheduled')
              {
                //retrieve all the details of the task
                let id = results[i]._id.toString();
                let url = results[i].lambdaURL;
                let time = results[i].scheduledTime;
                let retriesCount = results[i].retriesCount;
                let timeDelayBetweenRetries = results[i].timeDelayBetweenRetries;
                let params = JSON.parse(results[i].parameters);
                //calculate time delay from provided scheduled date and time
                var presentTimeInMsSinceEpoch = Date.now();
                var scheduleTimeInMsSinceEpoch = Date.parse(time);
                var timeDelay = scheduleTimeInMsSinceEpoch- presentTimeInMsSinceEpoch;
                console.log("delay in Ms "+ timeDelay);
                //If we provide time which has passed task is executed immediately
                if(timeDelay<0)
                {
                  timeDelay = 0;
                }
                //store task details in taskDetails map
                taskDetails.set(id,{url:url,params:params,
                                retriesCount:retriesCount,timeDelayBetweenRetries:timeDelayBetweenRetries});
                // schedule the aws lambda task
                var task = setTimeout(function () {
                  utils.executeAWSLambda(id, url, params,retriesCount,timeDelayBetweenRetries);
                }, timeDelay);
                tasks.set(id, task);
              }
          }
        }
      });
  };