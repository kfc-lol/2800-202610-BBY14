require("./utils.js");
require("dotenv").config();

const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo").MongoStore;
const bcrypt = require("bcrypt");
const saltRounds = 10;

const Joi = require("joi");

const app = express();
const port = process.env.PORT || 3000;

// Secret Information
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const node_session_secret = process.env.NODE_SESSION_SECRET;
//

const { database } = include("public/js/databaseConnection");
const userCollection = database.db(mongodb_database).collection("users");
/*
 - for creating a user 
await userCollection.insertOne({
  username: username,
  password: hashedPassword,
});
*/

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Middleware to serve static files from the 'public' directory
app.use(express.static("public"));

app.set("view engine", "ejs");
app.set("views", __dirname + "/app/views");

var mongoStore = MongoStore.create({
  mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${mongodb_database}`,
  crypto: {
    secret: mongodb_session_secret,
  },
});

app.use(
  session({
    secret: node_session_secret,
    store: mongoStore,
    saveUninitialized: false,
    resave: true,
  }),
);

//---------//

// Index - New User Page
app.get("/", (req, res) => {
  res.render("landingpage");
  /* if user is authenticated, redirect to gardenpage */
});

// Signup Page
app.get("/signup", (req, res) => {
  res.render("signup");
});

// Login Page
app.get("/login", (req, res) => {
  res.render("login");
});

// Landing Page
app.get("/gardenpage", (req, res) => {
  res.render("gardenpage");
});

//---------//

// Error 404 Page
app.use((req, res) => {
  res.status(404);
  res.send("Page not found - 404");
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
