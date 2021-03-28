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
  console.log('in retry '+retriesCount);
  axios.get(url,{
      params:params
    })
    .then((response)=>
    {
      //successful response from server
      //update in database taskState to completed
      DB.updateTaskState(TaskModel, id, "completed");
      console.log("successfully executed lambda after retries and remaining retries are "+retriesCount);
      console.log("Response after execution");
      console.log(response);
    },
    (error) => {
      //All status codes in 400/500 are handled here
      console.log('error in executing lambda in retry'+retriesCount);
      retriesCount-=1;
      lambdaErrorHandler(id, url, params,retriesCount,timeDelayBetweenRetries);
    })
} 

function lambdaErrorHandler(id, url, params,retriesCount,timeDelayBetweenRetries)
{
  if(retriesCount>0)
  {
    console.log('retry delay of retry '+retriesCount);
    setTimeout(function(){
      console.log('completed retry delay of retry '+retriesCount);
      console.log('calling retry '+retriesCount);
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
  console.log('successfully deleted task with id '+id +' from tasks map');
  axios.get(url, {
    params:params
  }).then(
    (response) => {
        //update in database taskState to completed
        DB.updateTaskState(TaskModel, id, "completed");
        console.log("successfully executed lambda without retries");
        console.log("Response after execution");
        console.log(response);
    },
    (error) => {
      // console.log(error.data);
      lambdaErrorHandler(id, url, params,retriesCount,timeDelayBetweenRetries);
    }
  );
};

/********************* end helper functions ***************************/
