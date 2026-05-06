require("dotenv").config();
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const bcrypt = require("bcrypt");
const Joi = require("joi");
const { MongoClient } = require("mongodb");

const app = express();
app.set("view engine", "ejs");
app.set("views", "./app/views");
const port = process.env.PORT || 8000;
const saltRounds = 12;

const mongoUri = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_HOST}/${process.env.MONGODB_DATABASE}`;

const client = new MongoClient(mongoUri);
let userCollection;

async function connectDB() {
    await client.connect();
    const db = client.db(process.env.MONGODB_DATABASE);
    userCollection = db.collection("users");
    console.log("Connected to MongoDB!");
}
connectDB();

app.use(express.urlencoded({ extended: false }));
app.use(express.static("public"));

app.use(session({
    secret: process.env.NODE_SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: mongoUri,
        dbName: process.env.MONGODB_DATABASE,
        collectionName: "sessions",
        ttl: 60 * 60 
    }),
    cookie: { maxAge: 60 * 60 * 1000 } 
}));

app.get("/", (req, res) => {
    if (req.session.authenticated) {
        res.send(`
            <h1>Hello, ${req.session.name}!</h1>
            <a href="/members"><button>Go to Members Area</button></a>
            <br><br>
            <a href="/logout"><button>Logout</button></a>
        `);
    } else {
        res.send(`
            <h1>Home</h1>
            <a href="/signup"><button>Sign up</button></a>
            <br><br>
            <a href="/login"><button>Log in</button></a>
        `);
    }
});

app.get("/signup", (req, res) => {
    res.render("signup");
});

app.post("/signupSubmit", async (req, res) => {
    const { username, email, password } = req.body;

    const schema = Joi.object({
        username: Joi.string().min(5).max(50).required(),
        email: Joi.string().email().required(),
        password: Joi.string()
          .min(8)
          .max(20)
          .pattern(new RegExp('(?=.*[a-z])'))
          .pattern(new RegExp('(?=.*[A-Z])'))
          .pattern(new RegExp('(?=.*[0-9])'))
          .required()
          .messages({
            'string.min': 'Password must be at least 8 characters.',
            'string.pattern.base': 'Password must contain at least one uppercase letter and one number.'
    })
    });

    const validationResult = schema.validate({ username, email, password });
    if (validationResult.error) {
    const message = validationResult.error.details[0].message;

    res.render("signup",{ message });
    return;
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);
    await userCollection.insertOne({ username, email, password: hashedPassword });

    req.session.authenticated = true;
    req.session.name = username;
    res.redirect("/members");
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/loginSubmit", async (req, res) => {
    const { email, password } = req.body;

    const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().max(20).required()
    });

    const validationResult = schema.validate({ email, password });

    if (validationResult.error) {
        const errorMessage = validationResult.error.details[0].message;
        res.render("login", { errorMessage });
        return;
    }

    const user = await userCollection.findOne({ email });
    if (!user) {
        res.render("login", { errorMessage: "Invalid email/password combination." });
        return;
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
        res.render("login", { errorMessage: "Invalid email/password combination." });
        return;
    }

    req.session.authenticated = true;
    req.session.name = user.username;
    res.redirect("/members");
});


app.get("/members", (req, res) => {
    if (!req.session.authenticated) {
        res.redirect("/");
        return;
    }

    res.send(`
        <h1>Hello, ${req.session.name}.</h1>
        <a href="/logout"><button>Sign out</button></a>
    `);
});


app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/");
});

app.get("*splat", (req, res) => {
    res.status(404).send("<h1>Page not found - 404</h1>");
});


app.listen(port, () => {
    console.log(`Server running on port http://localhost:${port}`);
});