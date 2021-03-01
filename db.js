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




//connect to database
//this.connection();

//create or return a pre-created scheduler collection
// const Task = this.createSchedulerCollection();


//save task in database
/*
    params:
    url: aws lambda api url
    timeDelay: Delay in ms 
    taskState: state of task when it is saved

    returns taskId after saving task in database.
*/
// module.exports.saveTask = function(url,timeDelay,taskState){
//     const task=new Task({lambdaURL:url,timeDelayInMs:timeDelay,
//     taskState:taskState});
//     task.save(function(err,result){ 
//             if (err){ 
//                 console.log(err); 
//             } 
//             else{ 
//                 console.log(result);
//                 console.log(result._id);
//                 return result._id;
//                 tasks.set(result._id,task)
//             } 
//     });
// };



module.exports