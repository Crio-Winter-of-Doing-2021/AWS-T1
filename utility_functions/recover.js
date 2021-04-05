const scheduler = require("../routes/scheduler");
const utils = require("./schedulerUtils.js");
const DB = require("../db.js");


module.exports.recoverTasks = function () {
    let tasks = scheduler.tasks;
    let taskDetails = scheduler.taskDetails;
    const TaskModel = scheduler.TaskModel;
    //Retrieve all the tasks which are in scheduled or running tasks irrespective of user
    TaskModel.find({taskState:{$in: ['scheduled', 'running']}}, function (err, results) {
        console.log("**** Task Recovery *****");
        if (err) {
          console.log('could not recover tasks');
        } else 
        {
          if(results.length==0){
            console.log('There are no tasks to be recovered!');
          }
          for(var i=0;i<results.length;i++)
          {
              var taskState=results[i].taskState;
              if(taskState=='running')
              {
                //update taskState to failed
                DB.updateTaskState(TaskModel,results[i]._id,'failed');
                //update retries left to 0 in database
                DB.updateRetries(TaskModel,results[i]._id,0);
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