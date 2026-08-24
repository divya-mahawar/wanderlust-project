const mongoose = require("mongoose");
const review = require("./review");
const Schema = mongoose.Schema;
const Review = require("./review.js")

const listingSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  image:{
    url: String,
    filename: String,
  },

  price:{
    type: Number,
  },
  location: String,
  country: String,

  geometry: {
  type: {
    type: String,
    enum: ["Point"],
    default: "Point"
  },
  coordinates: {
    type: [Number],
    default: [75.7873, 26.9124],
    required: true
  }
},
  reviews: [
    {
      type: Schema.Types.ObjectId,
      ref: "Review",
    }
  ],

  owner: {
    type: Schema.Types.ObjectId,
    ref: "User"
  },
 category: {
  type: String,
  enum: [
    "Trending",
    "Rooms",
    "Iconic Cities",
    "Mountains",
    "Castles",
    "Amazing Pools",
    "Camping",
    "Farms",
    "Wildlife"
  ],
  required: true
},
})

listingSchema.post("findOneAndDelete", async(listing) =>{
  if(listing){
      await Review.deleteMany({_id : {$in: listing.reviews}});
  }
 
});
const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;
