const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const tripSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        listing: {
            type: Schema.Types.ObjectId,
            ref: "Listing",
            required: true
        },

        days: {
            type: Number,
            required: true
        },

        preferences: [
            {
                type: String
            }
        ],

        dayPlans: [
            {
                day: Number,

                places: [
                    {
                        name: String,
                        type: String,
                        latitude: Number,
                        longitude: Number,
                        distance: Number,
                        bestTime: String,
                        mapsUrl: String
                    }
                ]
            }
        ]
    },
    {
        timestamps: true
    }
);

const Trip = mongoose.model("Trip", tripSchema);

module.exports = Trip;