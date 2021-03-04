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
const TaskModel = DB.createSchedulerCollection();

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
    const timeDelay=req.body['timeInMs'];
    const taskState='initial stage';
    console.log("url: "+url);
    console.log("timeInMs: "+timeDelay);
    let ind=0;
    var params=[];
    let checkbox=req.body.checkbox0;
    // console.log('checkbox '+checkbox0);
    // console.log(typeof checkbox0);
    while(typeof checkbox!="undefined")
    {
        let temp='';
        //console.log(checkbox);
        if(checkbox=="on")
        {
            //console.log('inside');
            temp='key'+ind;
            const key=req.body[temp];
            temp='value'+ind;
            const value=req.body[temp];
            //console.log(key+" "+value);
            if(key!=""||value!="")
            {
                params.push({key,value});
            }
        }
        ind++;
        temp='checkbox'+ind;
        checkbox=req.body[temp];
        //console.log("checkbox "+checkbox)
    }
    //console.log('params: '+params);
    // res.send('submitted');
    let id='';
    
    // schedule the aws lambda task
    var task = setTimeout(function(){
        //TODO: update in database taskState to running
        DB.updateTaskState(TaskModel,id,'running');
        axios.post(url,params)
          .then((response) => {
                //edge case: immediately executing tasks i.e timeDelay 0ms 
                if(tasks.has(id))
                {
                    //TODO: update in database taskState to completed
                    DB.updateTaskState(TaskModel,id,'completed');
                    console.log('Task '+id+ '  deleted succefully from map tasks');
                    tasks.delete(id);
                    console.log('successfully executed lambda');
                    console.log(response);
                }
            
          }, (error) => {
                //TODO: update in database taskState to failed 
                DB.updateTaskState(TaskModel,id,'failed');
                console.log('error occured while executing task')
                console.log(error);
          });
    },timeDelay);

    //store task details in database
    const taskInfo = new TaskModel({lambdaURL:url,timeDelayInMs:timeDelay,
                                taskState:'scheduled'});
    taskInfo.save(function(err,result){ 
            if (err){ 
                console.log(err); 
            } 
            else{ 
                // need error handling 
                // console.log(result);
                // console.log(typeof result._id);
                // let id=JSON.stringify(result._id);
                // id=id.substring(1,id.length-1);
                id=result._id.toString();
                console.log("id "+id);
                tasks.set(id,task);
                // console.log(tasks.get(id));
                //update state of taskState to scheduled in db
                //DB.updateTaskState(TaskModel,id,'scheduled');
                res.json({"success":
                "Your task has been succesfully scheduled",
                'id':result._id});
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
    if(tasks.has(taskId))
    {
        clearTimeout(tasks.get(taskId));
        tasks.delete(taskId);
        //TODO: update taskState to cancelled in DB
        DB.updateTaskState(TaskModel,taskId,'cancelled');
        res.json({'success':'Task with id '+ taskId+ ' has been deleted successfully'});
    }
    else{
        res.json({'error':'Task with id '+ taskId+' is either already completed or not scheduled'});
    }
    
    //res.render('cancelTask');
});

app.listen(3000,function(){
    console.log("server started at port 3000");
});