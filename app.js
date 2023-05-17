//jshint esversion:6
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const ejs = require('ejs');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const { nextTick } = require('process');

const app = express();

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: 'Our little secret.',
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose.set('strictQuery', true);

mongoose.connect(
  'mongodb://127.0.0.1:27017/userDB',
  {
    useNewUrlParser: true,
  },
  console.log('connected to mongoDB')
);

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  facebookId: String,
  secret: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model('User', userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    cb(null, { id: user.id, username: user.username, name: user.name });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/google/secrets',
      userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo',
    },
    function (accessToken, refreshToken, profile, done) {
      User.findOne({ googleId: profile.id })
        .then((user) => {
          if (!user) {
            user = new User({
              googleId: profile.id,
            });
            user
              .save()
              .then(() => done(null, user))
              .catch((err) => done(err));

            //found user
          } else {
            done(null, user);
          }
        })
        .catch((err) => done(err));
    }
  )
);

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FB_CLIENT_ID,
      clientSecret: process.env.FB_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/facebook/secrets',
    },
    function (accessToken, refreshToken, profile, done) {
      User.findOne({ facebookId: profile.id })
        .then((user) => {
          if (!user) {
            user = new User({
              facebookId: profile.id,
            });
            user
              .save()
              .then(() => done(null, user))
              .catch((err) => done(err));

            //found user
          } else {
            done(null, user);
          }
        })
        .catch((err) => done(err));
    }
  )
);

app.get('/', function (req, res) {
  res.render('home');
});

app.get(
  '/auth/google',
  passport.authenticate('google', { scope: ['profile'] })
);

app.get(
  '/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function (req, res) {
    res.redirect('/secrets');
  }
);

app.get(
  '/auth/facebook',
  passport.authenticate('facebook', { scope: 'public_profile' })
);

app.get(
  '/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function (req, res) {
    res.redirect('/secrets');
  }
);

app.get('/login', function (req, res) {
  res.render('login');
});

app.get('/register', function (req, res) {
  res.render('register');
});

app.get('/secrets', function (req, res) {
  User.find({ secret: { $ne: null } })
    .then(function (foundUsers) {
      if (foundUsers) {
        res.render('secrets', { usersWithSecrets: foundUsers });
      }
    })
    .catch((err) => console.log(err));
});

app.get('/submit', function (req, res) {
  if (req.isAuthenticated()) {
    res.render('submit');
  } else {
    res.render('login');
  }
});

app.post('/submit', function (req, res) {
  const submittedSecret = req.body.secret;

  User.findById(req.user.id)
    .then(function (foundUser) {
      if (foundUser) {
        foundUser.secret = submittedSecret;
        foundUser.save().then(() => res.redirect('secrets'));
      }
    })
    .catch((err) => console.log(err));
});

app.get('/logout', function (req, res) {
  req.logout(function (err) {
    if (err) {
      return nextTick(err);
    }
    res.redirect('/');
  });
});

app.post('/register', function (req, res) {
  User.register(
    { username: req.body.username },
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err);
        res.redirect('/register');
      } else {
        passport.authenticate('local')(req, res, function () {
          res.redirect('/secrets');
        });
      }
    }
  );
});

app.post('/login', function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate('local')(req, res, function () {
        res.redirect('/secrets');
      });
    }
  });
});

app.listen('3000', function () {
  console.log('Connected at port 3000');
});
