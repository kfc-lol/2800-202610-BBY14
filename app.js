require("./utils.js");
require("dotenv").config();

const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo").MongoStore;
const { ObjectId } = require("mongodb");
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
const cropsCollection = database.db(mongodb_database).collection("crops");
/*
 - for creating a user 
await userCollection.insertOne({
  username: username,
  password: hashedPassword,
});
*/

// Extracted User Schema for usages in signup and editing.
const usernameSchema = Joi.string().min(5).max(50).required();
const emailSchema = Joi.string().email().required();
const passwordSchema = Joi.string()
  .min(8)
  .max(20)
  .pattern(new RegExp("(?=.*[a-z])"))
  .pattern(new RegExp("(?=.*[A-Z])"))
  .pattern(new RegExp("(?=.*[0-9])"))
  .required()
  .messages({
    "string.min": "Password must be at least 8 characters.",
    "string.pattern.base":
      "Password must contain at least one uppercase letter and one number.",
  });

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
  if (req.session.authenticated) {
    res.redirect("/gardenpage");
    return;
  }
  res.render("landingpage");
});

// Signup Page
app.get("/signup", (req, res) => {
  res.render("signup");
});

app.post("/signupSubmit", async (req, res) => {
  const { username, email, password } = req.body;

  const schema = Joi.object({
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
  });
  const validationResult = schema.validate({ username, email, password });

  if (validationResult.error) {
    return res.render("signup", {
      message: validationResult.error.details[0].message,
    });
  }

  const hashedPassword = await bcrypt.hash(password, saltRounds);
  await userCollection.insertOne({ username, email, password: hashedPassword });

  req.session.authenticated = true;
  req.session.name = username;
  res.redirect("/gardenpage");
});

// Login Page
app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/loginSubmit", async (req, res) => {
  const { email, password } = req.body;

  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().max(20).required(),
  });

  const validationResult = schema.validate({ email, password });

  if (validationResult.error) {
    const errorMessage = validationResult.error.details[0].message;
    res.render("login", { errorMessage });
    return;
  }

  const user = await userCollection.findOne({ email });
  if (!user) {
    res.render("login", {
      errorMessage: "Invalid email/password combination.",
    });
    return;
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    res.render("login", {
      errorMessage: "Invalid email/password combination.",
    });
    return;
  }

  req.session.authenticated = true;
  req.session.name = user.username;
  res.redirect("/gardenpage");
});

//--//

// Garden Page
app.get("/gardenpage", async (req, res) => {
  if (!req.session.authenticated) {
    return res.redirect("/login");
  }
  
  const crops = await cropsCollection.find({}).toArray();

  res.render("gardenpage", { crops, name: req.session.name });
});



//--//

app.get("/profile", async (req, res) => {
  if (!req.session.authenticated) {
    return res.redirect("/login");
  }

  const user = await userCollection.findOne(
    { username: req.session.name },
    { projection: { password: 0 } },
  );

  res.render("profilepage", { user });
});

app.post("/updateProfile", async (req, res) => {
  if (!req.session.authenticated) return res.redirect("/login");

  const { username, email } = req.body;

  const schema = Joi.object({ username: usernameSchema, email: emailSchema });
  const validationResult = schema.validate({ username, email });

  if (validationResult.error) {
    const user = await userCollection.findOne(
      { username: req.session.name },
      { projection: { password: 0 } },
    );
    return res.render("profilepage", {
      user,
      errorMessage: validationResult.error.details[0].message,
    });
  }

  await userCollection.updateOne(
    { username: req.session.name },
    { $set: { username, email } },
  );

  req.session.name = username;
  res.redirect("/profile");
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

//Zone Page
app.get("/zonepage", async (req, res) => {
  const zoneCollection = database.db(mongodb_database).collection("zones");
  const zones = await zoneCollection.find({}).toArray();
  res.render('zonepage', { zones });
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
