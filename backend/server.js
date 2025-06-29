import express from "express";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import cors from "cors";
import jwt from "jsonwebtoken";
import axios from "axios";
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from "mongoose";
import bodyParser from 'body-parser';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { calculateCustomPrice } from "./utils/priceCalculator.js";





// Model Imports
import User from "./models/user.model.js";
import Cart from "./models/cart.model.js";
import Item from "./models/item.model.js";
import Order from "./models/order.model.js";
import Chat from "./models/chat.model.js";
import Category from "./models/category.model.js";
import FurnitureType from "./models/furnitureType.model.js";
import Log from "./models/log.model.js";

// Middleware & Config Imports
import { connectDB } from "./config/db.js";
import { authenticateToken, authorizeRoles } from "./middleware/auth.js";

// Utils Imports
import LoggerService from "./utils/logger.js";

// =================================================================
// INITIALIZATION
// =================================================================
const app = express();
const server = createServer(app);

dotenv.config(`./.env`);
connectDB();

import { pipeline } from '@xenova/transformers';
import { parseQueryWithGroq } from './utils/groqParser.js';










const frontendURL = process.env.FRONTEND_URL;


const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Configure Multer for in-memory file storage with optimized settings
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 1 // Only 1 file at a time
    },
    fileFilter: (req, file, cb) => {
        // Only allow image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Global error handler for multer
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large. Please upload an image smaller than 10MB.'
            });
        }
        return res.status(400).json({
            success: false,
            message: 'File upload error: ' + err.message
        });
    } else if (err) {
        return res.status(400).json({
            success: false,
            message: err.message || 'File upload error'
        });
    }
    next();
};

// Configure Cloudinary using the credentials from .env
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// =================================================================
// MIDDLEWARE
// =================================================================


const allowedOrigins = [
    `https://merntacktechgurus-1.onrender.com`,
    process.env.FRONTEND_URL, // Your live site on Render
    'http://localhost:5173',  // Your local development environment
];

const corsOptions = {

    origin: function (origin, callback) {
        // Allow requests with no origin (like Postman or server-to-server requests)
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('This origin is not allowed by CORS'));
        }
    }
};

// Use the new options
app.use(cors(corsOptions));

app.use(express.json());
// --- START OF CHAT API ROUTES ---


// Get all chats for the logged-in admin
app.get('/api/chats', authenticateToken, authorizeRoles("admin"), async (req, res) => {
    try {
        const chats = await Chat.find({})
            .populate('participants', 'name email role')
            // THIS IS THE CRITICAL FIX: Deeply populate the sender within the messages array
            .populate({
                path: 'messages.sender',
                select: 'name role' // Select the fields you need
            })
            .sort({ lastMessageAt: -1 });
        res.json(chats);
    } catch (err) {
        console.error("Error fetching chats for admin:", err.message);
        res.status(500).send('Server Error');
    }
});


// Load the model once when the server starts for efficiency
let extractor;
(async () => {
    try {
        console.log('Loading semantic search model (Xenova/bge-small-en-v1.5)...');
        extractor = await pipeline('feature-extraction', 'Xenova/bge-small-en-v1.5');
        console.log('Semantic search model loaded successfully.');
    } catch (err) {
        console.error('Failed to load semantic search model:', err);
    }
})();

//sematic search endpoint
// The refactored semantic search endpoint

app.post('/api/items/semantic-search', async (req, res) => {

    try {

        const { query, limit: reqLimit } = req.body;

        if (!query) return res.status(400).json({ success: false, message: 'Query is required.' });



        const command = await parseQueryWithGroq(query);

        console.log("[Groq Parsed Command]:", command);



        const { semanticQuery, limit, sortBy, sortOrder, filters } = command;



        if (!extractor) {

            return res.status(503).json({ success: false, message: 'AI search model is still loading. Please try again in a moment.' });

        }



        // Prefer: parsed limit -> request body limit -> default 12

        const numResults = parseInt(limit, 10) || parseInt(reqLimit, 10) || 12;



        // Build a $match stage for any non-vector filters we want to apply *after* similarity scoring

        const postMatchStage = {};

        if (filters) {

            if (filters.maxPrice) postMatchStage.price = { ...postMatchStage.price, $lte: filters.maxPrice };

            if (filters.minPrice) postMatchStage.price = { ...postMatchStage.price, $gte: filters.minPrice };

            if (filters.maxLength) postMatchStage.length = { $lte: filters.maxLength };

            if (filters.maxWidth) postMatchStage.width = { $lte: filters.maxWidth };

            if (filters.maxHeight) postMatchStage.height = { $lte: filters.maxHeight };

            if (filters.is_bestseller !== undefined) postMatchStage.is_bestseller = filters.is_bestseller;

            if (filters.is_customizable !== undefined) postMatchStage.is_customizable = filters.is_customizable;

            if (filters.isPackage !== undefined) postMatchStage.isPackage = filters.isPackage;

        }



        const pipeline = [];



        const queryEmbedding = await extractor(semanticQuery, { pooling: 'mean', normalize: true });



        // $vectorSearch MUST be the first stage in the pipeline

        pipeline.push({

            $vectorSearch: {

                index: 'vector_index',

                path: 'embedding',

                queryVector: Array.from(queryEmbedding.data),

                numCandidates: 200,

                limit: numResults,

            }

        });



        // Apply attribute-based filters *after* the similarity search

        if (Object.keys(postMatchStage).length > 0) {

            pipeline.push({ $match: postMatchStage });

        }



        if (sortBy && sortOrder) {

            const sortStage = { $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } };

            pipeline.push(sortStage);

        }



        pipeline.push({

            $project: {

                _id: 1, name: 1, description: 1, price: 1, imageUrl: 1, sales: 1,

                score: { $meta: "vectorSearchScore" }

            }

        });



        const results = await Item.aggregate(pipeline);

        res.json({ success: true, ItemData: results, parsedCommand: command });



    } catch (err) {

        console.error('Error in semantic search route:', err);

        res.status(500).json({ success: false, message: 'Server error during search.' });

    }

});

// Get or create a chat for a user with an admin

app.post('/api/chats', authenticateToken, async (req, res) => {
    if (req.user.role !== 'user') {
        return res.status(403).json({ msg: 'Only users can start chats.' });
    }
    try {
        const admin = await User.findOne({ role: 'admin' });
        if (!admin) {
            return res.status(404).json({ msg: 'No admin available to chat with.' });
        }

        let chat = await Chat.findOne({
            participants: { $all: [req.user.id, admin.id] }
        });

        if (!chat) {
            chat = new Chat({
                participants: [req.user.id, admin.id],
                messages: []
            });
            await chat.save();
        }

        // THIS IS THE CRITICAL FIX: Ensure population happens reliably after finding or creating
        await chat.populate([
            { path: 'participants', select: 'name role' },
            { path: 'messages.sender', select: 'name role' }
        ]);

        res.json(chat);
    } catch (err) {
        console.error("Error fetching/creating chat for user:", err.message);
        res.status(500).send('Server Error');
    }
});



// --- START OF CHAT API ROUTES ---

// --- WEBSOCKET (SOCKET.IO) LOGIC ---
io.on('connection', (socket) => {
    console.log('A user connected via WebSocket:', socket.id);

    socket.on('joinChat', (chatId) => {
        socket.join(chatId);
        console.log(`User ${socket.id} joined chat room ${chatId}`);
    });

    socket.on('sendMessage', async ({ chatId, senderId, content }) => {
        try {
            const sender = await User.findById(senderId);
            if (!sender) {
                console.error('Sender not found:', senderId);
                return;
            }

            const message = {
                sender: senderId,
                content: content,
                timestamp: new Date()
            };

            const chat = await Chat.findByIdAndUpdate(
                chatId,
                {
                    $push: { messages: message },
                    lastMessageAt: new Date()
                },
                { new: true }
            ).populate('messages.sender', 'name role');

            if (chat) {
                const lastMessage = chat.messages[chat.messages.length - 1];
                const messageToSend = {
                    ...lastMessage.toObject(),
                    chatId: chat._id,
                    sender: {
                        _id: sender._id,
                        name: sender.name,
                        role: sender.role
                    }
                };

                io.in(chatId).emit('receiveMessage', messageToSend);
                io.emit('updateChatList');
            } else {
                console.error('Chat not found:', chatId);
            }
        } catch (error) {
            console.error('Error handling sendMessage:', error);
            socket.emit('messageError', {
                chatId,
                error: 'Failed to send message'
            });
        }
    });

    socket.on('typing', ({ chatId, isTyping }) => {
        socket.to(chatId).emit('userTyping', {
            chatId,
            userId: socket.id,
            isTyping
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected from WebSocket:', socket.id);
    });
});
// --- END OF WEBSOCKET LOGIC ---




//PATMONGO API------------------------------------------------------------
app.post("/api/create-checkout-session", authenticateToken, async (req, res) => {
    console.log("=== PAYMONGO CHECKOUT SESSION CREATION STARTED ===");

    // The amount and shippingFee now come directly from the frontend's calculation
    const { amount, items, shippingFee, deliveryOption, transactionHash } = req.body;

    // --- Validation remains the same ---
    if (!process.env.PAYMONGO_SECRET_KEY || !process.env.FRONTEND_URL) {
        return res.status(500).json({ error: "Payment configuration error." });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Items are required." });
    }
    if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Valid amount is required." });
    }
    console.log("Request validation passed.");

    try {
        // --- THIS IS THE CORRECTED LOGIC ---
        // 1. Create line items from the products
        const line_items = items.map((item) => ({
            amount: Math.round(item.price * 100), // Convert to centavos
            currency: "PHP",
            name: item.name,
            quantity: item.quantity,
        }));

        // 2. If there is a shipping fee, add it as its own line item
        if (deliveryOption === "shipping" && shippingFee > 0) {
            line_items.push({
                amount: Math.round(shippingFee * 100),
                currency: "PHP",
                name: "Shipping Fee",
                quantity: 1,
            });
        }

        // 3. The total amount for the checkout session should match the grandTotal from the frontend
        const totalAmountInCentavos = Math.round(amount * 100);

        const checkoutData = {
            data: {
                attributes: {
                    line_items,
                    payment_method_types: ["gcash", "card"],
                    success_url: `${process.env.FRONTEND_URL}/checkout/success`,
                    cancel_url: `${process.env.FRONTEND_URL}/checkout/cancel`, // Corrected typo
                    send_email_receipt: true,
                    show_line_items: true,
                    // The API expects the total amount to be here as well for some validations
                    amount: totalAmountInCentavos,
                    metadata: {
                        transaction_hash: transactionHash || 'unknown',
                        payment_type: 'initial_payment'
                    }
                },
            },
        };

        console.log("Creating PayMongo checkout session with data:", JSON.stringify(checkoutData, null, 2));

        const response = await axios.post(
            "https://api.paymongo.com/v1/checkout_sessions",
            checkoutData,
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Basic ${Buffer.from(
                        `${process.env.PAYMONGO_SECRET_KEY}:`
                    ).toString("base64")}`,
                },
            }
        );

        console.log("=== PAYMONGO RESPONSE RECEIVED ===");

        // Extract session ID and store it for webhook matching
        const sessionId = response.data.data.id;
        console.log("PayMongo session ID:", sessionId);

        // We need to store this session ID with the order for webhook processing
        // This will be handled differently - we'll look for orders with matching transactionHash
        // and update them with the session ID when the webhook fires

        res.json({
            checkoutUrl: response.data.data.attributes.checkout_url,
            sessionId: sessionId
        });

    } catch (error) {
        console.log("=== PAYMONGO ERROR ===");
        console.error("Paymongo error details:", error.response?.data?.errors || error.message);
        res.status(500).json({
            error: "Payment failed",
            details: error.response?.data?.errors || "An unknown error occurred.",
        });
    }
});
// Update webhook to clear cart on successful payment
app.post("/api/paymongo-webhook", bodyParser.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['paymongo-signature'];
    const payload = req.body;

    try {
        // Verify webhook signature (implement according to Paymongo docs)
        const event = JSON.parse(payload.toString());

        if (event.type === 'checkout_session.completed') {
            const sessionId = event.data.attributes.data.id;
            const metadata = event.data.attributes.data.metadata;

            console.log("=== WEBHOOK RECEIVED ===");
            console.log("Session ID:", sessionId);
            console.log("Metadata:", metadata);

            // Check if this is a balance payment
            if (metadata && metadata.payment_type === 'balance_payment') {
                console.log("=== BALANCE PAYMENT WEBHOOK RECEIVED ===");
                const orderId = metadata.order_id;
                const order = await Order.findById(orderId).populate('user', 'name email').populate('items.item');

                if (order) {
                    console.log(`Found order ${order._id} for balance payment`);
                    console.log(`Current order status: ${order.status}, payment status: ${order.paymentStatus}`);
                    // Update the session ID for tracking
                    order.balancePaymentSessionId = sessionId;
                    const paymentAmount = event.data.attributes.amount / 100; // Convert from centavos

                    // Update order with balance payment
                    order.paidAmount = (order.paidAmount || 0) + paymentAmount;
                    order.balance = Math.max(0, order.amount - order.paidAmount);
                    order.paymentStatus = 'Fully Paid';

                    // If delivery option is shipping, set to "On Process", if pickup set to "Ready for Pickup"
                    if (order.deliveryOption === 'shipping') {
                        order.status = 'On Process';
                    } else if (order.deliveryOption === 'pickup') {
                        order.status = 'Ready for Pickup';
                    }

                    await order.save();

                    console.log(`Balance payment completed for Order ${order._id}. Total paid: ₱${order.paidAmount}`);

                    // Log the balance payment
                    await LoggerService.logPayment('balance_payment_received', order, order.user, {
                        paymentMethod: 'PayMongo',
                        sessionId,
                        amount: paymentAmount,
                        totalPaid: order.paidAmount,
                        remainingBalance: order.balance
                    });
                } else {
                    console.log(`Balance payment webhook: Order not found with ID ${orderId}`);
                }
            } else {
                // Original downpayment logic - try multiple ways to find the order
                let order = await Order.findOne({ transactionId: sessionId }).populate('user', 'name email').populate('items.item');

                // If order not found by transactionId, try to find by transactionHash from metadata
                if (!order && metadata && metadata.transaction_hash && metadata.transaction_hash !== 'unknown') {
                    console.log("Order not found by transactionId, trying transactionHash:", metadata.transaction_hash);
                    order = await Order.findOne({ transactionHash: metadata.transaction_hash }).populate('user', 'name email').populate('items.item');

                    if (order) {
                        console.log(`Found order by transactionHash: ${order._id}`);
                        // Set the transactionId for future reference
                        order.transactionId = sessionId;
                    }
                }

                // If still not found, try to find by recent creation and update it
                if (!order) {
                    console.log("Order not found by transactionId or transactionHash, looking for recent orders to update...");
                    // Find recent orders without transactionId (created in last 30 minutes)
                    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
                    const recentOrders = await Order.find({
                        transactionId: { $exists: false },
                        createdAt: { $gte: thirtyMinutesAgo },
                        status: 'Pending'
                    }).populate('user', 'name email').populate('items.item').sort({ createdAt: -1 });

                    if (recentOrders.length > 0) {
                        order = recentOrders[0]; // Take the most recent one
                        order.transactionId = sessionId; // Set the transaction ID
                        console.log(`Found and linked order ${order._id} with session ${sessionId}`);
                    }
                }

                if (order) {
                    const paymentAmount = event.data.attributes.amount / 100; // Convert from centavos

                    // Check if order has customized items
                    const hasCustomizedItems = order.items.some(item => item.item?.is_customizable);

                    if (hasCustomizedItems) {
                        // For customized orders, this is a downpayment
                        order.paidAmount = paymentAmount;
                        order.paymentStatus = 'Downpaid';
                        order.status = 'On Process';

                        // Calculate remaining balance
                        order.balance = order.amount - paymentAmount;

                        console.log(`Downpayment received for Order ${order._id}. Paid: ₱${paymentAmount}, Remaining: ₱${order.balance}`);
                    } else {
                        // For regular orders, this is full payment
                        order.paidAmount = paymentAmount;
                        order.paymentStatus = 'Fully Paid';
                        order.balance = 0;

                        // Set status based on delivery option
                        if (order.deliveryOption === 'shipping') {
                            order.status = 'On Process';
                        } else if (order.deliveryOption === 'pickup') {
                            order.status = 'Ready for Pickup';
                        }

                        console.log(`Full payment received for Order ${order._id}`);
                    }

                    await order.save();

                    const itemIds = order.items.map(item => item._id);

                    await Cart.findOneAndUpdate(
                        { user: order.user },
                        { $pull: { items: { _id: { $in: itemIds } } } }
                    );

                    console.log(`Order ${order._id} updated and cart cleared`);

                    // Log the payment received
                    await LoggerService.logPayment('payment_received', order, order.user, {
                        paymentMethod: 'PayMongo',
                        sessionId,
                        amount: paymentAmount,
                        paymentType: hasCustomizedItems ? 'downpayment' : 'full_payment'
                    });
                }
            }
        }

        res.status(200).end();
    } catch (err) {
        console.error("Webhook error:", err);
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
});

// Add endpoint to handle canceled payments
app.put("/api/orders/:id/cancel", authenticateToken, async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status: 'cancelled' },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        // Verify the order belongs to the requesting user
        if (order.user.toString() !== req.user.id) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update order status when user returns from payment
app.get("/api/orders/:id/status", authenticateToken, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'name email')
            .populate('items.item');

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        // Verify the order belongs to the requesting user
        if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: "Unauthorized" });
        }

        res.json({
            ...order.toObject(),
            address: order.address,
            phone: order.phone
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all orders for a user
app.get("/api/user/orders", authenticateToken, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user.id })
            .sort('-createdAt')
            .populate('items.item');

        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Submit delivery proof and complete order
app.post('/api/orders/:id/delivery-proof', authenticateToken, authorizeRoles("admin"), upload.single('deliveryProof'), async (req, res) => {
    try {
        const orderId = req.params.id;

        // Check for multer errors
        if (req.fileValidationError) {
            return res.status(400).json({ success: false, message: req.fileValidationError });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Delivery proof image is required' });
        }

        console.log(`Processing delivery proof upload for order ${orderId}. File size: ${(req.file.size / 1024 / 1024).toFixed(2)}MB`);

        // Upload image to Cloudinary with optimizations
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: "delivery_proofs",
                // Optimization settings for faster uploads
                quality: "auto:good", // Automatic quality optimization
                fetch_format: "auto", // Automatic format conversion (WebP when supported)
                width: 1200, // Max width to reduce file size
                height: 1200, // Max height to maintain aspect ratio
                crop: "limit", // Don't upscale, only downscale if needed
                flags: "progressive", // Progressive JPEG for faster loading
                resource_type: "image" // Explicitly set as image
            },
            async (error, result) => {
                if (error) {
                    console.error('Cloudinary upload error:', error);
                    return res.status(500).json({ success: false, message: 'Failed to upload image' });
                }

                try {
                    // Update order with delivery proof and mark as completed
                    const updatedOrder = await Order.findByIdAndUpdate(
                        orderId,
                        {
                            status: 'Delivered',
                            deliveryProof: result.secure_url,
                            deliveryDate: new Date()
                        },
                        { new: true }
                    ).populate('user', 'name email').populate('items.item', 'name price');

                    if (!updatedOrder) {
                        return res.status(404).json({ success: false, message: 'Order not found' });
                    }

                    console.log(`Delivery proof submitted for order ${orderId}:`, result.secure_url);

                    // Log the delivery proof upload
                    await LoggerService.logOrder('delivery_proof_uploaded', updatedOrder, req.user, {
                        deliveryProofUrl: result.secure_url,
                        customerName: updatedOrder.user?.name,
                        customerEmail: updatedOrder.user?.email,
                        previousStatus: 'On Process',
                        newStatus: 'Delivered'
                    }, req);

                    res.json({
                        success: true,
                        message: 'Delivery proof submitted and order completed',
                        OrderData: updatedOrder,
                        deliveryProofUrl: result.secure_url
                    });
                } catch (updateError) {
                    console.error('Error updating order with delivery proof:', updateError);
                    res.status(500).json({ success: false, message: 'Failed to update order' });
                }
            }
        );

        uploadStream.end(req.file.buffer);

    } catch (err) {
        console.error('Error submitting delivery proof:', err.message);
        res.status(500).json({ success: false, message: 'Server error submitting delivery proof' });
    }
});




// Updated Order Creation Route
app.post('/api/orders', authenticateToken, async (req, res) => {
    console.log("=== BACKEND ORDER CREATION STARTED ===");
    console.log("Request body:", req.body);
    console.log("User ID from token:", req.user.id);

    const {
        items,
        amount,
        transactionHash,
        deliveryOption,
        shippingFee,
        scheduledDate,
        shippingInfo
    } = req.body;
    const userId = req.user.id;

    console.log('Order creation request received:', {
        userId,
        amount,
        deliveryOption,
        itemsCount: items?.length,
        hasShippingInfo: !!shippingInfo,
        transactionHash
    });

    try {
        // --- Duplicate check logic remains the same ---
        if (transactionHash) {
            console.log("Checking for duplicate order with hash:", transactionHash);
            const existingOrderByHash = await Order.findOne({ transactionHash: transactionHash });
            if (existingOrderByHash) {
                console.log('Duplicate order detected by transaction hash');
                return res.status(200).json({
                    message: 'Order already exists',
                    orderId: existingOrderByHash._id,
                    isDuplicate: true
                });
            }
        }

        console.log("=== FETCHING USER DETAILS ===");
        const user = await User.findById(userId);
        if (!user) {
            console.log("ERROR: User not found with ID:", userId);
            return res.status(404).json({ error: "User not found" });
        }

        // Address processing logic remains the same...
        let orderAddress;
        let orderPhone;
        let orderShippingAddress = null;

        if (deliveryOption === 'shipping' && shippingInfo) {
            orderAddress = `${shippingInfo.addressLine1}, ${shippingInfo.brgyName}, ${shippingInfo.cityName}, ${shippingInfo.postalCode}`;
            orderPhone = shippingInfo.phone;
            orderShippingAddress = {
                fullName: shippingInfo.fullName,
                addressLine1: shippingInfo.addressLine1,
                city: shippingInfo.cityName,
                state: shippingInfo.provinceName,
                postalCode: shippingInfo.postalCode,
                phone: shippingInfo.phone
            };
        } else {
            if (user.address && typeof user.address === 'object') {
                const addr = user.address;
                orderAddress = `${addr.addressLine1 || ''}, ${addr.brgyName || ''}, ${addr.cityName || ''}, ${addr.postalCode || ''}`.replace(/^,\s*/, '').replace(/,\s*,/g, ',');
            } else {
                orderAddress = user.address || 'No address provided';
            }
            orderPhone = user.phone || 'No phone provided';
        }

        if (!orderAddress || orderAddress.trim() === '') {
            orderAddress = 'Address not provided';
        }
        if (!orderPhone || orderPhone.trim() === '') {
            orderPhone = 'Phone not provided';
        }

        console.log("=== PROCESSING ITEMS FOR ORDER ===");
        const processedItems = items.map(item => {
            const newItem = {
                item: item.id || item.item,
                quantity: item.quantity,
                price: item.price,
                customH: item.customH ?? item.custom_details?.dimensions?.height ?? null,
                customW: item.customW ?? item.custom_details?.dimensions?.width ?? null,
                customL: item.customL ?? item.custom_details?.dimensions?.length ?? null,
                legsFrameMaterial: item.legsFrameMaterial ?? item.custom_details?.material3x3 ?? null,
                tabletopMaterial: item.tabletopMaterial ?? item.custom_details?.material2x12 ?? null
            };
            return newItem;
        });

        // === NEW: DOWN PAYMENT SYSTEM LOGIC ===
        console.log("=== DETERMINING ITEM TYPES AND ORDER STATUS ===");

        const itemIds = processedItems.map(item => item.item);
        const itemDetails = await Item.find({ _id: { $in: itemIds } });

        const hasCustomizableItems = itemDetails.some(item => item.is_customizable);
        console.log("Has customizable items:", hasCustomizableItems);

        // Calculate down payment and balance
        let downPayment = 0;
        let balance = 0;
        let paymentStatus = 'Pending Downpayment';
        let initialStatus = 'Pending';

        if (hasCustomizableItems) {
            // Customizable items require 30% down payment (frontend logic)
            downPayment = Math.round(amount * 0.3);
            balance = amount - downPayment;
            paymentStatus = 'Pending Downpayment';
            initialStatus = 'Pending'; // Will change to 'On Process' after down payment
            console.log("Customizable items detected - 30% down payment required");
        } else {
            // Regular items require full payment
            downPayment = amount;
            balance = 0;
            paymentStatus = 'Fully Paid'; // This will be updated after payment confirmation

            // Set initial status based on delivery option for regular items
            if (deliveryOption === 'shipping') {
                initialStatus = 'On Process'; // Auto-process for shipping
            } else if (deliveryOption === 'pickup') {
                initialStatus = 'Ready for Pickup'; // Ready for pickup immediately
            }
            console.log("Regular items detected - full payment required");
        }

        console.log("Payment breakdown:", {
            totalAmount: amount,
            downPayment,
            balance,
            paymentStatus,
            initialStatus
        });

        // Create the order with new payment fields
        const orderData = {
            user: userId,
            amount,
            downPayment,
            balance,
            paymentStatus,
            status: initialStatus,
            transactionHash: transactionHash,
            items: processedItems,
            address: orderAddress,
            phone: orderPhone,
            shippingAddress: orderShippingAddress,
            deliveryOption: deliveryOption,
            shippingFee: shippingFee || 0,
            deliveryDate: scheduledDate ? new Date(scheduledDate) : null
        };

        console.log("=== FINAL ORDER DATA ===");
        console.log("Order data to save:", orderData);

        const order = new Order(orderData);
        await order.save();

        console.log("=== ORDER SAVED SUCCESSFULLY ===");
        console.log('Order saved successfully:', {
            orderId: order._id,
            userId: order.user,
            deliveryOption: deliveryOption,
            status: order.status,
            paymentStatus: order.paymentStatus,
            downPayment: order.downPayment,
            balance: order.balance
        });

        // Log the order creation
        await LoggerService.logOrder('order_created', order, req.user, {
            customerName: user.name,
            customerEmail: user.email,
            deliveryOption,
            paymentStatus: order.paymentStatus,
            itemsCount: processedItems.length,
            hasCustomizableItems
        }, req);

        res.status(201).json(order);

    } catch (error) {
        console.log("=== ORDER CREATION ERROR ===");
        console.error("Error creating order:", error);
        res.status(500).json({
            error: "Failed to create order.",
            details: error.message
        });
    }
});





//confirms order after paymongo
app.put('/api/orders/:id/confirm', async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (!order) {
        return res.status(404).json({ error: "Order not found" });
    }
    order.status = 'On Process';
    await order.save();
    res.json(order);
});

// Manual payment confirmation endpoint (backup for webhook issues)
app.post('/api/orders/confirm-payment', authenticateToken, async (req, res) => {
    console.log("=== MANUAL PAYMENT CONFIRMATION ===");

    try {
        const { transactionHash, sessionId } = req.body;
        console.log("Looking for order with transactionHash:", transactionHash);
        console.log("Session ID:", sessionId);

        if (!transactionHash) {
            return res.status(400).json({ error: "Transaction hash required" });
        }

        // Find order by transaction hash
        const order = await Order.findOne({ transactionHash }).populate('user', 'name email').populate('items.item');

        if (!order) {
            console.log("Order not found with transactionHash:", transactionHash);
            return res.status(404).json({ error: "Order not found" });
        }

        console.log("Found order:", order._id);
        console.log("Current order status:", order.status);
        console.log("Current payment status:", order.paymentStatus);

        // Check if order is still pending
        if (order.status !== 'Pending') {
            console.log("Order already processed");
            return res.json({ message: "Order already processed", order });
        }

        // Update order with payment information
        order.transactionId = sessionId;

        // Check if order has customized items
        const hasCustomizedItems = order.items.some(item => item.item?.is_customizable);
        console.log("Has customized items:", hasCustomizedItems);

        if (hasCustomizedItems) {
            // For customized orders, this is a downpayment
            order.paidAmount = order.downPayment || (order.amount * 0.3);
            order.paymentStatus = 'Downpaid';
            order.status = 'On Process';
            order.balance = order.amount - order.paidAmount;

            console.log(`Downpayment confirmed for Order ${order._id}. Paid: ₱${order.paidAmount}, Remaining: ₱${order.balance}`);
        } else {
            // For regular orders, this is full payment
            order.paidAmount = order.amount;
            order.paymentStatus = 'Fully Paid';
            order.balance = 0;

            // Set status based on delivery option
            if (order.deliveryOption === 'shipping') {
                order.status = 'On Process';
            } else if (order.deliveryOption === 'pickup') {
                order.status = 'Ready for Pickup';
            }

            console.log(`Full payment confirmed for Order ${order._id}`);
        }

        await order.save();
        console.log("Order updated successfully");

        res.json({
            message: "Payment confirmed successfully",
            order,
            paymentType: hasCustomizedItems ? 'downpayment' : 'full_payment'
        });

    } catch (error) {
        console.error("Error confirming payment:", error);
        res.status(500).json({ error: "Failed to confirm payment" });
    }
});

// Request refund endpoint
app.put('/api/orders/:id/request-refund', authenticateToken, async (req, res) => {
    console.log("=== BACKEND REFUND REQUEST STARTED ===");
    console.log("Order ID:", req.params.id);
    console.log("User ID:", req.user.id);
    console.log("User role:", req.user.role);

    try {
        const order = await Order.findById(req.params.id).populate('items.item');

        if (!order) {
            console.log("ERROR: Order not found");
            return res.status(404).json({ error: "Order not found" });
        }

        console.log("Order found:", {
            id: order._id,
            status: order.status,
            user: order.user,
            itemsCount: order.items.length
        });

        // Verify the order belongs to the requesting user
        if (order.user.toString() !== req.user.id) {
            console.log("ERROR: User not authorized to refund this order");
            return res.status(403).json({ error: "Unauthorized to refund this order" });
        }

        // Check if order is in "On Process" status
        if (order.status !== "On Process") {
            console.log("ERROR: Order is not in 'On Process' status. Current status:", order.status);
            return res.status(400).json({
                error: "Refund requests can only be made for orders that are currently being processed"
            });
        }

        // Check if any items are customized
        const hasCustomizedItems = order.items.some(item => {
            const isCustomized = item.item?.is_customizable || false;
            console.log(`Item ${item.item?.name}: is_customizable = ${isCustomized}`);
            return isCustomized;
        });

        console.log("Has customized items:", hasCustomizedItems);

        if (hasCustomizedItems) {
            console.log("ERROR: Order contains customized items. Refund not allowed.");
            return res.status(400).json({
                error: "Refund requests cannot be made for orders containing customized items"
            });
        }

        // Update order status to "Requesting for Refund"
        console.log("Updating order status to 'Requesting for Refund'");
        order.status = 'Requesting for Refund';
        await order.save();

        console.log("=== REFUND REQUEST SUCCESSFUL ===");
        console.log("Order status updated to:", order.status);

        res.json({
            success: true,
            message: "Refund request submitted successfully",
            order: order
        });

    } catch (error) {
        console.log("=== REFUND REQUEST ERROR ===");
        console.error("Error processing refund request:", error);
        res.status(500).json({
            error: "Failed to process refund request",
            details: error.message
        });
    }
});

// Create PayMongo checkout session for remaining balance payment
app.post('/api/orders/:id/complete-payment', authenticateToken, async (req, res) => {
    console.log("=== FULL PAYMENT CHECKOUT SESSION CREATION STARTED ===");

    const { id: orderId } = req.params;
    let { amount } = req.body;

    // Validation
    if (!process.env.PAYMONGO_SECRET_KEY || !process.env.FRONTEND_URL) {
        return res.status(500).json({ error: "Payment configuration error." });
    }

    console.log("Request validation passed for order:", orderId);

    try {
        // Verify order exists and belongs to user
        const order = await Order.findById(orderId).populate('items.item');
        if (!order) {
            return res.status(404).json({ error: "Order not found." });
        }

        if (order.user.toString() !== req.user.id) {
            return res.status(403).json({ error: "Unauthorized access to order." });
        }

        // Check if order has customized items and needs remaining payment
        const hasCustomizedItems = order.items.some(item => item.item?.is_customizable);
        if (!hasCustomizedItems) {
            return res.status(400).json({ error: "This order does not require balance payment." });
        }

        // Calculate expected remaining balance
        const totalAmount = order.amount;
        const paidAmount = order.paidAmount || 0;
        const remainingBalance = totalAmount - paidAmount;

        if (remainingBalance <= 0) {
            return res.status(400).json({ error: "No remaining balance to pay." });
        }

        // If no amount provided, use the calculated remaining balance
        if (!amount || amount <= 0) {
            amount = remainingBalance;
            console.log("No amount provided, using calculated remaining balance:", amount);
        } else {
            // Verify the amount matches what we expect
            if (Math.abs(amount - remainingBalance) > 1) { // Allow for small rounding differences
                return res.status(400).json({
                    error: `Amount mismatch. Expected: ₱${remainingBalance.toFixed(2)}, Received: ₱${amount.toFixed(2)}`
                });
            }
        }

        console.log("Order validation passed. Creating PayMongo session for remaining balance:", amount);

        // Create line item for remaining balance
        const line_items = [{
            amount: Math.round(amount * 100), // Convert to centavos
            currency: "PHP",
            name: `Remaining Balance - Order #${order._id.toString().slice(-8)}`,
            quantity: 1,
        }];

        const totalAmountInCentavos = Math.round(amount * 100);

        const checkoutData = {
            data: {
                attributes: {
                    line_items,
                    payment_method_types: ["gcash", "card"],
                    success_url: `${process.env.FRONTEND_URL}/success-balance?order_id=${orderId}`,
                    cancel_url: `${process.env.FRONTEND_URL}/order/${orderId}`,
                    send_email_receipt: true,
                    show_line_items: true,
                    amount: totalAmountInCentavos,
                    metadata: {
                        order_id: orderId,
                        payment_type: "balance_payment",
                        user_id: req.user.id
                    }
                },
            },
        };

        console.log("Creating PayMongo checkout session for balance payment:", JSON.stringify(checkoutData, null, 2));

        const response = await axios.post(
            "https://api.paymongo.com/v1/checkout_sessions",
            checkoutData,
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Basic ${Buffer.from(
                        `${process.env.PAYMONGO_SECRET_KEY}:`
                    ).toString("base64")}`,
                },
            }
        );

        console.log("=== PAYMONGO BALANCE PAYMENT RESPONSE RECEIVED ===");

        // Store the session ID for tracking
        await Order.findByIdAndUpdate(orderId, {
            balancePaymentSessionId: response.data.data.id
        });

        res.json({
            success: true,
            checkout_url: response.data.data.attributes.checkout_url,
            session_id: response.data.data.id
        });

    } catch (error) {
        console.log("=== PAYMONGO BALANCE PAYMENT ERROR ===");
        console.error("Paymongo error details:", error.response?.data?.errors || error.message);
        res.status(500).json({
            error: "Payment failed",
            details: error.response?.data?.errors || "An unknown error occurred.",
        });
    }
});

// Confirm balance payment endpoint 
app.post('/api/orders/:id/confirm-balance-payment', authenticateToken, async (req, res) => {
    console.log("=== CONFIRMING BALANCE PAYMENT ===");

    try {
        const orderId = req.params.id;
        console.log("Order ID:", orderId);

        // Find and verify order
        const order = await Order.findById(orderId).populate('items.item');
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        // Verify order belongs to user
        if (order.user.toString() !== req.user.id) {
            return res.status(403).json({ error: "Unauthorized access to order" });
        }

        console.log("Current order status:", order.status);
        console.log("Current payment status:", order.paymentStatus);
        console.log("Current balance:", order.balance);
        console.log("Current paid amount:", order.paidAmount);

        // Check if this is a balance payment scenario
        if (order.paymentStatus === 'Downpaid' && order.balance > 0) {
            console.log("Updating order to fully paid status");

            // Update payment status to fully paid
            order.paymentStatus = 'Fully Paid';
            order.paidAmount = order.amount; // Mark as fully paid
            order.balance = 0; // No remaining balance

            // Keep the current status (should already be 'On Process' or 'Ready for Pickup')
            if (order.status === 'Pending') {
                if (order.deliveryOption === 'shipping') {
                    order.status = 'On Process';
                } else if (order.deliveryOption === 'pickup') {
                    order.status = 'Ready for Pickup';
                }
            }

            await order.save();

            console.log("Order updated successfully:");
            console.log("New payment status:", order.paymentStatus);
            console.log("New balance:", order.balance);
            console.log("New paid amount:", order.paidAmount);

            res.json({
                success: true,
                message: "Balance payment confirmed successfully",
                order: order
            });
        } else {
            console.log("Order is not in a state that requires balance payment confirmation");
            res.json({
                success: true,
                message: "Order payment status is already up to date",
                order: order
            });
        }

    } catch (error) {
        console.error("Error confirming balance payment:", error);
        res.status(500).json({ error: "Failed to confirm balance payment" });
    }
});

//PAYMONGO API END ------------------------------------------------------




//USERS API----------------------------------------------------------------

// registration
// Enhanced Registration Route with Better Validation and Error Handling
app.post("/api/registeruser", async (req, res) => {
    console.log("=== REGISTRATION REQUEST RECEIVED ===");
    console.log("Request body:", req.body);

    const { name, email, password, phone, role } = req.body; // Removed address

    // Enhanced validation with specific error messages
    const validationErrors = [];

    if (!name || name.trim().length < 2) {
        validationErrors.push("Name must be at least 2 characters long");
    }

    if (!email || !email.trim()) {
        validationErrors.push("Email is required");
    } else if (!/\S+@\S+\.\S+/.test(email)) {
        validationErrors.push("Please provide a valid email address");
    }

    if (!password) {
        validationErrors.push("Password is required");
    } else if (password.length < 6) {
        validationErrors.push("Password must be at least 6 characters long");
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
        validationErrors.push("Password must contain at least one uppercase letter, one lowercase letter, and one number");
    }

    if (!phone || phone.trim().length < 10) {
        validationErrors.push("Please provide a valid phone number");
    }

    // Removed address validation

    // Return validation errors if any
    if (validationErrors.length > 0) {
        console.log("❌ Validation failed:", validationErrors);
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: validationErrors
        });
    }

    try {
        // Check for existing user (case insensitive)
        console.log("🔍 Checking for existing user with email:", email);
        const existingUser = await User.findOne({
            email: { $regex: new RegExp(`^${email.trim()}$`, 'i') }
        });

        if (existingUser) {
            console.log("❌ User already exists with email:", email);
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists. Please use a different email or try logging in."
            });
        }

        console.log("✅ Email is available");
        console.log("🔐 Hashing password...");

        // Hash password with proper salt rounds
        const saltRounds = 12; // Increased for better security
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        console.log("✅ Password hashed successfully");

        // Prepare user data (removed address)
        const userData = {
            name: name.trim(),
            email: email.trim().toLowerCase(), // Normalize email
            phone: phone.trim(),
            password: hashedPassword,
            role: role || "user"
        };

        console.log("💾 Creating new user...");
        const newUser = new User(userData);
        const savedUser = await newUser.save();

        console.log("✅ User created successfully:", {
            id: savedUser._id,
            email: savedUser.email,
            role: savedUser.role
        });

        // Create cart for the user
        console.log("🛒 Creating cart for user...");
        const newCart = new Cart({
            user: savedUser._id,
            items: []
        });
        const savedCart = await newCart.save();

        // Link cart to user
        savedUser.cart = savedCart._id;
        await savedUser.save();

        console.log("✅ Cart created and linked to user");
        console.log("=== REGISTRATION SUCCESSFUL ===");

        // Return success response (don't include password)
        const userResponse = {
            id: savedUser._id,
            name: savedUser.name,
            email: savedUser.email,
            phone: savedUser.phone,
            role: savedUser.role,
            cart: savedCart._id
        };

        res.status(201).json({
            success: true,
            message: "Account created successfully! You can now log in.",
            UserData: {
                user: userResponse,
                cart: savedCart
            }
        });

    } catch (error) {
        console.log("=== REGISTRATION ERROR ===");
        console.error("Registration error:", error);

        // Handle specific MongoDB errors
        if (error.code === 11000) {
            // Duplicate key error
            const field = Object.keys(error.keyPattern)[0];
            const message = field === 'email'
                ? "An account with this email already exists"
                : `This ${field} is already in use`;

            return res.status(409).json({
                success: false,
                message
            });
        }

        if (error.name === 'ValidationError') {
            // Mongoose validation error
            const validationErrors = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: validationErrors
            });
        }

        // Generic server error
        res.status(500).json({
            success: false,
            message: "Server error during registration. Please try again.",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Update logged-in user's address
app.put('/api/user/address', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found.' });

        const info = req.body;
        user.address = {
            fullName: info.fullName,
            addressLine1: info.addressLine1,
            addressLine2: info.addressLine2,
            provinceCode: info.province,
            provinceName: info.provinceName,
            cityCode: info.city,
            cityName: info.cityName,
            brgyCode: info.brgy,
            brgyName: info.brgyName,
            postalCode: info.postalCode
        };
        if (info.phone) user.phone = info.phone;

        await user.save();
        res.json({ success: true, message: 'Address updated', address: user.address });
    } catch (err) {
        console.error('Error updating address:', err.message);
        res.status(500).json({ error: 'Server error while updating address.' });
    }
});
// read all users (active by default, or filter by status)
app.get('/api/allusers', async (req, res) => {
    try {
        const includeInactive = req.query.includeInactive === 'true';
        const showOnlyInactive = req.query.showOnlyInactive === 'true';

        let filter = {};
        if (showOnlyInactive) {
            filter = { status: 0 };
        } else if (!includeInactive) {
            filter = { status: 1 };
        }

        console.log(`[GET /api/allusers] includeInactive=${includeInactive}, showOnlyInactive=${showOnlyInactive}`);
        const users = await User.find(filter);
        res.json({ success: true, UserData: users });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error fetching users', error: err.message });
    }
});
// login ng user with encryption
app.post("/api/login", async (req, res) => {
    console.log("=== LOGIN REQUEST RECEIVED ===");
    console.log("Request body:", req.body);
    console.log("Headers:", req.headers);

    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
        console.log("❌ Missing email or password");
        return res.status(400).json({
            success: false,
            message: "Please fill in all fields"
        });
    }

    try {
        console.log("🔍 Searching for user with email:", email);

        // Find user by email (case insensitive)
        const user = await User.findOne({
            email: { $regex: new RegExp(`^${email}$`, 'i') }
        });

        if (!user) {
            console.log("❌ User not found with email:", email);
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        console.log("✅ User found:", {
            id: user._id,
            email: user.email,
            role: user.role,
            hasPassword: !!user.password
        });

        // Check if password exists
        if (!user.password) {
            console.log("❌ User has no password set");
            return res.status(401).json({
                success: false,
                message: "Account setup incomplete. Please contact support."
            });
        }

        console.log("🔐 Comparing passwords...");
        console.log("Provided password length:", password.length);
        console.log("Stored hash exists:", !!user.password);

        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);
        console.log("Password match result:", isMatch);

        if (!isMatch) {
            console.log("❌ Password does not match");
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        console.log("✅ Password matches, generating token...");

        // Check JWT_SECRET
        if (!process.env.JWT_SECRET) {
            console.log("❌ JWT_SECRET not configured");
            return res.status(500).json({
                success: false,
                message: "Server configuration error"
            });
        }

        // Issue JWT
        const token = jwt.sign(
            {
                id: user._id,
                role: user.role,
                email: user.email
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        console.log("✅ Token generated successfully");
        console.log("=== LOGIN SUCCESSFUL ===");

        // Log the user login
        await LoggerService.logUser('user_login', user, user, {
            loginTime: new Date(),
            ipAddress: req.ip || req.connection?.remoteAddress
        }, req);

        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            userId: user._id,
            role: user.role,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.log("=== LOGIN ERROR ===");
        console.error("Login error:", error);
        console.error("Error stack:", error.stack);

        res.status(500).json({
            success: false,
            message: "Server error during login",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
// read one user
app.get('/api/singleusers/:id', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).populate({
            path: 'cart',
            populate: { path: 'items.item' }
        });

        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        res.json({ success: true, UserData: user });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error fetching user', error: err.message });
    }
});
// =update a user
app.put('/api/updateusers/:id', async (req, res) => {
    try {
        const updates = req.body;
        const updatedUser = await User.findByIdAndUpdate(req.params.id, updates, { new: true });

        if (!updatedUser) return res.status(404).json({ success: false, message: 'User not found' });

        res.json({ success: true, message: 'User updated', UserData: updatedUser });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error updating user', error: err.message });
    }
});
// delete user saka cart
app.delete('/api/deleteusers/:id', authenticateToken, authorizeRoles("admin"), async (req, res) => {
    try {
        console.log(`🗑️  [Soft-Delete] Disabling User ${req.params.id}`);
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { status: 0 },
            { new: true }
        );

        if (!updatedUser) return res.status(404).json({ success: false, message: 'User not found' });

        // Optionally remove / archive their cart as well
        await Cart.findByIdAndDelete(updatedUser.cart);

        res.json({ success: true, message: 'User disabled and cart removed', UserData: updatedUser });
    } catch (err) {
        console.error('Error disabling user:', err.message);
        res.status(500).json({ success: false, message: 'Error disabling user', error: err.message });
    }
});


//ITEMS API----------------------------------------------------------------

// create item
app.post("/api/items", authenticateToken, authorizeRoles("admin"), upload.array('images', 2), async (req, res) => {
    // The middleware upload.array('images', 2) expects up to 2 files in a field named 'images'
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: "At least one image is required." });
        }

        // Upload each file to Cloudinary and collect the URLs
        const uploadPromises = req.files.map(file => new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream({ folder: "products" }, (error, result) => {
                if (error) return reject(error);
                resolve(result.secure_url);
            });
            uploadStream.end(file.buffer);
        }));

        const imageUrls = await Promise.all(uploadPromises);

        let bodyData = { ...req.body };
        // Parse boolean is_customizable
        if (typeof bodyData.is_customizable !== 'undefined') {
            bodyData.is_customizable = bodyData.is_customizable === 'true' || bodyData.is_customizable === true;
        }

        if (bodyData.customization_options) {
            if (typeof bodyData.customization_options === 'string') {
                try { bodyData.customization_options = JSON.parse(bodyData.customization_options); } catch (e) { }
            }
        }

        // Ensure numeric conversions and default cost if missing
        if (bodyData.price) bodyData.price = Number(bodyData.price);
        if (bodyData.stock) bodyData.stock = Number(bodyData.stock);
        if (bodyData.length) bodyData.length = Number(bodyData.length);
        if (bodyData.height) bodyData.height = Number(bodyData.height);
        if (bodyData.width) bodyData.width = Number(bodyData.width);

        if (typeof bodyData.cost === 'undefined' && typeof bodyData.price !== 'undefined') {
            bodyData.cost = bodyData.price; // default cost same as base price if not supplied
        }

        // Create new item with array of image URLs
        const newItem = new Item({ ...bodyData, imageUrl: imageUrls });
        await newItem.save();

        // Log the item creation
        await LoggerService.logItem('item_created', newItem, req.user, {
            itemName: newItem.name,
            price: newItem.price,
            stock: newItem.stock,
            isCustomizable: newItem.is_customizable
        }, req);

        res.status(201).json({ success: true, ItemData: newItem });

    } catch (err) {
        console.error("Error creating item:", err);
        res.status(500).json({ success: false, message: "Server error creating item." });
    }
});
// read item all (active by default, or filter by status)
app.get("/api/items", async (req, res) => {
    try {
        const includeInactive = req.query.includeInactive === 'true';
        const showOnlyInactive = req.query.showOnlyInactive === 'true';

        let filter = {};
        if (showOnlyInactive) {
            filter = { status: 0 };
        } else if (!includeInactive) {
            filter = { status: 1 };
        }

        console.log(`[GET /api/items] includeInactive=${includeInactive}, showOnlyInactive=${showOnlyInactive} -> filter`, filter);

        const items = await Item.find(filter)
            .populate('category', 'name status')
            .populate('furnituretype', 'name status');
        res.json({ success: true, ItemData: items });
    } catch (err) {
        console.error("Error fetching items:", err.message);
        res.status(500).json({ success: false, message: "Server error fetching items" });
    }
});
// read specific item
app.get("/api/items/:id", async (req, res) => {
    try {
        const item = await Item.findById(req.params.id).populate('category', 'name').populate('furnituretype', 'name');
        if (!item) {
            return res.status(404).json({ success: false, message: "Item not found" });
        }
        res.json({ success: true, Itemdata: item });
    } catch (err) {
        console.error("Error fetching item:", err.message);
        res.status(500).json({ success: false, message: "Server error fetching item" });
    }
});
// Items Recommendation
app.post('/api/items/recommend', async (req, res) => {
    try {
        const { selectedIds } = req.body; // expecting array of item IDs

        if (!Array.isArray(selectedIds) || selectedIds.length === 0) {
            return res.status(400).json({ success: false, message: 'selectedIds array is required' });
        }

        // Populate names for category and furnituretype to use mapping
        const selectedItems = await Item.find({ _id: { $in: selectedIds } })
            .populate('category', 'name')
            .populate('furnituretype', 'name');

        // Mapping from room (category name) to suggested furniture type names
        const ROOM_TO_TYPES = {
            'Bathroom': ['Cabinets', 'Bookshelves & Shelving Units', 'Room Dividers'],
            'Bedroom': ['Bedside Tables', 'Wardrobes', 'Armchairs', 'Study Tables'],
            'Dining Room': ['Dining Chairs', 'Cabinets', 'Room Dividers', 'Table'],
            'Home Office / Study': ['Office Chairs', 'Bookshelves & Shelving Units', 'Cabinets', 'Table'],
            "Kids' Room": ['Bunk Beds', 'Wardrobes', 'Study Tables', 'Bookshelves & Shelving Units'],
            'Kitchen': ['Dining Chairs', 'Kitchen Tables', 'Cabinets', 'Bookshelves & Shelving Units'],
            'Living Room': ['Coffee Tables', 'Armchairs', 'Sofa Tables', 'Sofas', 'Bookshelves & Shelving Units'],
            'Outdoor': ['Outdoor Sofas', 'Patio Dining Sets', 'Coffee Tables', 'Table'],
            'Utility': ['Cabinets', 'Bookshelves & Shelving Units', 'Shoe Racks']
        };

        // Collect recommended furniture type *names* based on ROOM_TO_TYPES mapping
        const recommendedTypeNames = new Set();

        selectedItems.forEach(itm => {
            // itm.category could be array or single ref after populate
            const catArray = Array.isArray(itm.category) ? itm.category : [itm.category];
            catArray.forEach(catDoc => {
                if (catDoc && catDoc.name && ROOM_TO_TYPES[catDoc.name]) {
                    ROOM_TO_TYPES[catDoc.name].forEach(typeName => recommendedTypeNames.add(typeName));
                }
            });
        });

        // Fetch FurnitureType documents matching these names
        const furnitureTypeDocs = await FurnitureType.find({ name: { $in: Array.from(recommendedTypeNames) } }, '_id');
        const furnitureIds = furnitureTypeDocs.map(doc => doc._id);

        // If no mapping-based matches found, fallback to previous simple category/furnituretype overlap
        let recommended;
        if (furnitureIds.length > 0) {
            recommended = await Item.find({
                _id: { $nin: selectedIds },
                furnituretype: { $in: furnitureIds }
            }).limit(4);
        }

        // Fallback: if still nothing, provide bestseller items (or any others)
        if (!recommended || recommended.length === 0) {
            recommended = await Item.find({ _id: { $nin: selectedIds } }).limit(4);
        }

        res.json({ success: true, ItemData: recommended });
    } catch (err) {
        console.error('Error fetching recommended items:', err.message);
        res.status(500).json({ success: false, message: 'Server error fetching recommended items', error: err.message });
    }
});
// update a item
app.put("/api/items/:id", authenticateToken, authorizeRoles("admin"), upload.array('images', 5), async (req, res) => {
    try {
        let updates = {
            name: req.body.name,
            description: req.body.description,
            price: req.body.price,
            category: req.body.category,
            furnituretype: req.body.furnituretype,
            length: req.body.length,
            height: req.body.height,
            width: req.body.width,
            stock: req.body.stock,
            is_bestseller: req.body.is_bestseller,
            isPackage: req.body.isPackage
        };

        // Handle customization fields
        if (typeof req.body.is_customizable !== 'undefined') {
            updates.is_customizable = req.body.is_customizable === 'true' || req.body.is_customizable === true;
        }

        if (req.body.customization_options) {
            let customOpts = req.body.customization_options;
            // If came as string from multipart, parse JSON
            if (typeof customOpts === 'string') {
                try { customOpts = JSON.parse(customOpts); } catch (e) { /* ignore parse error */ }
            }
            updates.customization_options = customOpts;
        }

        // If new images were uploaded, process them
        if (req.files && req.files.length > 0) {
            // Upload each file to Cloudinary and collect the URLs
            const uploadPromises = req.files.map(file => new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream({ folder: "products" }, (error, result) => {
                    if (error) return reject(error);
                    resolve(result.secure_url);
                });
                uploadStream.end(file.buffer);
            }));

            const imageUrls = await Promise.all(uploadPromises);
            updates.imageUrl = imageUrls;
        }
        // If no new images uploaded, keep existing imageUrl (don't update it)

        const updated = await Item.findByIdAndUpdate(req.params.id, updates, { new: true });
        if (!updated) {
            return res.status(404).json({ success: false, message: "Item not found" });
        }

        // Log the item update
        await LoggerService.logItem('item_updated', updated, req.user, {
            itemName: updated.name,
            updatedFields: Object.keys(updates).filter(key => updates[key] !== undefined)
        }, req);

        res.json({ success: true, ItemData: updated });
    } catch (err) {
        console.error("Error updating item:", err.message);
        res.status(500).json({ success: false, message: "Server error updating item" });
    }
});
// --- SOFT-DELETE ITEM (status → 0) ---
app.delete('/api/items/:id', authenticateToken, authorizeRoles("admin"), async (req, res) => {
    try {
        console.log(`🗑️  [Soft-Delete] Request to disable Item ${req.params.id}`);
        const updated = await Item.findByIdAndUpdate(
            req.params.id,
            { status: 0 },
            { new: true }
        );

        if (!updated) {
            console.log("⚠️  Item not found – nothing disabled");
            return res.status(404).json({ success: false, message: "Item not found" });
        }

        console.log(`✅  Item ${updated._id} status set to 0 (inactive)`);

        // Log the item deletion
        await LoggerService.logItem('item_deleted', updated, req.user, {
            itemName: updated.name,
            previousStatus: 1,
            newStatus: 0
        }, req);

        res.json({ success: true, message: "Item disabled (soft-deleted)", ItemData: updated });
    } catch (err) {
        console.error("❌  Error soft-deleting item:", err.message);
        res.status(500).json({ success: false, message: "Error disabling item", error: err.message });
    }
});

//ORDERS MANAGEMENT API--------------------------------------------------------

// Get all orders for the admin dashboard
app.get('/api/orders', authenticateToken, authorizeRoles("admin"), async (req, res) => {
    try {
        const orders = await Order.find({})
            .sort({ createdAt: -1 }) // Show newest orders first
            .populate('user', 'name email') // Populate user's name and email
            .populate('items.item', 'name price is_customizable customization_options');
        res.json({ success: true, OrderData: orders });
    } catch (err) {
        console.error('Error fetching all orders:', err.message);
        res.status(500).json({ success: false, message: 'Server error fetching orders' });
    }
});

// Update an order's status (e.g., to 'shipped', 'completed')
app.put('/api/orders/:id/status', authenticateToken, authorizeRoles("admin"), async (req, res) => {
    try {
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ success: false, message: 'Status is required' });
        }

        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        ).populate('user', 'name email').populate('items.item', 'name price');

        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Log the status change
        await LoggerService.logOrder('order_status_changed', updatedOrder, req.user, {
            previousStatus: updatedOrder.status,
            newStatus: status,
            customerName: updatedOrder.user?.name,
            customerEmail: updatedOrder.user?.email
        }, req);

        res.json({ success: true, message: 'Order status updated', OrderData: updatedOrder });
    } catch (err) {
        console.error('Error updating order status:', err.message);
        res.status(500).json({ success: false, message: 'Server error updating status' });
    }
});

//CART MANAGEMENT API--------------------------------------------------------

// Show all items in a user's cart (protected)
app.get('/api/cart/:userId/items', authenticateToken, async (req, res) => {
    // Only allow the user or an admin to access this cart
    if (req.user.role !== "admin" && req.user._id.toString() !== req.params.userId) {
        return res.status(403).json({ success: false, message: "Access denied" });
    }
    try {
        const user = await User.findById(req.params.userId).populate({
            path: 'cart',
            populate: {
                path: 'items.item',
                model: 'Item'
            }
        });

        if (!user || !user.cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        res.json({
            success: true,
            message: 'Cart items retrieved successfully',
            items: user.cart.items
        });

    } catch (err) {
        console.error('Error fetching cart:', err.message);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
});
// Adding item to Cart
app.post('/api/cart/:userId/add', authenticateToken, async (req, res) => {
    const { userId } = req.params;
    const { itemId, quantity = 1, customH, customW, customL, legsFrameMaterial, tabletopMaterial } = req.body;

    console.log(`[CART ADD] Request for User: ${userId}, Item: ${itemId}`);
    if (customH && customW && customL) {
        console.log(`[CART ADD] Custom Dimensions Received: H:${customH}, W:${customW}, L:${customL}`);
    } else {
        console.log(`[CART ADD] Standard item add request.`);
    }

    if (!itemId || quantity <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Item ID and positive quantity are required',
        });
    }

    try {
        // Find user and ensure they exist
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Find the item and check stock
        const item = await Item.findById(itemId);
        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        // Find user's cart
        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            console.log(`[CART ADD] No cart found for User: ${userId}. Creating new cart.`);
            cart = new Cart({ user: userId, items: [] });
        }

        const isCustom = customH && customW && customL;

        // --- MODIFIED LOGIC ---
        if (isCustom) {
            // For custom items, ALWAYS add as a new line item. Do not stack.
            console.log(`[CART ADD] Adding new custom item to cart.`);
            cart.items.push({
                item: itemId,
                quantity,
                customH,
                customW,
                customL,
                legsFrameMaterial,
                tabletopMaterial,
                customPrice: req.body.customPrice,
                customizations: req.body.customizations || null,
            });

        } else {
            // For standard items, check if one already exists to stack quantity.
            const existingItemIndex = cart.items.findIndex(i =>
                i.item.toString() === itemId &&
                !i.customH && !i.customW && !i.customL // Ensure it's a standard item
            );

            if (existingItemIndex !== -1) {
                // Update quantity of existing standard item
                const newQuantity = cart.items[existingItemIndex].quantity + quantity;
                if (newQuantity > item.stock) {
                    return res.status(400).json({ success: false, message: `Max Stock Reached! (${item.stock})` });
                }
                cart.items[existingItemIndex].quantity = newQuantity;
                console.log(`[CART ADD] Stacked quantity for standard item. New quantity: ${newQuantity}`);
            } else {
                // Add new standard item
                if (quantity > item.stock) {
                    return res.status(400).json({ success: false, message: `Not enough stock! Available: ${item.stock}` });
                }
                cart.items.push({ item: itemId, quantity });
                console.log(`[CART ADD] Added new standard item to cart.`);
            }
        }

        await cart.save();
        console.log(`[CART ADD] Cart saved successfully for User: ${userId}.`);
        await cart.populate('items.item');

        res.status(200).json({
            success: true,
            message: 'Item added to cart',
            CartData: cart,
        });
    } catch (err) {
        console.error('[CART ADD] Error adding to cart:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error adding item to cart',
            error: err.message,
        });
    }
});


// delete a item from cart
app.delete('/api/cart/:userId/item/:itemId', authenticateToken, async (req, res) => {
    const { userId, itemId } = req.params;

    try {
        // Validate ObjectIds
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: "Invalid user ID format" });
        }
        if (!mongoose.Types.ObjectId.isValid(itemId)) {
            return res.status(400).json({ success: false, message: "Invalid item ID format" });
        }

        // Check if user has permission to modify this cart
        if (req.user.role !== "admin" && req.user.id !== userId) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        // Find user's cart
        const cart = await Cart.findOne({ user: userId });

        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found for user" });
        }

        // Filter out the item
        const initialLength = cart.items.length;
        cart.items = cart.items.filter(i => i.item.toString() !== itemId);

        if (cart.items.length === initialLength) {
            return res.status(404).json({ success: false, message: "Item not found in cart" });
        }

        // Save and return updated cart
        await cart.save();

        // Try to populate, but handle errors gracefully
        try {
            const populatedCart = await cart.populate('items.item');
            res.json({ success: true, message: "Item removed from cart", CartData: populatedCart });
        } catch (populateError) {
            console.error("Error populating cart after deletion:", populateError.message);
            // Return without population if it fails
            res.json({ success: true, message: "Item removed from cart", CartData: cart });
        }

    } catch (err) {
        console.error("Error deleting item from cart:", err.message);
        console.error("Full error:", err);
        res.status(500).json({
            success: false,
            message: "Server error deleting item from cart",
            error: err.message,
            details: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});
// Increase or decrease item quantity in cart
app.put('/api/cart/:userId/item/:itemId/increase', authenticateToken, async (req, res) => {
    const { userId, itemId } = req.params;

    try {
        const cart = await Cart.findOne({ user: userId });

        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

        const cartItem = cart.items.find(i => i.item.toString() === itemId);

        if (!cartItem) {
            return res.status(404).json({ success: false, message: "Item not in cart" });
        }

        cartItem.quantity += 1;

        await cart.save();
        const populated = await cart.populate('items.item');

        res.json({ success: true, message: "Item quantity increased", CartData: populated });

    } catch (err) {
        console.error("Error increasing quantity:", err.message);
        res.status(500).json({ success: false, message: "Server error", error: err.message });
    }
});
// Decrease item quantity in cart
app.put('/api/cart/:userId/item/:itemId/decrease', authenticateToken, async (req, res) => {
    const { userId, itemId } = req.params;

    try {
        const cart = await Cart.findOne({ user: userId });

        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

        const cartItem = cart.items.find(i => i.item.toString() === itemId);

        if (!cartItem) {
            return res.status(404).json({ success: false, message: "Item not in cart" });
        }

        cartItem.quantity -= 1;

        // Remove item if quantity is now 0 or less
        if (cartItem.quantity <= 0) {
            cart.items = cart.items.filter(i => i.item.toString() !== itemId);
        }

        await cart.save();
        const populated = await cart.populate('items.item');

        res.json({ success: true, message: "Item quantity decreased", CartData: populated });

    } catch (err) {
        console.error("Error decreasing quantity:", err.message);
        res.status(500).json({ success: false, message: "Server error", error: err.message });
    }
});



//STOCK MANAGEMENT API---------------------------------------------------

//decrease stock of items
app.post('/api/items/decrease-stock', async (req, res) => {
    try {
        const { items } = req.body; // [{ itemId, quantity }]
        if (!Array.isArray(items)) {
            return res.status(400).json({ success: false, message: 'Invalid items array' });
        }
        for (const entry of items) {
            await Item.findByIdAndUpdate(
                entry.itemId,
                { $inc: { stock: -Math.abs(entry.quantity) } }
            );
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error decreasing stock', error: err.message });
    }
});

// Fetch cart by ID
app.get('/api/cart/:id', authenticateToken, async (req, res) => {
    try {
        const cart = await Cart.findById(req.params.id).populate('items.item');
        if (!cart) {
            return res.status(404).json({ error: "Cart not found" });
        }
        res.json(cart);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

//================================================================
// CATEGORY & FURNITURE TYPE API
//================================================================

// --------- Category Endpoints ---------

// Get all categories (active by default)
app.get('/api/categories', async (req, res) => {
    try {
        const includeInactive = req.query.includeInactive === 'true';
        const filter = includeInactive ? {} : { status: 1 };
        console.log(`[GET /api/categories] includeInactive=${includeInactive}`);
        const categories = await Category.find(filter).sort('name');
        res.json({ success: true, CategoryData: categories });
    } catch (err) {
        console.error('Error fetching categories:', err.message);
        res.status(500).json({ success: false, message: 'Server error fetching categories' });
    }
});

// Create category (admin only)
app.post('/api/categories', authenticateToken, authorizeRoles("admin"), async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

        // Ensure uniqueness
        const exists = await Category.findOne({ name });
        if (exists) return res.status(409).json({ success: false, message: 'Category already exists' });

        const newCategory = new Category({ name });
        await newCategory.save();
        res.status(201).json({ success: true, CategoryData: newCategory });
    } catch (err) {
        console.error('Error creating category:', err.message);
        res.status(500).json({ success: false, message: 'Server error creating category' });
    }
});

// Update category (admin only)
app.put('/api/categories/:id', authenticateToken, authorizeRoles("admin"), async (req, res) => {
    try {
        const { name } = req.body;
        const updated = await Category.findByIdAndUpdate(req.params.id, { name }, { new: true });
        if (!updated) return res.status(404).json({ success: false, message: 'Category not found' });
        res.json({ success: true, CategoryData: updated });
    } catch (err) {
        console.error('Error updating category:', err.message);
        res.status(500).json({ success: false, message: 'Server error updating category' });
    }
});

// Delete category (admin only) with safety check
app.delete('/api/categories/:id', authenticateToken, authorizeRoles("admin"), async (req, res) => {
    try {
        console.log(`🗑️  [Soft-Delete] Disabling Category ${req.params.id}`);
        const updated = await Category.findByIdAndUpdate(
            req.params.id,
            { status: 0 },
            { new: true }
        );
        if (!updated) {
            console.log("⚠️  Category not found – nothing disabled");
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        res.json({ success: true, message: 'Category disabled', CategoryData: updated });
    } catch (err) {
        console.error('Error disabling category:', err.message);
        res.status(500).json({ success: false, message: 'Server error disabling category' });
    }
});

// --------- Furniture Type Endpoints ---------

// Get all furniture types (active by default)
app.get('/api/furnituretypes', async (req, res) => {
    try {
        const includeInactive = req.query.includeInactive === 'true';
        const filter = includeInactive ? {} : { status: 1 };
        console.log(`[GET /api/furnituretypes] includeInactive=${includeInactive}`);
        const types = await FurnitureType.find(filter).sort('name');
        res.json({ success: true, FurnitureTypeData: types });
    } catch (err) {
        console.error('Error fetching furniture types:', err.message);
        res.status(500).json({ success: false, message: 'Server error fetching furniture types' });
    }
});

// Create furniture type (admin only)
app.post('/api/furnituretypes', authenticateToken, authorizeRoles("admin"), async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
        const exists = await FurnitureType.findOne({ name });
        if (exists) return res.status(409).json({ success: false, message: 'Furniture type already exists' });
        const newType = new FurnitureType({ name });
        await newType.save();
        res.status(201).json({ success: true, FurnitureTypeData: newType });
    } catch (err) {
        console.error('Error creating furniture type:', err.message);
        res.status(500).json({ success: false, message: 'Server error creating furniture type' });
    }
});

// Update furniture type
app.put('/api/furnituretypes/:id', authenticateToken, authorizeRoles("admin"), async (req, res) => {
    try {
        const { name } = req.body;
        const updated = await FurnitureType.findByIdAndUpdate(req.params.id, { name }, { new: true });
        if (!updated) return res.status(404).json({ success: false, message: 'Furniture type not found' });
        res.json({ success: true, FurnitureTypeData: updated });
    } catch (err) {
        console.error('Error updating furniture type:', err.message);
        res.status(500).json({ success: false, message: 'Server error updating furniture type' });
    }
});

// Delete furniture type with safety
app.delete('/api/furnituretypes/:id', authenticateToken, authorizeRoles("admin"), async (req, res) => {
    try {
        console.log(`🗑️  [Soft-Delete] Disabling FurnitureType ${req.params.id}`);
        const updated = await FurnitureType.findByIdAndUpdate(
            req.params.id,
            { status: 0 },
            { new: true }
        );
        if (!updated) {
            console.log("⚠️  Furniture type not found – nothing disabled");
            return res.status(404).json({ success: false, message: 'Furniture type not found' });
        }
        res.json({ success: true, message: 'Furniture type disabled', FurnitureTypeData: updated });
    } catch (err) {
        console.error('Error disabling furniture type:', err.message);
        res.status(500).json({ success: false, message: 'Server error disabling furniture type' });
    }
});

//================================================================
// END CATEGORY & FURNITURE TYPE API
//================================================================

// ======================= PSGC GEOLOCATION PROXY ENDPOINTS =======================
app.get('/api/psgc/provinces', async (req, res) => {
    try {
        const { data } = await axios.get('https://psgc.gitlab.io/api/provinces/');
        // Optionally filter Metro Manila (NCR) and Rizal if query param provided
        const { filter } = req.query; // e.g., ?filter=metro
        let provinces = data;
        if (filter === 'metro-rizal') {
            provinces = data.filter(p => ['Metro Manila', 'Rizal'].includes(p.name));
        }
        // Inject synthetic entry for Metro Manila / NCR if not present
        const hasNCR = provinces.some(p => p.code === 'NCR');
        if (!hasNCR) {
            provinces.unshift({ code: 'NCR', name: 'Metro Manila' });
        }
        res.json(provinces);
    } catch (err) {
        console.error('PSGC provinces fetch error:', err.message);
        res.status(500).json({ error: 'Failed to fetch provinces' });
    }
});

app.get('/api/psgc/provinces/:provinceCode/cities', async (req, res) => {
    try {
        const { provinceCode } = req.params;
        const { data } = await axios.get(`https://psgc.gitlab.io/api/provinces/${provinceCode}/cities-municipalities/`);
        res.json(data);
    } catch (err) {
        console.error('PSGC cities fetch error:', err.message);
        res.status(500).json({ error: 'Failed to fetch cities' });
    }
});

app.get('/api/psgc/cities/:cityCode/barangays', async (req, res) => {
    try {
        const { cityCode } = req.params;
        const { data } = await axios.get(`https://psgc.gitlab.io/api/cities-municipalities/${cityCode}/barangays/`);
        res.json(data);
    } catch (err) {
        console.error('PSGC barangays fetch error:', err.message);
        res.status(500).json({ error: 'Failed to fetch barangays' });
    }
});

app.get('/api/psgc/regions/:regionCode/cities', async (req, res) => {
    try {
        const { regionCode } = req.params;
        const { data } = await axios.get(`https://psgc.gitlab.io/api/regions/${regionCode}/cities-municipalities/`);
        res.json(data);
    } catch (err) {
        console.error('PSGC region cities fetch error:', err.message);
        res.status(500).json({ error: 'Failed to fetch region cities' });
    }
});
// ======================= END PSGC GEOLOCATION PROXY ENDPOINTS =======================

// ---- Custom Price Calculation Endpoint ----
app.post('/api/items/:id/calculate-price', async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        if (!item || !item.is_customizable) {
            return res.status(404).json({ message: "Customizable item not found." });
        }

        const { length, width, height, laborDays, materialName3x3, materialName2x12 } = req.body;
        if (!length || !width || !height || !laborDays || !materialName3x3 || !materialName2x12) {
            return res.status(400).json({ message: "Missing required dimension or material information." });
        }

        const mat3 = item.customization_options?.materials?.find(m => m.name === materialName3x3);
        const mat2 = item.customization_options?.materials?.find(m => m.name === materialName2x12);

        if (!mat3 || !mat2) {
            return res.status(400).json({ message: "Selected materials are not available for this item." });
        }

        const costs = {
            labor_cost_per_day: item.customization_options.labor_cost_per_day,
            plank_3x3_cost: mat3.plank_3x3x10_cost,
            plank_2x12_cost: mat2.plank_2x12x10_cost,
            profit_margin: item.customization_options.profit_margin,
            overhead_cost: item.customization_options.overhead_cost,
        };

        const priceDetails = calculateCustomPrice({ length, width, height }, laborDays, costs);
        res.json(priceDetails);
    } catch (error) {
        console.error('Price calculation error:', error);
        res.status(500).json({ message: 'Server error during price calculation.' });
    }
});
// ---- End Custom Price Endpoint ----

// ===================== ACTIVATION ENDPOINTS =====================

// Reactivate item
app.put('/api/items/:id/activate', authenticateToken, authorizeRoles("admin"), async (req, res) => {
    try {
        console.log(`🔄  [Activate] Re-enabling Item ${req.params.id}`);
        const updated = await Item.findByIdAndUpdate(req.params.id, { status: 1 }, { new: true });
        if (!updated) return res.status(404).json({ success: false, message: 'Item not found' });
        res.json({ success: true, message: 'Item activated', ItemData: updated });
    } catch (err) {
        console.error('Error activating item:', err.message);
        res.status(500).json({ success: false, message: 'Server error activating item' });
    }
});

// Reactivate category
app.put('/api/categories/:id/activate', authenticateToken, authorizeRoles("admin"), async (req, res) => {
    try {
        console.log(`🔄  [Activate] Re-enabling Category ${req.params.id}`);
        const updated = await Category.findByIdAndUpdate(req.params.id, { status: 1 }, { new: true });
        if (!updated) return res.status(404).json({ success: false, message: 'Category not found' });
        res.json({ success: true, message: 'Category activated', CategoryData: updated });
    } catch (err) {
        console.error('Error activating category:', err.message);
        res.status(500).json({ success: false, message: 'Server error activating category' });
    }
});

// Reactivate furniture type
app.put('/api/furnituretypes/:id/activate', authenticateToken, authorizeRoles("admin"), async (req, res) => {
    try {
        console.log(`🔄  [Activate] Re-enabling FurnitureType ${req.params.id}`);
        const updated = await FurnitureType.findByIdAndUpdate(req.params.id, { status: 1 }, { new: true });
        if (!updated) return res.status(404).json({ success: false, message: 'Furniture type not found' });
        res.json({ success: true, message: 'Furniture type activated', FurnitureTypeData: updated });
    } catch (err) {
        console.error('Error activating furniture type:', err.message);
        res.status(500).json({ success: false, message: 'Server error activating furniture type' });
    }
});

// Reactivate user
app.put('/api/users/:id/activate', authenticateToken, authorizeRoles("admin"), async (req, res) => {
    try {
        console.log(`🔄  [Activate] Re-enabling User ${req.params.id}`);
        const updatedUser = await User.findByIdAndUpdate(req.params.id, { status: 1 }, { new: true });
        if (!updatedUser) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, message: 'User activated', UserData: updatedUser });
    } catch (err) {
        console.error('Error activating user:', err.message);
        res.status(500).json({ success: false, message: 'Server error activating user' });
    }
});
// =================== END ACTIVATION ENDPOINTS ===================

// ===================== LOG ENDPOINTS =====================

// Get logs with filters (admin only)
app.get('/api/logs', authenticateToken, authorizeRoles("admin"), async (req, res) => {
    try {
        const {
            startDate,
            endDate,
            action,
            entityType,
            userId,
            page = 1,
            limit = 50
        } = req.query;

        const skip = (page - 1) * limit;

        const { logs, total } = await LoggerService.getLogs({
            startDate,
            endDate,
            action,
            entityType,
            userId
        }, {
            limit: parseInt(limit),
            skip: parseInt(skip)
        });

        res.json({
            success: true,
            logs,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });
    } catch (err) {
        console.error('Error fetching logs:', err.message);
        res.status(500).json({ success: false, message: 'Server error fetching logs' });
    }
});

// Get log statistics (admin only)
app.get('/api/logs/stats', authenticateToken, authorizeRoles("admin"), async (req, res) => {
    try {
        const { timeRange = '24h' } = req.query;
        const stats = await LoggerService.getLogStats(timeRange);
        res.json({ success: true, ...stats });
    } catch (err) {
        console.error('Error fetching log stats:', err.message);
        res.status(500).json({ success: false, message: 'Server error fetching log stats' });
    }
});

// =================== END LOG ENDPOINTS ===================

// ... existing code ...

// listen to server
server.listen(process.env.PORT || 5001, () => { //3
    console.log(`Server is running on port ${process.env.PORT || 5001}`);
});


