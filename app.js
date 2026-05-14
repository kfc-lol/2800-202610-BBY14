require("./utils.js");
require("dotenv").config();

const express = require("express");
const session = require("express-session");
const sharp = require('sharp');
const MongoStore = require("connect-mongo").MongoStore;
const { ObjectId } = require("mongodb");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const { upload } = require('./public/js/cloudinary');

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
const tutorialsCollection = database.db(mongodb_database).collection("tutorials");
const zoneCollection = database.db(mongodb_database).collection("zones");

// Build cities array once at startup
let cities = [];
(async () => {
  const zones = await zoneCollection.find({}).toArray();
  cities = zones
    .flatMap((z) =>
      z.areas.split(",").map((a) => ({
        name: a.trim(),
        zoneId: z._id,
        zoneName: z.zone,
      }))
    )
    .sort((a, b) => a.name.localeCompare(b.name));
})();

// Extracted User Schema for usages in signup and editing.
const usernameSchema = Joi.string().min(5).max(32).required();
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

const optionalPasswordSchema = Joi.string()
  .min(8)
  .max(20)
  .pattern(new RegExp("(?=.*[a-z])"))
  .pattern(new RegExp("(?=.*[A-Z])"))
  .pattern(new RegExp("(?=.*[0-9])"))
  .optional()
  .allow("")
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
  if (req.session.authenticated) return res.redirect("/gardenpage");
  res.render("signuppage");
});

app.post("/signupSubmit", async (req, res) => {
  if (req.session.authenticated) return res.redirect("/gardenpage");
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
      message: "An account with this Email already exists.",
    });
  }

  const featureChecklist = {
    f_savecrop: false,
    f_map: false,
    f_croptutorial: false,
  };
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  const result = await userCollection.insertOne({
    username,
    email,
    password: hashedPassword,
    savedCrops: [],
    featureChecklist,
  });

  req.session.authenticated = true;
  req.session.name = username;
  req.session.userId = result.insertedId.toString();
  res.redirect("/locationsubmitpage");
});

// Login Page
app.get("/loginpage", (req, res) => {
  if (req.session.authenticated) return res.redirect("/gardenpage");
  res.render("loginpage");
});

app.post("/loginSubmit", async (req, res) => {
  if (req.session.authenticated) return res.redirect("/gardenpage");
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
  req.session.userId = user._id.toString();
  res.redirect("/gardenpage");
});

//--//

// Garden Page
app.get("/gardenpage", async (req, res) => {
  if (!req.session.authenticated) {
    return res.redirect("/loginpage");
  }

  const crops = await cropsCollection.find({}).toArray();
  const user = await userCollection.findOne({ _id: new ObjectId(req.session.userId) });
  const savedCrops = user.savedCrops || [];
  const featureChecklist = user.featureChecklist;
  const popup = await tutorialsCollection.findOne({ page: "f_croptutorial" });

  res.render("gardenpage", {
    crops,
    savedCrops,
    name: user.username,
    featureChecklist,
    popup,
  });
});

app.post("/saveCrop", async (req, res) => {
  if (!req.session.authenticated) return res.redirect("/gardenpage");

  const { cropId, action } = req.body;

  if (action === "save") {
    await userCollection.updateOne(
      { _id: new ObjectId(req.session.userId) },
      { $addToSet: { savedCrops: cropId } },
    );
  } else if (action === "unsave") {
    await userCollection.updateOne(
      { _id: new ObjectId(req.session.userId) },
      { $pull: { savedCrops: cropId } },
    );
  }

  res.json({ success: true });
});

// ─── Pollinations Image Proxy ─────────────────────────────────────────────
// Routes crop sprite requests through the server to avoid browser-side 403s
app.get('/crop-image', async (req, res) => {
  const url = req.query.url;

  if (!url || !url.startsWith('https://image.pollinations.ai/')) {
    return res.status(400).send('Invalid image URL');
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.error('Pollinations returned:', response.status);
      return res.status(response.status).send('Image fetch failed');
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Remove white background and output as PNG with transparency
    const { data, info } = await sharp(buffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels = new Uint8Array(data);
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      // Make near-white pixels transparent
      if (r > 220 && g > 220 && b > 220) {
        pixels[i + 3] = 0;
      }
    }

    const pngBuffer = await sharp(Buffer.from(pixels), {
      raw: { width: info.width, height: info.height, channels: 4 }
    }).png().toBuffer();

    res.set('Cache-Control', 'public, max-age=86400');
    res.set('Content-Type', 'image/png');
    res.send(pngBuffer);

  } catch (err) {
    console.error('Crop image proxy error:', err.message);
    res.status(500).send('Proxy error');
  }
});
// ─────────────────────────────────────────────────────────────────────────

app.post("/api/user/skip-feature", async (req, res) => {
  if (!req.session.authenticated) return res.redirect("/gardenpage");

  const { feature } = req.body;

  await userCollection.updateOne(
    { _id: new ObjectId(req.session.userId) },
    { $set: { [`featureChecklist.${feature}`]: true } },
  );

  res.json({ success: true });
});
//--//

app.get("/savedpage", async (req, res) => {
  if (!req.session.authenticated) return res.redirect("/login");

  const user = await userCollection.findOne({ _id: new ObjectId(req.session.userId) });
  if (!user) return res.redirect("/login");

  const savedCrops = user.savedCrops ?? [];

  const savedCropData =
    savedCrops.length > 0
      ? await cropsCollection.find({ id: { $in: savedCrops } }).toArray()
      : [];

  const featureChecklist = user.featureChecklist;
  const popup = await tutorialsCollection.findOne({ page: "f_savedtutorial" });

  res.render("savedpage", {
    user,
    savedCrops,
    savedCropData,
    featureChecklist,
    popup,
  });
});

// Profile Page
app.get("/profile", async (req, res) => {
  if (!req.session.authenticated) return res.redirect("/loginpage");

  const user = await userCollection.findOne(
    { _id: new ObjectId(req.session.userId) },
    { projection: { password: 0 } },
  );

  const flash = req.session.flash || {};
  req.session.flash = null;

  res.render("profilepage", { user, cities, ...flash });
});

app.post("/updateProfile", async (req, res) => {
  if (!req.session.authenticated) return res.redirect("/loginpage");

  const { username, email, city, password } = req.body;

  const schema = Joi.object({
    username: usernameSchema,
    email: emailSchema,
    city: Joi.string().optional().allow(""),
    password: optionalPasswordSchema,
  });
  const validationResult = schema.validate({ username, email, city, password });

  if (validationResult.error) {
    req.session.flash = {
      errorMessage: validationResult.error.details[0].message,
    };
    return res.redirect("/profile");
  }

  const existingUser = await userCollection.findOne({ email });
  if (existingUser && existingUser._id.toString() !== req.session.userId) {
    req.session.flash = {
      errorMessage: "An account with this email already exists.",
    };
    return res.redirect("/profile");
  }

  // Look up zone from in-memory cities array
  const cityData = cities.find(
    (c) => c.name.toLowerCase() === city.toLowerCase()
  );

  const updateFields = {
    username,
    email,
    ...(city && { city, zone: cityData ? cityData.zoneName : null }),
  };

  // Only hash and save password if one was provided
  if (password) {
    updateFields.password = await bcrypt.hash(password, saltRounds);
  }

  await userCollection.updateOne(
    { _id: new ObjectId(req.session.userId) },
    { $set: updateFields },
  );

  req.session.name = username;
  req.session.flash = { message: "Changes were saved successfully" };
  res.redirect("/profile");
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

// Zone Page
app.get("/zonepage", async (req, res) => {
  const zones = await zoneCollection.find({}).toArray();
  res.render("zonepage", { zones });
});

// Location Submit Page
app.get("/locationsubmitpage", async (req, res) => {
  if (!req.session.authenticated) return res.redirect("/loginpage");
  res.render("locationsubmitpage", { cities });
});

app.post("/locationSubmit", async (req, res) => {
  const { city } = req.body;

  const matchedCity = cities.find(
    (c) => c.name.toLowerCase() === city.toLowerCase()
  );

  await userCollection.updateOne(
    { _id: new ObjectId(req.session.userId) },
    {
      $set: {
        city,
        zone: matchedCity ? matchedCity.zoneName : null,
      },
    },
  );

  res.redirect("/gardenpage");
});

// Map Page
app.get("/map", async (req, res) => {
  if (!req.session.authenticated) {
    return res.redirect("/loginpage");
  }

  const user = await userCollection.findOne({ username: req.session.name });
  const featureChecklist = user.featureChecklist;
  const popup = await tutorialsCollection.findOne({ page: "f_map" });

  res.render("map", {
    MAPTILER_KEY: process.env.MAPTILER_KEY,
    featureChecklist,
    popup,
  });
});

app.get("/chatpage", async (req, res) => {
  if (!req.session.authenticated) return res.redirect("/loginpage");

  const user = await userCollection.findOne({ _id: new ObjectId(req.session.userId) });

  res.render("chatpage", {
    zone: user.zone || "unknown",
    city: user.city || "unknown",
  });
});

app.post("/api/chat", async (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ error: "Unauthorized" });

  const { message, history } = req.body;
  const user = await userCollection.findOne({ _id: new ObjectId(req.session.userId) });

  // Check daily limit
  const today = new Date().toISOString().split("T")[0]; // "2026-05-14"
  const lastRequestDate = user.chatLastDate || "";
  const todayRequests = lastRequestDate === today ? (user.chatRequestsToday || 0) : 0;

  if (todayRequests >= 20) {
    return res.json({ reply: "You've reached your daily chat limit of 20 messages. Please try again tomorrow." });
  }

  // Update request count
  await userCollection.updateOne(
    { _id: new ObjectId(req.session.userId) },
    { $set: { chatLastDate: today }, $inc: { chatRequestsToday: lastRequestDate === today ? 1 : 0 } }
  );
  // Reset count if new day
  if (lastRequestDate !== today) {
    await userCollection.updateOne(
      { _id: new ObjectId(req.session.userId) },
      { $set: { chatRequestsToday: 1, chatLastDate: today } }
    );
  }

  const systemPrompt = `You are a helpful gardening assistant for GroCrop, a community gardening app. 
The user is located in ${user.city || "an unknown city"}, in the ${user.zone || "unknown"} gardening zone of Metro Vancouver, BC, Canada.
Give advice relevant to their zone and local climate where possible. 
Keep responses concise and practical.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [
            ...history.map(m => ({
              role: m.role,
              parts: [{ text: m.text }]
            })),
            { role: "user", parts: [{ text: message }] }
          ]
        })
      }
    );

    const data = await response.json();
    console.log("Gemini raw response:", JSON.stringify(data, null, 2));

    if (data.error) {
      if (data.error.code === 429) {
        return res.json({ reply: "I'm a little busy right now, please try again later." });
      }
      return res.json({ reply: "Sorry, something went wrong. Please try again." });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't get a response.";
    res.json({ reply });

  } catch (err) {
    console.error("Gemini error:", err);
    res.status(500).json({ error: "Failed to get response." });
  }
});

//Add Crop Page
app.get('/addcroppage', (req, res) => {
  if (!req.session.authenticated) return res.redirect('/loginpage');
  res.render('addcroppage');
});

//Handling form submission for user-addded crops
app.post('/addcroppage', upload.single('image'), async (req, res) => {
  if (!req.session.authenticated) return res.redirect('/loginpage');

  console.log('req.file:', req.file);
  console.log('req.body:', req.body);

  try {
    const { name, category, zones } = req.body;

    const information = [
      { title: "Planting",     content: req.body.info_content_0 },
      { title: "Watering",     content: req.body.info_content_1 },
      { title: "Sunlight",     content: req.body.info_content_2 },
      { title: "Plant Timing", content: req.body.info_content_3 },
    ];

    const last = await cropsCollection.find({}).sort({ id: -1 }).limit(1).toArray();
    const lastNum = last.length > 0 ? parseInt(last[0].id) : 0;
    const newId = String(lastNum + 1).padStart(3, '0');

    await cropsCollection.insertOne({
      id: newId,
      name,
      category,
      zones,
      image: req.file.secure_url,
      information,
    });

    res.redirect('/gardenpage');

  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send(err.message);
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