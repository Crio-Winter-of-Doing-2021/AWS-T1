const axios = require("axios");
const scheduler = require("../routes/scheduler");
const DB = require("../db.js");

/*********************** helper functions ************************/

//retrieves parameters passed with the scheduled task in endpoint /schedule
module.exports.getParams = function (req) {
  let ind = 0;
  var params = [];
  let checkbox = req.body.checkbox0;
  while (typeof checkbox != "undefined") {
    let temp = "";
    if (checkbox == "on") {
      temp = "key" + ind;
      const key = req.body[temp];
      temp = "value" + ind;
      const value = req.body[temp];
      if (key != "" || value != "") {
        params.push({ key, value });
      }
    }
    ind++;
    temp = "checkbox" + ind;
    checkbox = req.body[temp];
  }
  //create a JSON object out of params to store in db as JSON string
  let data = {};
  for (var i = 0; i < params.length; i++) {
    data[params[i].key] = params[i].value;
  }
  return data;
};

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

function retry(id, url, params,retriesCount,timeDelayBetweenRetries)
{
  console.log('in retry '+retriesCount);
  axios.get(url,{
      params:params
    })
    .then((response)=>
    {
      const TaskModel = scheduler.TaskModel;
      let tasks = scheduler.tasks;
      console.log("Task " + id + "  deleted succefully from map tasks");
      //update in database taskState to completed
      DB.updateTaskState(TaskModel, id, "completed");
      console.log("successfully executed lambda after retries and remaining retries are "+retriesCount);
      console.log("Response after execution");
      console.log(response);
    },
    (error) => {
      console.log('error '+retriesCount);
      retriesCount-=1;
      if(retriesCount>0)
      {
        console.log('waiting '+retriesCount);
        setTimeout(function(){
          console.log('waiting complete '+retriesCount);
          console.log('calling retry '+retriesCount);
          retry(id, url, params,retriesCount,timeDelayBetweenRetries);
        },timeDelayBetweenRetries);
      }
      else{
        const TaskModel = scheduler.TaskModel;
        let tasks = scheduler.tasks;
        console.log("Task " + id + "  deleted succefully from map tasks");
        DB.updateTaskState(TaskModel, id, "failed");
        console.log("All retries exhausted!! Task Failed!");
      }
    })
} 

//Execute Lambda function
module.exports.executeAWSLambda = function (id, url, params,retriesCount,timeDelayBetweenRetries) {
  
  const TaskModel = scheduler.TaskModel;
  let tasks = scheduler.tasks;
  //update in database taskState to running
  DB.updateTaskState(TaskModel, id, "running");
  //delete task from tasks map as lambda has triggered already and task cannot be 
  //deleted or modified
  tasks.delete(id);
  axios.get(url, {
    params:params
  }).then(
    (response) => {
      //update in database taskState to completed
      DB.updateTaskState(TaskModel, id, "completed");
      console.log("Task " + id + "  deleted succefully from map tasks");
      console.log("successfully executed lambda without retries");
      console.log("Response after execution");
      console.log(response);
    },
    (error) => {
      console.log('error in executing lambda!! Retry');
      if(retriesCount>0)
      {
        console.log('waiting '+retriesCount);
        setTimeout(function(){
          console.log('waiting complete '+retriesCount);
          console.log('calling retry');
          retry(id, url, params,retriesCount,timeDelayBetweenRetries);
        },timeDelayBetweenRetries);
      }
      else{
        console.log("Task " + id + "  deleted succefully from map tasks");
        DB.updateTaskState(TaskModel, id, "failed");
      }
    }
  );
};

/********************* end helper functions ***************************/
