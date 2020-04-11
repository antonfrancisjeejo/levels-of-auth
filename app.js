require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const session = require('express-session');
//Passport is package used for authentication
const passport = require('passport');
//This package is used to salt,hash and store the password in the database
const passportLocalMongoose = require('passport-local-mongoose');
//This is used for google OAuth signin
const GoogleStrategy = require('passport-google-oauth20').Strategy;
//This is used to search and create a google user if doesn't exist
const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.use(express.static("public"));
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended:true}));

//Session is created here
app.use(session({
  secret:"This is my secret key",
  resave: false,
  saveUninitialized: false
}));

//Passport is initialized
app.use(passport.initialize());
//Passport initializes the session
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser:true,useUnifiedTopology:true,useCreateIndex:true});

//Database schema is created here
const userSchema = new mongoose.Schema({
  email: String,
  password:String,
  googleId:String,
  secret:String
});

//Plugins are added to the database schema before we create the model
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

//Database model is created with the given schema
const User = new mongoose.model("User",userSchema);

//Here we are creating the strategy for both local and google
passport.use(User.createStrategy());

//serializeUser is used to hold the session to the browser until we leaves the browser
passport.serializeUser(function(user, done) {
  done(null, user.id);
});
//deserializeUser deletes the created session
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});
//Passport uses the google strategy with needed secret info
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/",(req,res)=>{
  res.render("home");
});
//Get method for allowing a popup to let google to signin you
app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);
//callbackURL get method
app.get("/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });

app.get("/login",(req,res)=>{
  res.render("login");
});

app.get("/register",(req,res)=>{
  res.render("register");
});

//isAuthenticated is used to verify whether is user login by seeing the session
app.get("/secrets",(req,res)=>{
  if(req.isAuthenticated()){
    User.find({"secret":{$ne:null}},(err,foundUsers)=>{
      if(err){
        console.log(err);
      }else{
        if(foundUsers){
          res.render("secrets",{usersWithSecrets:foundUsers});
        }
      }
    });
  }
  else{
    res.redirect("/login");
  }
});

app.get("/logout",(req,res)=>{
  req.logout();
  res.redirect("/");
});

app.get("/submit",(req,res)=>{
  if(req.isAuthenticated()){
    res.render("submit");
  }
  else{
    res.redirect("/login");
  }
});

app.post("/register",(req,res)=>{
//Passport's register method is used to store the email and then salt and hash the passwod and store them in the database
User.register({ username:req.body.username },req.body.password,(err,user)=>{
  if(err){
    console.log(err);
    res.redirect("/register");
  }else{
    passport.authenticate("local")(req,res,()=>{
      res.redirect("/secrets");
    });
  }
})
});

app.post("/login",(req,res)=>{

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user,(err)=>{
    if(err){
      console.log(err);
    }
    else{
      passport.authenticate("local")(req,res,()=>{
        res.redirect("/secrets");
      });
    }
  });
});

app.post("/submit",(req,res)=>{
  const submittedSecret = req.body.secret;
  console.log(req.user);

  User.findById(req.user.id,(err,foundUser)=>{
    if(err){
      console.log(err);
    }else{
      if(foundUser){
        foundUser.secret = submittedSecret;
        foundUser.save(()=>{
          res.redirect("/secrets");
        });
      }
    }
  });
});

app.listen(3000,()=>{
  console.log("Server running at 3000");
});
