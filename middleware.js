const Listing = require("./models/listing");
const Review= require("./models/review");
const ExpressError = require("./utils/ExpressError.js");
const {listingSchema, reviewSchema} = require("./schema.js");


module.exports.isloggedIn = (req, res, next)=>{
    console.log(req.user);
    if(!req.isAuthenticated()){
        req.session.redirectUrl = req.originalUrl;
    req.flash("error", "you must be logged in to creat listing");
    return res.redirect("/login");
  }

  next();
};

module.exports.saveRedirectUrl = (req, res, next) => {
    if (req.session && req.session.redirectUrl) {
        res.locals.redirectUrl = req.session.redirectUrl;
    }

    next();
};

module.exports.isOwner = async (req, res, next) => {
    let { id } = req.params;
    let listing = await Listing.findById(id);

    if (!listing) {
        req.flash("error", "Listing not found");
        return res.redirect("/listings");
    }

    if (!res.locals.currUser || !listing.owner.equals(res.locals.currUser._id)) {
        req.flash("error", "You are not the owner of this listing");
        return res.redirect(`/listings/${id}`);
    }

    next();
};

module.exports.validateListing = (req, res, next) => {
  console.log("🔥 ROUTE HIT");

  console.log("BODY:", req.body);
  console.log("FILE:", req.file);

  if (!req.body) {
    console.log("❌ req.body is undefined");
  }

  let { error } = listingSchema.validate(req.body);

  if (error) {
    console.log("VALIDATION ERROR:", error.details);
    let errMsg = error.details.map(el => el.message).join(",");
    throw new ExpressError(400, errMsg);
  }

  next();
};

module.exports.validateReview = (req, res, next)=>{
   let { error } =  reviewSchema.validate(req.body);
 if(error){
  let errMsg = error.details.map((el) => el.message).join(",");
  throw new ExpressError(400, errMsg);
 }
 else{
  next();
 }
};

module.exports.isReviewAuthor = async(req, res, next)=>{
    let {id, reviewId} = req.params;
    let review =  await Review.findById(reviewId);
     if(!review.author.equals(res.locals.currUser._id)){
      req.flash("error", "you are not the author of this review ");
      return res.redirect(`/listings/${id}`);
     }

     next();
};

module.exports.saveRedirectUrl = (req, res , next)=>{
    if(req.session.redirectUrl){
        res.locals.redirectUrl = req.session.redirectUrl;
    }

    next();
}


module.exports.isOwner = async(req, res, next)=>{
    let {id} = req.params;
    let listing =  await Listing.findById(id);
     if(!listing.owner.equals(res.locals.currUser._id)){
      req.flash("error", "you are not the owner of this listing ");
      return res.redirect(`/listings/${id}`);
     }

     next();
};

module.exports.validateListing = (req, res, next) => {
  console.log("🔥 ROUTE HIT");

  console.log("BODY:", req.body);
  console.log("FILE:", req.file);

  if (!req.body) {
    console.log("❌ req.body is undefined");
  }

  let { error } = listingSchema.validate(req.body);

  if (error) {
    console.log("VALIDATION ERROR:", error.details);
    let errMsg = error.details.map(el => el.message).join(",");
    throw new ExpressError(400, errMsg);
  }

  next();
};



module.exports.isReviewAuthor = async(req, res, next)=>{
    let {id, reviewId} = req.params;
    let review =  await Review.findById(reviewId);
     if(!review.author.equals(res.locals.currUser._id)){
      req.flash("error", "you are not the author of this review ");
      return res.redirect(`/listings/${id}`);
     }

     next();
};

const Booking = require("./models/booking");

module.exports.isBookingUser = async (req, res, next) => {
    try {
        const { id } = req.params;

        const booking = await Booking.findOne({
            listing: id,
            user: req.user._id,
            status: "confirmed"
        });

        if (!booking) {
            req.flash(
                "error",
                "You must have a confirmed booking for this listing to share a travel memory."
            );

            return res.redirect(`/listings/${id}`);
        }

        req.booking = booking;

        next();

    } catch (err) {
        next(err);
    }
};