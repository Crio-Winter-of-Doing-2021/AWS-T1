const express = require("express");
const bodyParser = require("body-parser");
const _ = require("lodash");
const mongoose = require('mongoose');
const DB = require(__dirname+'/db.js');

const app = express();
app.set('view engine','ejs');
app.set('views', __dirname + '/views');

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//connect to database
DB.connection();

//create or return a pre-created scheduler collection
const Task = DB.createSchedulerCollection();

//save a task schedule in tasks collection
// const task=new Task({scheduleTimeSecond:"0",scheduleTimeMinute:"0",
//     scheduleTimeHour:"0",scheduleTimeDayOfMonth:"0",
//     scheduleTimeMonth:"0",scheduleTimeDayOfWeek:"0",
//     taskState:"scheduled"});
// task.save();

app.get("/",function(req,res){
    console.log("Requesting home page")
    res.render("home");
});

app.listen(3000,function(){
    console.log("server started at port 3000");
});