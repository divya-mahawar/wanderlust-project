const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const guestMemorySchema = new Schema(
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

    booking: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true
    },

    image: {
      url: {
        type: String,
        required: true
      },
      filename: {
        type: String,
        required: true
      }
    },

    placeName: {
      type: String,
      required: true
    },

    placeGeometry: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },

      coordinates: {
        type: [Number],
        required: true
      }
    },

    caption: {
      type: String,
      maxlength: 500
    }
  },

  { timestamps: true }
);

const GuestMemory = mongoose.model("GuestMemory", guestMemorySchema);

module.exports = GuestMemory;