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
  return params;
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

//Execute Lambda function
module.exports.executeAWSLambda = function (id, url, params) {
  const TaskModel = scheduler.TaskModel;
  let tasks = scheduler.tasks;
  //update in database taskState to running
  DB.updateTaskState(TaskModel, id, "running");
  axios.post(url, params).then(
    (response) => {
      //edge case: immediately executing tasks i.e timeDelay 0ms
      if (tasks.has(id)) {
        //update in database taskState to completed
        DB.updateTaskState(TaskModel, id, "completed");
        console.log("Task " + id + "  deleted succefully from map tasks");
        tasks.delete(id);
        console.log("successfully executed lambda");
        console.log("Response after execution");
        console.log(response);
      } else {
        console.log("There is no task with taskId " + id);
      }
    },
    (error) => {
      if (tasks.has(id)) {
        console.log("Task " + id + "  deleted succefully from map tasks");
        tasks.delete(id);
        //update in database taskState to failed
        DB.updateTaskState(TaskModel, id, "failed");
        console.log("error occured while executing task");
        console.log(error);
      } else {
        console.log("There is no task with taskId " + id);
      }
    }
  );
};

/********************* end helper functions ***************************/
