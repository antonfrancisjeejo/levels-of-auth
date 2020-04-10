
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const md5 = require("md5");

const app = express();

mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser:true,useUnifiedTopology:true});

const userSchema = new mongoose.Schema({
  email: String,
  password:String
});

const User = new mongoose.model("User",userSchema);

app.use(express.static("public"));
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended:true}));

app.get("/home",(req,res)=>{
  res.render("home");
});

app.get("/login",(req,res)=>{
  res.render("login");
});

app.get("/register",(req,res)=>{
  res.render("register");
});

app.post("/register",(req,res)=>{
  const newUser = new User({
    email:req.body.username,
    password:md5(req.body.password)
  });
  newUser.save((err)=>{
    if(!err){
      res.render("secrets");
    }
    else{
      console.log(err);
    }
  });
});

app.post("/login",(req,res)=>{
  const username = req.body.username;
  const password =md5(req.body.password);
  User.findOne({email:username},(err,foundUser)=>{
    if(!err){
      if(foundUser){
        if(foundUser.password === password){
          res.render("secrets");
        }
      }
    }else{
      console.log(err);
    }
  });
});
app.listen(3000,()=>{
  console.log("Server running at 3000");
});
