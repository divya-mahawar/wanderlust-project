const express = require("express");
const router = express.Router();

const Booking = require("../models/booking");
const Listing = require("../models/listing");

router.post("/listings/:id/bookings", async (req, res) => {
    try {
        // User login check
        if (!req.user) {
            req.flash("error", "Please login to make a booking.");
            return res.redirect(`/listings/${req.params.id}`);
        }

        const { checkIn, checkOut, guests } = req.body;

        // Listing find karo
        const listing = await Listing.findById(req.params.id);

        if (!listing) {
            req.flash("error", "Listing not found.");
            return res.redirect("/listings");
        }

        // Dates ko Date object mein convert karo
        const startDate = new Date(checkIn);
        const endDate = new Date(checkOut);

        // Date validation
        if (isNaN(startDate) || isNaN(endDate)) {
            req.flash("error", "Please select valid dates.");
            return res.redirect(`/listings/${req.params.id}`);
        }

        // Check-out check-in ke baad hona chahiye
        if (endDate <= startDate) {
            req.flash("error", "Check-out must be after check-in.");
            return res.redirect(`/listings/${req.params.id}`);
        }

        // Guests validation
        if (!guests || Number(guests) < 1) {
            req.flash("error", "At least 1 guest is required.");
            return res.redirect(`/listings/${req.params.id}`);
        }

        // Availability check
        const existingBooking = await Booking.findOne({
            listing: req.params.id,
            status: "confirmed",

            checkIn: { $lt: endDate },
            checkOut: { $gt: startDate }
        });

        if (existingBooking) {
            req.flash(
                "error",
                "This listing is not available for the selected dates."
            );

            return res.redirect(`/listings/${req.params.id}`);
        }

        // Number of nights calculate karo
        const millisecondsPerDay = 1000 * 60 * 60 * 24;

        const nights = Math.ceil(
            (endDate - startDate) / millisecondsPerDay
        );

        // Total price
        const totalPrice = nights * listing.price;

        // Booking create karo
        const booking = new Booking({
            listing: listing._id,
            user: req.user._id,
            checkIn: startDate,
            checkOut: endDate,
            guests: Number(guests),
            totalPrice: totalPrice,
            status: "confirmed"
        });

        await booking.save();

        req.flash(
            "success",
            `Booking confirmed! Total price: ₹${totalPrice.toLocaleString("en-IN")}`
        );

        res.redirect(`/listings/${req.params.id}`);

    } catch (err) {
        console.log("BOOKING ERROR:", err);

        req.flash("error", "Booking failed!");
        res.redirect(`/listings/${req.params.id}`);
    }
});

router.get("/bookings", async (req, res) => {
    try {
        if (!req.user) {
            req.flash("error", "Please login first.");
            return res.redirect("/login");
        }

        const bookings = await Booking.find({
            user: req.user._id
        })
        .populate("listing")
        .sort({ checkIn: -1 });

        res.render("bookings/index.ejs", { bookings });

    } catch (err) {
        console.log("BOOKING HISTORY ERROR:", err);
        req.flash("error", "Unable to load booking history.");
        res.redirect("/listings");
    }
});

router.post("/bookings/:bookingId/cancel", async (req, res) => {
    try {
        if (!req.user) {
            req.flash("error", "Please login first.");
            return res.redirect("/login");
        }

        const booking = await Booking.findById(req.params.bookingId);

        if (!booking) {
            req.flash("error", "Booking not found.");
            return res.redirect("/bookings");
        }

        // Sirf booking karne wala user cancel kar sakta hai
        if (!booking.user.equals(req.user._id)) {
            req.flash("error", "You cannot cancel this booking.");
            return res.redirect("/bookings");
        }

        // Already cancelled
        if (booking.status === "cancelled") {
            req.flash("error", "Booking is already cancelled.");
            return res.redirect("/bookings");
        }

        booking.status = "cancelled";

        await booking.save();

        req.flash("success", "Booking cancelled successfully!");

        res.redirect("/bookings");

    } catch (err) {
        console.log("CANCEL BOOKING ERROR:", err);

        req.flash("error", "Unable to cancel booking.");
        res.redirect("/bookings");
    }
});

router.get("/owner/bookings", async (req, res) => {
    try {
        if (!req.user) {
            req.flash("error", "Please login first.");
            return res.redirect("/login");
        }

        const listings = await Listing.find({
            owner: req.user._id
        });

        const listingIds = listings.map(listing => listing._id);

        const bookings = await Booking.find({
            listing: { $in: listingIds }
        })
        .populate("listing")
        .populate("user")
        .sort({ checkIn: -1 });

        res.render("bookings/owner", { bookings });

    } catch (err) {
        console.log("OWNER BOOKINGS ERROR:", err);

        req.flash("error", "Unable to load bookings.");
        res.redirect("/listings");
    }
});

module.exports = router;