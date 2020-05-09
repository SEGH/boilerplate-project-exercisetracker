'use strict';
//Require and mount dependencies.
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const shortid = require('shortid');
const cors = require('cors');
const mongo = require('mongodb');
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true, useUnifiedTopology: true});
app.use(cors());
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

//Serve assets and html.
app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});
/*
// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})
*/
// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

//Check connections.
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
console.log(mongoose.connection.readyState);

//Test API endpoint...
app.get("/api/hello", function (req, res) {
  res.json({"message": "hello"});
});

//Schemas
const Schema = mongoose.Schema;
const userSchema = new Schema({
  "username": {type: String, required: true},
  "_id": {type: String, required: true},
  "exercises": []
});
const User = mongoose.model('User', userSchema);

//I can create a user by posting form data username to /api/exercise/new-user and returned will be an object with username and _id.
app.post("/api/exercise/new-user", (req, res) => {
  let userName = req.body.username;
  let shortId = shortid.generate();
  User.findOne({"username": userName}, (err, data) => {
    if (data == null) {
      createAndSave();
    } else if (err) {
      return err;
    } else {
      return res.json("username taken");
    }
  })
  const createAndSave = function() {
    const docInst = new User({"username": userName, "_id": shortId});
    docInst.save((err, data) => {
      if (err) {
        return res.json(err);
      } else {
        return res.json(data);
      }
    });
  }
});

//I can get an array of all users by getting api/exercise/users with the same info as when creating a user.
app.get("/api/exercise/users", (req, res) => {
  User.find({}, (err, data) => {
  if (err) {
    return res.json(err);
  } else {
    return res.json(data);
  }
});
});
//I can add an exercise to any user by posting form data userId(_id), description, duration, and optionally date to /api/exercise/add. If no date supplied it will use current date. Returned will be the user object with also with the exercise fields added.
app.post("/api/exercise/add", (req, res) => {
  let userId = req.body.userId;
  let description = req.body.description;
  let duration = req.body.duration;
  let date;
  if (req.body.date == "") {
      let n = new Date();
      let y = n.toJSON();
      date = y.slice(0,10);
    } else {
      let d = req.body.date;
      let newd = d.toJSON();
      date = newd.slice(0, 10);
  };
  User.findById(userId, function (err, doc) {
    if (err) {
      res.json(err);
    } else {
      doc.exercises.push({"description": description, "duration": duration, "date": date});
      doc.save((err, data) => {
        if (err) {
          res.json(err);
        } else {
          res.json(doc);
        }
      });
    }
  });
});
//I can retrieve a full exercise log of any user by getting /api/exercise/log with a parameter of userId(_id). Return will be the user object with added array log and count (total exercise count).
app.get("/api/exercise/log", (req, res) => {
  const user = req.query.userId;
  const from = req.query.from;
  const to = req.query.to;
  const limit = Number(req.query.limit);
  User.find({"_id": user}, (err, data) => {
    if (err) {
      res.json(err);
    } else {
      let exercises = data[0]["exercises"];
      let result;
      if (from != null && to != null) {
        result = exercises.filter((x) => {
        return x["date"] >= from && x["date"] <= to;
        });
      } else if (from != null && to == null) {
        let n = new Date();
        let y = n.toJSON();
        let today = y.slice(0, 10);
        result = exercises.filter((x) => {
          return x["date"] >= from && x["date"] <= today;
        });
      } else if (from == null) {
        let count = exercises.length;
        result = exercises;
      }
      if (limit) {
        let limited = result.slice(0, limit);
        res.json(limited);
      } else {
        res.json(result);
      }  
    }
  });
})
//I can retrieve part of the log of any user by also passing along optional parameters of from & to or limit. (Date format yyyy-mm-dd, limit = int) 
/*
User.deleteMany({"username": "fcc_test_15890450443"}, (err) => {
if (err) return err;
})
*/