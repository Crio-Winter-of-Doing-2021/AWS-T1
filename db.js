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
  //connection();
  const schedulerCollection = mongoose.Schema({
    username: String,
    lambdaURL: String,
    timeDelayInMs: String,
    taskState: String,
  });
  return mongoose.model("task", schedulerCollection);
};

module.exports.createUsersCollection = function () {
  const userAuthCollection = mongoose.Schema({
    username: String,
    password: String,
  });
  //enable passportLocalMongoose for auth collection
  userAuthCollection.plugin(passportLocalMongoose, {
    incorrectPasswordError: "incorrectPasswordError",
    incorrectUsernameError: "incorrectUsernameError",
  });
  return mongoose.model("user", userAuthCollection);
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
          "successfully updated taskState to: " + taskState + " of taskId " + id
        );
      }
    }
  );
};

