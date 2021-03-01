const express = require("express");
const bodyParser = require("body-parser");
const _ = require("lodash");
const mongoose = require('mongoose');
const DB = require(__dirname+'/db.js');
const axios = require('axios');

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

//tasks maps taskId with its setTimeout() function call
let tasks = new Map();

app.get("/",function(req,res){
    console.log("Requesting home page");
    res.render("home");
});

app.get("/schedule",function(req,res){
    res.render('scheduleTask');
});

app.post("/schedule",function(req,res){
    const url=req.body.URL;
    const timeDelay=req.body.timeInMs;
    const taskState='scheduled';
    console.log("url: "+url);
    console.log("timeInMs: "+timeDelay);
    
    // schedule the aws lambda task
    var task = setTimeout(function(){
        axios.post(url, {
            'key1':'value1'
          })
          .then((response) => {
            console.log(response);
          }, (error) => {
            console.log(error);
          });
    },timeDelay);

    //store task details in database
    const taskInfo = new Task({lambdaURL:url,timeDelayInMs:timeDelay,
        taskState:taskState});
        taskInfo.save(function(err,result){ 
                if (err){ 
                    console.log(err); 
                } 
                else{ 
                    // need error handling 
                    // console.log(result);
                    // console.log(typeof result._id);
                    let id=JSON.stringify(result._id);
                    id=id.substring(1,id.length-1);
                    console.log("id "+id);
                    tasks.set(id,task);
                    // console.log(tasks.get(id));
                    //update state of task to cancelled in db
                    res.json({'id':result._id});
                } 
        });
    
});

app.get("/cancel",function(req,res){
    res.render('cancelTask');
});

app.post("/cancel",function(req,res){
    let taskId = req.body.taskId;
    // console.log("in cancel "+ taskId);
    //taskId=""+taskId;
    // console.log(tasks);
    // console.log('in cancel'+ tasks.get(taskId));
    clearTimeout(tasks.get(taskId));
    res.render('cancelTask');
});

app.listen(3000,function(){
    console.log("server started at port 3000");
});