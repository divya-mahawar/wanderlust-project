const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const Listing = require("../models/listing.js");
const {isloggedIn, isOwner, validateListing} = require("../middleware.js");
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

    const R = 6371; // Earth radius in KM

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c =
        2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

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


        // 5 KM radius
        const radius = 20000;


        // Geoapify categories
      const categories =
    "catering.restaurant,catering.cafe";


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

const nearbyPlaces = features
    .map(place => {

        const properties = place.properties;

        let type = "Nearby Place";


        if (
            properties.categories?.some(
                category =>
                    category.startsWith("catering.restaurant")
            )
        ) {
            type = "Restaurant";
        }

        else if (
            properties.categories?.some(
                category =>
                    category.startsWith("catering.cafe")
            )
        ) {
            type = "Cafe";
        }


        const placeLatitude = properties.lat;
        const placeLongitude = properties.lon;


        const distance = calculateDistance(
            latitude,
            longitude,
            placeLatitude,
            placeLongitude
        );
      const bestTime = getBestVisitingTime(type);

        return {

            name:
                properties.name ||
                "Unnamed Place",

            type: type,

            latitude: placeLatitude,

            longitude: placeLongitude,

            distance:
                Number(distance.toFixed(2)),
                  bestTime: bestTime

        };

    });


        res.json({

            listing: {
                latitude,
                longitude
            },

            places: nearbyPlaces

        });


    } catch (err) {

        console.log("========== NEARBY PLACES ERROR ==========");

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
