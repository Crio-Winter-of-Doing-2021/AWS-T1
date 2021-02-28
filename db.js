const mongoose = require('mongoose');

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

module.exports.createSchedulerCollection=function(){
    //connection();
    const schedulerCollection= mongoose.Schema({
        scheduleTimeSecond:String,
        scheduleTimeMinute:String,
        scheduleTimeHour:String,
        scheduleTimeDayOfMonth:String,
        scheduleTimeMonth:String,
        scheduleTimeDayOfWeek:String,
        taskState:String
    });
    return mongoose.model("task",schedulerCollection);
};