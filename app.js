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
app.get("/signuppage", (req, res) => {
  res.render("signuppage");
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
    return res.render("signuppage", {
      message: validationResult.error.details[0].message,
    });
  }
 
  const existingUser = await userCollection.findOne({ email });
  if (existingUser) {
    return res.render("signuppage", {
      message: "An account with this Email already exists."
    });
  }
 
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  const result = await userCollection.insertOne({ username, email, password: hashedPassword });
 
  req.session.authenticated = true;
  req.session.name = username;
  req.session.userId = result.insertedId.toString(); 
  res.redirect("/locationsubmitpage");
});

// Login Page
app.get("/loginpage", (req, res) => {
  res.render("loginpage");
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
    res.render("loginpage", { errorMessage });
    return;
  }
 
  const user = await userCollection.findOne({ email });
  if (!user) {
    res.render("loginpage", {
      errorMessage: "Invalid email/password combination.",
    });
    return;
  }
 
  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    res.render("loginpage", {
      errorMessage: "Invalid email/password combination.",
    });
    return;
  }
 
  req.session.authenticated = true;
  req.session.name = user.username;
  req.session.userId = user._id.toString(); // store _id
  res.redirect("/gardenpage");
});

//--//

// Garden Page
app.get("/gardenpage", async (req, res) => {
  if (!req.session.authenticated) {
    return res.redirect("/loginpage");
  }

  const crops = await cropsCollection.find({}).toArray();

  res.render("gardenpage", { crops, name: req.session.name });
});



//--//

app.get("/profile", async (req, res) => {
  if (!req.session.authenticated) {
    return res.redirect("/loginpage");
  }
 
  const user = await userCollection.findOne(
    { _id: new ObjectId(req.session.userId) },
    { projection: { password: 0 } },
  );
 
  res.render("profilepage", { user });
});
 
app.post("/updateProfile", async (req, res) => {
  if (!req.session.authenticated) return res.redirect("/loginpage");
 
  const { username, email } = req.body;
 
  const schema = Joi.object({ username: usernameSchema, email: emailSchema });
  const validationResult = schema.validate({ username, email });
 
  if (validationResult.error) {
    const user = await userCollection.findOne(
      { _id: new ObjectId(req.session.userId) },
      { projection: { password: 0 } },
    );
    return res.render("profilepage", {
      user,
      errorMessage: validationResult.error.details[0].message,
    });
  }
 
  const existingUser = await userCollection.findOne({ email });
  if (existingUser && existingUser._id.toString() !== req.session.userId) {
    const user = await userCollection.findOne(
      { _id: new ObjectId(req.session.userId) },
      { projection: { password: 0 } },
    );
    return res.render("profilepage", {
      user,
      errorMessage: "An account with this email already exists."
    });
  }
 
  await userCollection.updateOne(
    { _id: new ObjectId(req.session.userId) },
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

// Location Submit Page
app.get("/locationsubmitpage", async (req, res) => {
  if (!req.session.authenticated) return res.redirect("/loginpage");
 
  const zoneCollection = database.db(mongodb_database).collection("zones");
  const zones = await zoneCollection.find({}).toArray();
 
  const cities = zones.flatMap(z =>
    z.areas.split(",").map(a => ({
      name: a.trim(),
      zoneId: z._id,
      zoneName: z.zone
    }))
  ).sort((a, b) => a.name.localeCompare(b.name));
 
  res.render("locationsubmitpage", { cities });
});
 
app.post("/locationSubmit", async (req, res) => {
  const { city } = req.body;
 
  const zoneCollection = database.db(mongodb_database).collection("zones");
  const zones = await zoneCollection.find({}).toArray();
 
  const matchedZone = zones.find(z =>
    z.areas.split(",").map(a => a.trim().toLowerCase()).includes(city)
  );
 
  await userCollection.updateOne(
    { _id: new ObjectId(req.session.userId) },
    { $set: {
        city: city,
        zone: matchedZone ? matchedZone.zone : null
    }}
  );
 
  res.redirect("/gardenpage");
});
// Map Page
app.get("/map", (req, res) => {
  if (!req.session.authenticated) {
    return res.redirect("/loginpage");
  }
  res.render("map");
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
