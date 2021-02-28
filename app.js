const express = require("express");
const bodyParser = require("body-parser");
const _ = require("lodash");
const mongoose = require('mongoose');


const app = express();
app.set('view engine','ejs');
app.set('views', __dirname + '/views');

app.use(express.static("public"));

app.get("/",function(req,res){
    console.log("Requesting home page")
    res.render("home");
});

app.listen(3000,function(){
    console.log("server started at port 3000");
});