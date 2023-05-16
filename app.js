//jshint esversion:6
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const md5 = require('md5');
const ejs = require('ejs');

const app = express();

console.log(process.env.API_KEY);

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect('mongodb://127.0.0.1/userDB', {
  useNewUrlParser: true,
});

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});

const User = new mongoose.model('USer', userSchema);

app.get('/', function (req, res) {
  res.render('home');
});

app.get('/login', function (req, res) {
  res.render('login');
});

app.post('/login', function (req, res) {
  const username = req.body.username;
  const password = md5(req.body.password);

  User.findOne({ email: username })
    .then(function (foundUser) {
      if (foundUser.password === password) {
        res.render('secrets');
      }
    })
    .catch((err) => console.log(err));
});

app.get('/register', function (req, res) {
  res.render('register');
});

app.post('/register', function (req, res) {
  const newUser = new User({
    email: req.body.username,
    password: md5(req.body.password),
  });

  newUser
    .save()
    .then(function () {
      res.render('secrets');
    })
    .catch((err) => console.log(err));
});

app.listen(3000, function () {
  console.log(`Server started on port`);
});
