const mongoose = require('mongoose');

/*connects to database schedulerDB */
module.exports.connection=function(){
    //connect with database
    mongoose.connect('mongodb://localhost:27017/schedulerDB',{
        useNewUrlParser:true,
        useUnifiedTopology: true,
        useCreateIndex: true,
        useFindAndModify: false
    });
    mongoose.connection.once('open',function(){
        console.log('Database connection has been made');
    }).on('error',function(error){
        console.log('error is'+error);
    });
};



/*
    creates a collection in schedulerDB with fields
    {lambdaURL, timeDelayInMs, taskState} 
*/
module.exports.createSchedulerCollection=function(){
    //connection();
    const schedulerCollection= mongoose.Schema({
        lambdaURL:String,
        timeDelayInMs:String,
        taskState:String
    });
    return mongoose.model("task",schedulerCollection);
};

module.exports.updateTaskState = function(TaskModel,id,taskState){
    TaskModel.findByIdAndUpdate(id,{taskState: taskState}, function(err, result){
            if(err)
            {
                console.log('could not update');
            }
            else{
                console.log('successfully updated taskState to: '+taskState);
            }
            
    });
    // var action=function(err,collection)
    // {
        
    //     collection.updateOne({ _id:id },{ $set:{taskState:taskState }
    //     });
    // }
    // //await Task.updateOne({ _id:id },{ $set: { taskState: taskState }});
    // mongoose.connection.db.collection('tasks',action);
}

//connect to database
//this.connection();

//create or return a pre-created scheduler collection
// const Task = this.createSchedulerCollection();





