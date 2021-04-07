const axios = require("axios");
const scheduler = require("../routes/scheduler");
const DB = require("../db.js");
const { response } = require("express");

/*********************** helper functions ************************/

const TaskModel = scheduler.TaskModel;
let tasks = scheduler.tasks;

//retrieves parameters passed with the scheduled task in endpoint /schedule
module.exports.getParams = function (req) {
  let ind = 0;
  var params = [];
  let checkbox = req.body.checkbox0;
  while (typeof checkbox != "undefined") {
    let temp = "";
    if (checkbox != "off") {
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

/* retry executing lambda */
function retry(id, url, params,retriesCount,timeDelayBetweenRetries)
{
  const TaskModel = scheduler.TaskModel;
  axios.get(url,{
      params:params
    })
    .then((response)=>
    {
      //successful response from server
      //update retries left in database
      retriesCount-=1;
      console.log("Remaining retries "+retriesCount);
      DB.updateRetriesLeft(TaskModel,id,retriesCount);
      console.log("Executed lambda on retries");
      //update serverResponse in DB
      let msg = {status:response.status,data:response.data};
      msg=JSON.stringify(msg);
      DB.updateServerResponse(TaskModel,id,msg);
      //update in database taskState to completed
      DB.updateTaskState(TaskModel, id, "completed");
    },
    (error) => {
      //All status codes in 400/500 are handled here
      retriesCount-=1;
      //update retries left in database
      DB.updateRetriesLeft(TaskModel,id,retriesCount);
      lambdaErrorHandler(error,id, url, params,retriesCount,timeDelayBetweenRetries);
    })
  }

function lambdaErrorHandler(error,id, url, params,retriesCount,timeDelayBetweenRetries)
{
  const TaskModel = scheduler.TaskModel;
  //update server response in DB based on error
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
    DB.updateServerResponse(TaskModel,id,"The request was made to lambda but no response was received");
  } else {
    // Something happened in setting up the request that triggered an Error
    let msg = JSON.stringify(error.message);
    msg=JSON.stringify(msg);
    DB.updateServerResponse(TaskModel,id,msg);
  }
  //check retries
  if(retriesCount>0)
  {
    setTimeout(function(){
      console.log('Performing Retry '+retriesCount);
      retry(id, url, params,retriesCount,timeDelayBetweenRetries);
    },timeDelayBetweenRetries);
  }
  else{
    DB.updateTaskState(TaskModel, id, "failed");
  }
}

//Execute Lambda function
module.exports.executeAWSLambda = function (id, url, params,retriesCount,timeDelayBetweenRetries) {
  
  const TaskModel = scheduler.TaskModel;
  let tasks = scheduler.tasks;
  if(tasks.has(id)){
    tasks.delete(id);
    console.log("Deleted task with id "+id+" from tasks map");
  }
  //update in database taskState to running
  DB.updateTaskState(TaskModel, id, "running");
  axios.get(url, {
    params:params
  }).then(
    (response) => {
        //update in database taskState to completed
        DB.updateTaskState(TaskModel, id, "completed");
        console.log("Executed lambda without retries");
        let msg = {status:response.status,data:response.data};
        msg=JSON.stringify(msg);
        DB.updateServerResponse(TaskModel,id,msg);
    },
    (error) => {
      lambdaErrorHandler(error,id, url, params,retriesCount,timeDelayBetweenRetries);
    }
  );
};

/********************* end helper functions ***************************/
