const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const Listing = require("../models/listing.js");
const GuestMemory = require("../models/guestMemory.js");
const Trip = require("../models/trip.js");
const {isloggedIn, isOwner, validateListing,  isBookingUser} = require("../middleware.js");
const listingController = require("../controllers/listings.js");
const multer  = require('multer');

const{storage}  = require("../cloudConfig.js")
const upload = multer({storage });
const axios = require("axios");



router
  .route("/")
  .get(wrapAsync(listingController.index))
  .post(
    isloggedIn,
    upload.single("listing[image]"),
    validateListing,
    wrapAsync(listingController.creatiListing)
  );


//New Route
router.get("/new", isloggedIn, listingController.renderNewForm);

function calculateDistance(lat1, lon1, lat2, lon2) {

    const R = 6371;

    const dLat =
        (lat2 - lat1) * Math.PI / 180;

    const dLon =
        (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) *
        Math.sin(dLat / 2) +

        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *

        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    return R * c;
}


function getBestVisitingTime(type) {

    if (type === "Restaurant") {
        return "12 PM - 3 PM / 7 PM - 10 PM";
    }

    if (type === "Cafe") {
        return "8 AM - 11 AM / 4 PM - 8 PM";
    }

    if (type === "Tourist Attraction") {
        return "7 AM - 11 AM / 4 PM - 7 PM";
    }

    if (type === "Temple / Worship") {
        return "6 AM - 10 AM / 5 PM - 8 PM";
    }

    if (type === "Shopping") {
        return "10 AM - 1 PM / 4 PM - 9 PM";
    }

    return "10 AM - 6 PM";
}




router.get("/:id/nearby", async (req, res) => {

    try {

        console.log("🔥 NEARBY ROUTE HIT");
        console.log("ID =", req.params.id);

        const listing = await Listing.findById(req.params.id);

        if (!listing || !listing.geometry) {
            return res.status(404).json({
                error: "Listing or location not found"
            });
        }

        const [longitude, latitude] =
            listing.geometry.coordinates;
         

             // USER PREFERENCES

        let preferences = req.query.preferences
            ? req.query.preferences.split(",")
            : [];


        console.log("USER PREFERENCES =", preferences);

        // 5 KM radius
        const radius = 10000;


        // Geoapify categories
     const categories =
    "catering.restaurant," +
    "catering.cafe," +
    "tourism.sights," +
    "tourism.attraction," +
    "religion.place_of_worship," +
    "commercial.supermarket";

     const url =
    "https://api.geoapify.com/v2/places" +
    `?categories=${categories}` +
    `&filter=circle:${longitude},${latitude},${radius}` +
    `&limit=30` +
    `&apiKey=${process.env.GEOAPIFY_API_KEY}`;  

        console.log("GEOAPIFY REQUEST SENT");


        const response = await axios.get(url);


        const features = response.data.features || [];


        console.log(
            "TOTAL PLACES FOUND =",
            features.length
        );


const nearbyPlaces = (
    await Promise.all(

        features.map(async place => {

            const properties = place.properties || {};
             
            let type = "Nearby Place";


            // RESTAURANT
            if (
                properties.categories?.some(category =>
                    category.startsWith("catering.restaurant")
                )
            ) {
                type = "Restaurant";
            }


            // CAFE
            else if (
                properties.categories?.some(category =>
                    category.startsWith("catering.cafe")
                )
            ) {
                type = "Cafe";
            }


            // TOURIST ATTRACTION
            else if (
                properties.categories?.some(category =>
                    category.startsWith("tourism")
                )
            ) {
                type = "Tourist Attraction";
            }


            // TEMPLE / WORSHIP
            else if (
                properties.categories?.some(category =>
                    category.startsWith("religion")
                )
            ) {
                type = "Temple / Worship";
            }


            // SHOPPING
            else if (
                properties.categories?.some(category =>
                    category.startsWith("commercial")
                )
            ) {
                type = "Shopping";
            }


            const placeLatitude = properties.lat;
            const placeLongitude = properties.lon;


            if (
                placeLatitude === undefined ||
                placeLongitude === undefined
            ) {
                return null;
            }


            const distance = calculateDistance(
                latitude,
                longitude,
                placeLatitude,
                placeLongitude
            );



            return {

                name:
                    properties.name ||
                    "Unnamed Place",

                type: type,

                latitude:
                    placeLatitude,

                longitude:
                    placeLongitude,

                distance:
                    Number(distance.toFixed(2)),

                bestTime:
                    getBestVisitingTime(type),

                 mapsUrl:
    `https://www.google.com/maps/search/?api=1&query=${placeLatitude},${placeLongitude}`,

     

            };

        })

    )
).filter(place => place !== null);

    // User Prefrence

if (preferences.length > 0) {

    nearbyPlaces.sort((a, b) => {

        const aMatch =
            preferences.includes(a.type);

        const bMatch =
            preferences.includes(b.type);


        if (aMatch && !bMatch) {
            return -1;
        }

        if (!aMatch && bMatch) {
            return 1;
        }

        return a.distance - b.distance;

    });

}

        res.json({

            listing: {
                latitude,
                longitude
            },

            places: nearbyPlaces

        });


    } catch (err) {

        console.log("NEARBY PLACES ERROR");

        console.log("MESSAGE:", err.message);

        console.log(
            "API ERROR:",
            err.response?.data
        );


        res.status(500).json({

            error: "Unable to find nearby places"

        });

    }

});

// GET memory form
router.get(
  "/:id/memories/new",
  isloggedIn,
  wrapAsync(async (req, res) => {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      req.flash("error", "Listing not found");
      return res.redirect("/listings");
    }

    res.render("listings/memory.ejs", { listing });
  })
);
router.post(
  "/:id/memories",
  isloggedIn,
  isBookingUser,
  upload.single("image"),
  wrapAsync(async (req, res) => {

    console.log("🔥 MEMORY POST ROUTE HIT");

    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      req.flash("error", "Listing not found");
      return res.redirect("/listings");
    }

    console.log("LISTING FOUND:", listing._id);

    if (!req.file) {
      console.log("❌ FILE NOT FOUND");

      req.flash("error", "Please upload a travel photo");
      return res.redirect(`/listings/${req.params.id}`);
    }

    const { placeName, caption } = req.body;

    console.log("PLACE:", placeName);
    console.log("CAPTION:", caption);
    console.log("FILE:", req.file);


   let placeCoordinates = listing.geometry.coordinates;

try {

  const listingCoords = listing.geometry.coordinates;

  const response = await axios.get(
    "https://api.geoapify.com/v1/geocode/search",
    {
      params: {
        text: placeName,
        apiKey: process.env.GEOAPIFY_API_KEY,

        // Search near the listing
        bias: `proximity:${listingCoords[0]},${listingCoords[1]}`,

        // Take best result
        limit: 1
      }
    }
  );

  if (response.data.features?.length > 0) {

    placeCoordinates =
      response.data.features[0].geometry.coordinates;

  }

} catch (err) {

  console.log(
    "Geoapify error:",
    err.message
  );
} 
  


    const memory = new GuestMemory({

      user: req.user._id,

      listing: listing._id,

      booking: req.booking._id,

      image: {
        url: req.file.path,
        filename: req.file.filename
      },

      placeName,

      placeGeometry: {
        type: "Point",
        coordinates: placeCoordinates
      },

      caption

    });


    await memory.save();

    console.log("✅ MEMORY SAVED:", memory);


    req.flash(
      "success",
      "Your travel memory has been shared successfully!"
    );

    res.redirect(`/listings/${listing._id}`);

  })
);

router.get(
  "/:id/trip-planner",
  wrapAsync(async (req, res) => {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      req.flash("error", "Listing not found");
      return res.redirect("/listings");
    }

    res.render("listings/trip-planner.ejs", {
      listing
    });
  })
);

router.post(
    "/:id/trip-planner/save",
    isloggedIn,
    wrapAsync(async (req, res) => {

        const listing = await Listing.findById(req.params.id);

        if (!listing) {
            return res.status(404).json({
                success: false,
                error: "Listing not found"
            });
        }

        const trip = new Trip({
            user: req.user._id,
            listing: listing._id,
            days: req.body.days,
            preferences: req.body.preferences || [],
            dayPlans: req.body.dayPlans || []
        });

        await trip.save();

        res.json({
            success: true,
            message: "Trip saved successfully!"
        });
    })
);

router
.route("/:id")
.get( wrapAsync(listingController.showlistings))
.put(
  isloggedIn,
    isOwner,
     upload.single('listing[image]'),
  validateListing,

   wrapAsync(listingController.updateListing ))
.delete( isloggedIn,  isOwner, wrapAsync(listingController.distroyListing ));


//Edit Route
router.get("/:id/edit", isloggedIn, isOwner, wrapAsync(listingController.renderEditForm ));


 
module.exports = router;
