const express = require("express");
const router = express.Router();

const Trip = require("../models/trip.js");
const { isloggedIn } = require("../middleware.js");
const wrapAsync = require("../utils/wrapAsync.js");


// 📋 My Saved Trips
router.get(
    "/",
    isloggedIn,
    wrapAsync(async (req, res) => {

        const trips = await Trip.find({
            user: req.user._id
        })
        .populate("listing")
        .sort({ createdAt: -1 });

        res.render("trips/index.ejs", {
            trips
        });
    })
);
// View Saved Trip
router.get(
    "/:id",
    isloggedIn,
    wrapAsync(async (req, res) => {

        const trip = await Trip.findOne({
            _id: req.params.id,
            user: req.user._id
        }).populate("listing");

        if (!trip) {
            req.flash("error", "Trip not found");
            return res.redirect("/trips");
        }

        res.render("trips/show.ejs", {
            trip
        });
    })
);

// 🗑️ Delete Saved Trip
router.delete(
    "/:id",
    isloggedIn,
    wrapAsync(async (req, res) => {

        const trip = await Trip.findOneAndDelete({
            _id: req.params.id,
            user: req.user._id
        });

        if (!trip) {
            req.flash("error", "Trip not found");
            return res.redirect("/trips");
        }

        req.flash(
            "success",
            "Trip deleted successfully!"
        );

        res.redirect("/trips");
    })
);



module.exports = router;