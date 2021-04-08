const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");
/*connects to database schedulerDB */
module.exports.connection = function () {
  mongoose.connect("mongodb://localhost:27017/schedulerDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false,
  });
  mongoose.connection
    .once("open", function () {
      console.log("Database connection has been made");
    })
    .on("error", function (error) {
      console.log("error is" + error);
    });
};

/*
    creates a collection in schedulerDB with fields
    {lambdaURL, timeDelayInMs, taskState} 
*/
module.exports.createSchedulerCollection = function () {
  const schedulerCollection = mongoose.Schema({
    username: String,
    taskName:String,
    lambdaURL: String,
    scheduledTime:String,
    retriesCount: Number,
    retriesLeft:Number,
    timeDelayBetweenRetries: Number,
    parameters:String,
    taskState: String,
    serverResponse:String
  });
  return mongoose.model("task", schedulerCollection);
};

module.exports.createUsersCollection = function () {
  const userAuthCollection = mongoose.Schema({
    username: String,
    password: String
  });
  //enable passportLocalMongoose for auth collection
  userAuthCollection.plugin(passportLocalMongoose);
  return mongoose.model("user", userAuthCollection);
};

module.exports.createOrchestratorCollection = function(){
  const orchestratorCollection = mongoose.Schema({
    username:String,
    taskName:String,
    scheduledTime:String,
    firstTaskURL: String,
    secondTaskURL: String,
    conditionCheckURL:String,
    fallbackTaskURL:String,
    taskState:String,
    conditionCheckRetries:Number,
    initialDelay:Number,
    timeDelayBetweenRetries:Number,
    timeDelayForConditionCheck:Number,
    serverResponse:String
  });
  return mongoose.model("orchestratorTask", orchestratorCollection);
};

module.exports.updateTaskState = function (TaskModel, id, taskState) {
  TaskModel.findByIdAndUpdate(
    id,
    { taskState: taskState },
    function (err, result) {
      if (err) {
        console.log(
          "could not update to taskState " + taskState + " of taskId " + id
        );
      } else {
        console.log(
          "Updated taskState to " + taskState + " of taskId " + id
        );
      }
    }
  );
};

module.exports.updateRetriesLeft = function (TaskModel, id, retriesLeft) {
  TaskModel.findByIdAndUpdate(
    id,
    { retriesLeft:retriesLeft},
    function (err, result) {
      if (err) {
        console.log(
          "could not update to retries left of taskId " + id
        );
      } else {
        console.log('updated retriesLeft to '+retriesLeft);
      }
    }
  );
};

module.exports.updateServerResponse = function (TaskModel, id, msg) {
  TaskModel.findByIdAndUpdate(
    id,
    { serverResponse:msg},
    function (err, result) {
      if (err) {
        console.log(
          "could not update server response of task with " + id
        );
      } else {
        console.log('Updated server response for task with id '+id+' to '+msg);
      }
    }
  );
};



module.exports.modifyTaskScheduledTime = function (TaskModel, id, scheduledTime) {
  TaskModel.findByIdAndUpdate(
    id,
    { scheduledTime: scheduledTime },
    function (err, result) {
      if (err) {
        console.log(
          "could not update to scheduledTime " + scheduledTime + " of taskId " + id
        );
      } else {
        console.log(
          "successfully updated scheuldedTime to " + scheduledTime + " of taskId " + id
        );
      }
    }
  );
};
