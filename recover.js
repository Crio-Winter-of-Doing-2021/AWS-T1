const axios = require("axios");
const scheduler = require("../routes/scheduler");
const DB = require(__dirname + "/db.js");


module.exports.recoverTasks = function () {
    TaskModel = scheduler.TaskModel;
    TaskModel.find({}, function (err, results) {
        if (err) {
          console.log('could not recover tasks');
        } else {
          for(var i=0;i<results.length;i++)
          {
              var taskState=results[i].taskState;
              if(taskState=='running')
              {
                 
              }
              else if(taskState=='scheduled')
              {

              }
          }
        }
      });
  };