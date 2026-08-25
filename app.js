if(process.env.NODE_ENV != "production"){
  require('dotenv').config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require("connect-mongo");

const flash = require("connect-flash");
const {listingSchema, reviewSchema} = require("./schema.js");
const Review = require("./models/review.js");
const listingsRouter = require("./routes/listing.js");
const reviewsRouter = require("./routes/review.js");
const UserRouter = require("./routes/user.js");
const cookieParser = require("cookie-parser");


const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");
const { getDefaultAutoSelectFamily } = require("net");

const dbUrl = process.env.ATLASDB_URL;

const bookingRouter = require("./routes/booking");


main()
  .then(() => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(dbUrl);
}


app.set("view engine", "ejs");
app.engine("ejs", ejsMate);
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(cookieParser());  
app.use(express.static(path.join(__dirname, "/public")));





const store = MongoStore.create({
  mongoUrl: dbUrl,
  secret: process.env.SECRET || "mysupersecret",
  touchAfter: 24 * 3600,
});

store.on("error", (err) => {
  console.log("SESSION STORE ERROR:", err);
});

const sessionOptions = {
  store,
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  }
};


app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.use((req, res, next)=>{

  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  next();
});



app.get("/check", (req, res) => {
  res.send(req.user);
});

app.get("/", (req, res) => {
  res.redirect("/listings");
}); 

app.use("/listings", listingsRouter);
app.use("/listings/:id/reviews", reviewsRouter);
app.use("/", UserRouter)
app.use("/", bookingRouter);


 app.all("*", (req, res, next)=>{
   console.log(" 404 URL =", req.originalUrl);
  console.log("METHOD =", req.method);
  next(new ExpressError(404, "page not found"));
 });
app.use((err, req, res, next) => {
  console.log(" ERROR ");
  console.log(err);
  console.log("MESSAGE:", err.message);
  console.log("STACK:", err.stack);

  res.status(500).send(
    `<pre>${err.stack || err.message}</pre>`
  );
});



const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`server is listening to port ${PORT}`);
});
module.exports = app;