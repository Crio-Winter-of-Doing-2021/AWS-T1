// const DB = require("../db.js");
// const utils = require("../utility_functions/orchestratorUtils.js");
// const orchestrator = require("../routes/orchestrator");
// const axios = require("axios");


// module.exports.executeFirstTask = function(id, url){
//     const TaskModel = orchestrator.TaskModel;
//     let tasks = orchestrator.tasks;
//     //update in database taskState to running
//     DB.updateTaskState(TaskModel, id, "running first task");
//     axios.get(url, {
//       params:{}
//     }).then(
//       (response) => {
//         //edge case: immediately executing tasks i.e timeDelay 0ms
//         if (tasks.has(id)) {
//           //update in database taskState to completed
//          DB.updateTaskState(TaskModel, id, "First task execution completed");
//         //   console.log("Task " + id + "  deleted succefully from map tasks");
//         //   tasks.delete(id);
//           console.log("successfully executed lambda");
//           console.log("Response after execution");
//           console.log(response);
//           return true;
//         } else {
//           //console.log("Task with taskId " + id + " could not be executed");
//           return false;
//         }
//       },
//       (error) => {
//         if (tasks.has(id)) {
//           tasks.delete(id);
//           console.log("Task " + id + "  deleted succefully from map tasks");
//           //update in database taskState to failed
//           DB.updateTaskState(TaskModel, id, "could not execute first task");
//           console.log("error occured while executing task");
//           console.log(error);
//         } else {
//           console.log("Task with taskId " + id + " could not be executed");
//         }
//         return false;
//       }
//     );
// };

// module.exports.executeSecondTask = function(){
//     const TaskModel = orchestrator.TaskModel;
//     let tasks = orchestrator.tasks;
//     //update in database taskState to running
//     DB.updateTaskState(TaskModel, id, "running second task");
//     axios.get(url, {
//       params:{}
//     }).then(
//       (response) => {
//         //edge case: immediately executing tasks i.e timeDelay 0ms
//         if (tasks.has(id)) {
//           //update in database taskState to completed
//          DB.updateTaskState(TaskModel, id, "second task execution completed");
//         //   console.log("Task " + id + "  deleted succefully from map tasks");
//         //   tasks.delete(id);
//           console.log("successfully executed lambda");
//           console.log("Response after execution");
//           console.log(response);
//           return true;
//         } else {
//           //console.log("Task with taskId " + id + " could not be executed");
//           return false;
//         }
//       },
//       (error) => {
//         if (tasks.has(id)) {
//           tasks.delete(id);
//           console.log("Task " + id + "  deleted succefully from map tasks");
//           //update in database taskState to failed
//           DB.updateTaskState(TaskModel, id, "failed second task");
//           console.log("error occured while executing task");
//           console.log(error);
//         } else {
//           console.log("Task with taskId " + id + " could not be executed");
//         }
//         return false;
//       }
//     );
// };

// module.exports.executeFallbackTask = function(){
//     const TaskModel = orchestrator.TaskModel;
//     let tasks = orchestrator.tasks;
//     //update in database taskState to running
//     DB.updateTaskState(TaskModel, id, "running fallback task");
//     axios.get(url, {
//       params:{}
//     }).then(
//       (response) => {
//         //edge case: immediately executing tasks i.e timeDelay 0ms
//         if (tasks.has(id)) {
//           //update in database taskState to completed
//          DB.updateTaskState(TaskModel, id, "fallback task execution completed");
//         //   console.log("Task " + id + "  deleted succefully from map tasks");
//         //   tasks.delete(id);
//           console.log("successfully executed lambda");
//           console.log("Response after execution");
//           console.log(response);
//           return true;
//         } else {
//           //console.log("Task with taskId " + id + " could not be executed");
//           return false;
//         }
//       },
//       (error) => {
//         if (tasks.has(id)) {
//           tasks.delete(id);
//           console.log("Task " + id + "  deleted succefully from map tasks");
//           //update in database taskState to failed
//           DB.updateTaskState(TaskModel, id, "could not execute fallback task");
//           console.log("error occured while executing task");
//           console.log(error);
//         } else {
//           console.log("Task with taskId " + id + " could not be executed");
//         }
//         return false;
//       }
//     );
// };

// module.exports.executeConditionCheck = function(){
    
// };

