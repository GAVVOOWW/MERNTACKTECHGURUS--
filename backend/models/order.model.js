import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['On Process', 'Ready for Pickup', 'Delivered', 'Picked Up', 'Requesting for Refund', 'Refunded', 'completed'],
    default: 'On Process'
  },
  transactionId: String,
  transactionHash: { type: String, unique: true, sparse: true },
  amount: Number,
  items: [
    {
      item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
      quantity: { type: Number, default: 1 },
      price: Number,
      customH: { type: Number },
      customW: { type: Number },
      customL: { type: Number },
      legsFrameMaterial: { type: String },
      tabletopMaterial: { type: String },
    }
  ],
  address: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  shippingAddress: {
    fullName: String,
    addressLine1: String,
    city: String,
    state: String,
    postalCode: String,
    phone: String,
  },
  deliveryProof: {
    type: String, // URL/path to the delivery proof image
    default: null
  },
  deliveryDate: {
    type: Date,
    default: null
  },
  deliveryMethod: {
    type: String,
    enum: ['shipping', 'pickup'],
    required: true,
    default: 'shipping'
  }
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);

export default Order;   