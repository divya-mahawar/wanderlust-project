const Listing = require("../models/listing");
const GuestMemory = require("../models/guestMemory");
const Trip = require("../models/trip.js");
const fetch = require("node-fetch");
const axios = require("axios");
require("dotenv").config();

module.exports.index = async (req, res) => {

  const { category, search, minPrice, maxPrice } = req.query;

  let filter = {};

  if (category) {
    filter.category = category;
  }

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { location: { $regex: search, $options: "i" } },
      { country: { $regex: search, $options: "i" } }
    ];
  }

  if (minPrice || maxPrice) {

    filter.price = {};

    if (minPrice) {
      filter.price.$gte = Number(minPrice);
    }

    if (maxPrice) {
      filter.price.$lte = Number(maxPrice);
    }
  }

  const allListings = await Listing.find(filter);

  res.render("listings/index.ejs", { allListings });
};

module.exports.renderNewForm = (req, res) => {
  res.render("listings/new.ejs");
};



module.exports.showlistings = async (req, res) => {

  let { id } = req.params;

  const listing = await Listing.findById(id)
    .populate({
      path: "reviews",
      populate: {
        path: "author",
      },
    })
    .populate("owner");

  console.log("listing data", listing);

  if (!listing) {
    req.flash("error", "listing you reqested does not exist");
    return res.redirect("/listings");
  }

  // Guest Travel Memories
  const memories = await GuestMemory.find({
    listing: id
  })
    .populate("user")
    .sort({ createdAt: -1 });

  console.log("guest memories", memories);

  res.render("listings/show.ejs", {
    listing,
    memories,
    geoApiKey: process.env.GEOAPIFY_API_KEY
  });
};


module.exports.creatiListing = async (req, res) => {
  try {
    const location = req.body.listing.location;
    const country = req.body.listing.country;

    let coordinates = [75.7873, 26.9124];
   const searchText = `${location}, ${country}`;

const response = await fetch(
  `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(searchText)}&apiKey=${process.env.GEOAPIFY_API_KEY}&limit=1`
);

    const data = await response.json();

    if (data.features?.length > 0) {
      coordinates = data.features[0].geometry.coordinates;
    }

    const newListing = new Listing(req.body.listing);

    newListing.owner = req.user._id;
    newListing.image = {
      url: req.file.path,
      filename: req.file.filename
    };

    //  THIS WAS MISSING / NOT WORKING BEFORE
    newListing.geometry = {
      type: "Point",
      coordinates: coordinates
    };

    await newListing.save();

    console.log("SAVED WITH GEO:", newListing.geometry);

    req.flash("success", "New listing created");
    res.redirect("/listings");

  } catch (err) {
    console.log(err);
    res.redirect("/listings");
  }
};

module.exports.renderEditForm = async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
   if(!listing){
     req.flash("error", "listing you reqested does not exist");
     return res.redirect("/listings");
  }
  let originalImageUrl = listing.image.url;
  originalImageUrl.replace("/upload", "/upload/h_300, w_250")
  res.render("listings/edit.ejs", { listing, originalImageUrl });
};

 module.exports.updateListing = async (req, res) => {

    const { id } = req.params;

    const listing = await Listing.findByIdAndUpdate(
        id,
        { ...req.body.listing },
        { new: true }
    );

    
    if (req.body.listing.location) {

        try {

            const response = await axios.get(
                "https://api.geoapify.com/v1/geocode/search",
                {
                    params: {
                        text: `${req.body.listing.location}, ${req.body.listing.country}`,
                        apiKey: process.env.GEOAPIFY_API_KEY,
                        limit: 1
                    }
                }
            );

            if (response.data.features?.length > 0) {

                const coordinates =
                    response.data.features[0].geometry.coordinates;

                listing.geometry = {
                    type: "Point",
                    coordinates: coordinates
                };

                await listing.save();

                console.log(
                    "📍 UPDATED COORDINATES:",
                    coordinates
                );
            }

        } catch (error) {

            console.log(
                "❌ GEOCODING ERROR:",
                error.message
            );
        }
    }

    req.flash(
        "success",
        "Listing updated successfully!"
    );

    res.redirect(`/listings/${id}`);
};


module.exports.distroyListing = async (req, res) => {
  let { id } = req.params;
  let deletedListing = await Listing.findByIdAndDelete(id);
  console.log(deletedListing);
   req.flash("success", " listing Deleted");
  res.redirect("/listings");
};
 