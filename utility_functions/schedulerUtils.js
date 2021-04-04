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
      DB.updateRetries(TaskModel,id,retriesCount);
      //update in database taskState to completed
      DB.updateTaskState(TaskModel, id, "completed");
      console.log("Remaining retries "+retriesCount);
      console.log("Response after execution");
      console.log(response.data);
    },
    (error) => {
      //All status codes in 400/500 are handled here
      retriesCount-=1;
      //update retries left in database
      DB.updateRetries(TaskModel,id,retriesCount);
      lambdaErrorHandler(id, url, params,retriesCount,timeDelayBetweenRetries);
    })
} 

function lambdaErrorHandler(id, url, params,retriesCount,timeDelayBetweenRetries)
{
  if(retriesCount>0)
  {
    setTimeout(function(){
      console.log('Performing Retry '+retriesCount);
      retry(id, url, params,retriesCount,timeDelayBetweenRetries);
    },timeDelayBetweenRetries);
  }
  else{
    const TaskModel = scheduler.TaskModel;
    DB.updateTaskState(TaskModel, id, "failed");
  }
}

//Execute Lambda function
module.exports.executeAWSLambda = function (id, url, params,retriesCount,timeDelayBetweenRetries) {
  
  const TaskModel = scheduler.TaskModel;
  let tasks = scheduler.tasks;
  //update in database taskState to running
  DB.updateTaskState(TaskModel, id, "running");
  //delete task from tasks map as lambda has triggered already and task cannot be 
  //deleted or modified after lambda has been triggered
  tasks.delete(id);
  console.log('Deleted task with id '+id +' from tasks map');
  axios.get(url, {
    params:params
  }).then(
    (response) => {
        //update in database taskState to completed
        DB.updateTaskState(TaskModel, id, "completed");
        console.log("successfully executed lambda without retries");
        console.log("Response after execution");
        console.log(response.data);
    },
    (error) => {
      // console.log(error.data);
      lambdaErrorHandler(id, url, params,retriesCount,timeDelayBetweenRetries);
    }
  );
};

/********************* end helper functions ***************************/
