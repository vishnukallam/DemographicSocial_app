const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const passport = require('passport'); // Import Passport
const bcrypt = require('bcryptjs');
require('./auth/google'); // Import Google Strategy Config

const User = require('./models/User');
const FriendRequest = require('./models/FriendRequest');
const Conversation = require('./models/Conversation');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { validateInterests } = require('./utils/moderation');
const CryptoJS = require("crypto-js");

// Fallback message encryption key
const MESSAGE_SECRET = process.env.MESSAGE_SECRET || 'default_secret_key_12345';

const authRoutes = require('./routes/auth');

// --- Shared CORS Origin Helper ---
function isAllowedOrigin(origin) {
    if (!origin) return true; // Allow server-to-server / same-origin
    const clientUrl = (process.env.CLIENT_URL || '').replace(/\/$/, '');
    const allowedOrigins = [clientUrl, 'http://localhost:5173', 'http://localhost:5000', 'http://localhost:3000'].filter(Boolean);
    if (allowedOrigins.includes(origin) || origin.startsWith('http://localhost')) {
        return true;
    }
    return false;
}

function corsOriginHandler(origin, callback) {
    if (isAllowedOrigin(origin)) {
        return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
}


// --- Global Error Handling to Prevent Crash on Auth Fail ---
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Do not exit process
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    // Do not exit process
});

// --- Database Connection ---
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
    console.error('FATAL: MONGO_URI environment variable is not defined. DB-dependent routes will fail.');
}

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: corsOriginHandler,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        credentials: true
    }
});

if (mongoUri) {
    console.log("Attempting to connect to MongoDB Atlas...");
    mongoose.connect(mongoUri)
        .then(() => console.log('MongoDB Connected'))
        .catch(err => {
            console.error('MongoDB Connection Error:', err.message);
            console.error('The server will remain running but DB-dependent routes will fail.');
        });
}

console.log("CORS allowed for: " + (process.env.CLIENT_URL || '(CLIENT_URL not set — only localhost allowed)'));

// --- Middleware ---
app.use(cors({
    origin: corsOriginHandler,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// Fix for Path-to-Regexp wildcard crash in Express 5+ / new libs
// Using named wildcard '*path' is the standard Express 5 way to match everything
app.options('*path', cors());

app.use(express.json());
app.set('trust proxy', 1); // Required for Render to handle secure cookies correctly
app.use(passport.initialize());

// --- Auth Routes ---

// Explicitly exempt from any global auth middleware (mounted at root level)
app.use('/api/auth', authRoutes);

// --- Auth Middleware (JWT) ---
const requireAuth = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Contains { id: ... }
        req.user.id = decoded.id; // Compatibility alias
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// --- Socket.io Logic ---
// Map<socketId, userId> to track active connections
const socketToUser = new Map();

io.on('connection', (socket) => {
    console.log('New client connected', socket.id);

    socket.on('register_user', async (userId) => {
        if (!userId) return;
        socketToUser.set(socket.id, userId);
        socket.join(userId); // Join a room named after the userId for private messaging
        console.log(`Socket ${socket.id} mapped to User ${userId}`);

        try {
            await User.findByIdAndUpdate(userId, { isActive: true, lastLogin: new Date() });
            io.emit('user_status_change', { userId, isActive: true });
        } catch (err) {
            console.error('Error activating user:', err);
        }

        // Trigger an initial broadcast for this user
        broadcastNearbyUsers(socket, userId);
    });

    socket.on('update_location', async (data) => {
        // data: { lat, lng }
        const userId = socketToUser.get(socket.id);
        if (!userId || !data) return;

        try {
            // Update DB
            await User.findByIdAndUpdate(userId, {
                location: {
                    type: 'Point',
                    coordinates: [data.lng, data.lat]
                },
                lastLogin: new Date()
            });
            // Broadcast new nearby users
            broadcastNearbyUsers(socket, userId);
        } catch (err) {
            console.error('Error updating location:', err);
        }
    });

    socket.on('join_chat', async ({ targetUserId }) => {
        const currentUserId = socketToUser.get(socket.id);
        if (!currentUserId) return;

        try {
            const currentUser = await User.findById(currentUserId);
            const fromName = currentUser ? currentUser.displayName : 'User';

            const roomId = [currentUserId, targetUserId].sort().join('_');
            socket.join(roomId);

            // Find the target user's socket(s)
            io.to(targetUserId).emit('chat_request', {
                from: currentUserId,
                fromName,
                roomId
            });
            socket.emit('chat_joined', { roomId });
        } catch (err) {
            console.error('Error joining chat:', err);
        }
    });

    socket.on('accept_chat', ({ roomId }) => {
        socket.join(roomId);
    });

    socket.on('send_message', async ({ roomId, message, receiverId }) => {
        const userId = socketToUser.get(socket.id);
        if (!userId || !receiverId) return;

        try {
            const senderUser = await User.findById(userId).select('displayName profilePhoto');
            const receiverUser = await User.findById(receiverId).select('displayName profilePhoto');
            const senderName = senderUser ? senderUser.displayName : 'User';

            // Build participant details for root schema (optimization point)
            const pDetails = [
                { userId: userId, displayName: senderName, profilePhoto: senderUser?.profilePhoto || '' },
                { userId: receiverId, displayName: receiverUser?.displayName || 'User', profilePhoto: receiverUser?.profilePhoto || '' }
            ];

            const encryptedContent = CryptoJS.AES.encrypt(message, MESSAGE_SECRET).toString();

            // BOT AUTO-READ
            const isBot = receiverUser?.email?.endsWith('@seed.konnect');
            const initialStatus = isBot ? 'read' : 'sent';
            const initialReadAt = isBot ? new Date() : null;

            const conv = await Conversation.findOneAndUpdate(
                { roomId },
                {
                    $setOnInsert: { participants: [userId, receiverId], participantDetails: pDetails },
                    $push: { messages: { sender: userId, senderName: senderName, receiver: receiverId, content: encryptedContent, status: initialStatus, readAt: initialReadAt } },
                    $set: { lastMessageAt: new Date() }
                },
                { upsert: true, new: true }
            );

            const msg = conv.messages[conv.messages.length - 1];
            // Decrypt local instance to broadcast
            const broadcastMsg = msg.toObject();
            broadcastMsg.content = message;

            // Emit to the room (or specific user if room isn't joined by receiver yet)
            io.to(roomId).emit('receive_message', broadcastMsg);

            // Also emit a notification to the target user (for their friends list)
            io.to(receiverId).emit('message_notification', {
                ...broadcastMsg,
                senderName: senderName
            });

            if (isBot) {
                // Instantly notify sender that bot read it
                socket.emit('messages_read', { roomId, readerId: receiverId, readAt: initialReadAt });
                // Note: The UI usually expects this to update its bubble statuses to "read"
            }
        } catch (err) {
            console.error('Error saving message:', err);
        }
    });

    // Mark messages as read
    socket.on('mark_read', async ({ roomId, senderId }) => {
        const receiverId = socketToUser.get(socket.id);
        if (!receiverId) return;
        try {
            const currentReadAt = new Date();
            await Conversation.updateOne(
                { roomId },
                { $set: { "messages.$[elem].status": "read", "messages.$[elem].readAt": currentReadAt } },
                { arrayFilters: [{ "elem.sender": senderId, "elem.status": { $ne: "read" } }] }
            );
            // Notify sender that messages were read
            io.to(senderId).emit('messages_read', { roomId, readerId: receiverId, readAt: currentReadAt });
        } catch (err) {
            console.error('Error marking messages read:', err);
        }
    });

    socket.on('disconnect', async () => {
        const userId = socketToUser.get(socket.id);
        socketToUser.delete(socket.id);
        console.log('Client disconnected', socket.id);

        if (userId) {
            // Delay slightly to handle page refresh seamlessly
            setTimeout(async () => {
                let stillActive = false;
                for (let [sId, uId] of socketToUser.entries()) {
                    if (uId === userId) {
                        stillActive = true;
                        break;
                    }
                }
                if (!stillActive) {
                    try {
                        await User.findByIdAndUpdate(userId, { isActive: false });
                        io.emit('user_status_change', { userId, isActive: false });
                    } catch (err) {
                        console.error('Error deactivating user:', err);
                    }
                }
            }, 1000); // 1s buffer for reloads
        }
    });

    socket.on('logout', async (userId) => {
        if (!userId) return;
        try {
            await User.findByIdAndUpdate(userId, { isActive: false });
            io.emit('user_status_change', { userId, isActive: false });

            for (let [sId, uId] of socketToUser.entries()) {
                if (uId === userId) {
                    socketToUser.delete(sId);
                    const s = io.sockets.sockets.get(sId);
                    if (s) s.disconnect(true);
                }
            }
        } catch (err) {
            console.error('Error logging out socket:', err);
        }
    });

    socket.on('getting_directions', async ({ targetUserId }) => {
        const currentUserId = socketToUser.get(socket.id);
        if (!currentUserId) return;
        try {
            const currentUser = await User.findById(currentUserId);
            const fromName = currentUser ? currentUser.displayName : 'Someone';
            io.to(targetUserId).emit('directions_alert', {
                fromName,
                message: `${fromName} is getting directions to your location!`
            });
        } catch (err) {
            console.error(err);
        }
    });
});

// --- New API Routes for Dynamic Discovery ---

// Block features
app.get('/api/users/blocked', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('blockedUsers', 'displayName email profilePhoto bio');
        res.json(user.blockedUsers || []);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/users/block', requireAuth, async (req, res) => {
    try {
        const { targetId } = req.body;
        if (!targetId) return res.status(400).json({ error: 'User ID required' });

        // Block + unfriend both ways
        await User.findByIdAndUpdate(req.user.id, { $addToSet: { blockedUsers: targetId }, $pull: { friends: targetId } });
        await User.findByIdAndUpdate(targetId, { $pull: { friends: req.user.id } });

        // Clean any pending requests
        await FriendRequest.deleteMany({
            $or: [{ from: req.user.id, to: targetId }, { from: targetId, to: req.user.id }]
        });

        // Immediately enforce the block in exactly the connected UI components of both users
        io.to(targetId).emit('user_removed', { userId: req.user.id }); // Tell target to remove blocker
        io.to(req.user.id).emit('user_removed', { userId: targetId }); // Tell blocker to remove target

        res.json({ message: 'User blocked.' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/users/unblock', requireAuth, async (req, res) => {
    try {
        const { targetId } = req.body;
        await User.findByIdAndUpdate(req.user.id, { $pull: { blockedUsers: targetId } });
        res.json({ message: 'User unblocked.' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Nearby Users (Dynamic Radius)
// ---------------------------------------------------------------------------
// DEMOGRAPHIC MATCHING ENDPOINT (Replicates GNN model logic in JS)
// Logic: Return only users within 20km radius who share >= 1 interest
//        with the current user. This mirrors the notebook's matching:
//        has_edge = (distance <= threshold) && (shared_interests > 0)
// ---------------------------------------------------------------------------
app.get('/api/users/nearby', requireAuth, async (req, res) => {
    try {
        const { lat, lng } = req.query;
        const userId = req.user.id;

        if (!lat || !lng || isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) {
            return res.status(400).json({ error: 'Valid Latitude and Longitude required' });
        }

        // Get current user's interests + friends list + blocks
        const currentUser = await User.findById(userId).select('interests friends blockedUsers');
        const myInterests = (currentUser?.interests || []).map(i => i.toLowerCase().trim());
        const myFriends = (currentUser?.friends || []).map(f => f.toString());
        const myBlocked = (currentUser?.blockedUsers || []).map(b => b.toString());

        if (myInterests.length === 0) {
            return res.json([]);
        }

        const usersBlockingMe = await User.find({ blockedUsers: userId }).select('_id');
        const blockedByOthers = usersBlockingMe.map(u => u._id.toString());
        const excludeIds = [...new Set([...myBlocked, ...blockedByOthers, userId])];

        const MATCH_RADIUS_METERS = 20000;

        const nearbyUsers = await User.find({
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(lng), parseFloat(lat)]
                    },
                    $maxDistance: MATCH_RADIUS_METERS
                }
            },
            'location.coordinates': { $ne: [0, 0] },
            _id: { $nin: excludeIds },
            interests: { $exists: true, $ne: [] }
        }).select('displayName email interests location profilePhoto bio lastLogin isActive');

        // Get pending friend requests for UI state
        const sentRequests = await FriendRequest.find({ from: userId, status: 'pending' }).select('to').lean();
        const receivedRequests = await FriendRequest.find({ to: userId, status: 'pending' }).select('from').lean();
        const sentToIds = sentRequests.map(r => r.to.toString());
        const receivedFromIds = receivedRequests.map(r => r.from.toString());

        const matchedUsers = nearbyUsers
            .map(u => {
                const obj = u.toObject();
                const uid = u._id.toString();
                const theirInterests = (obj.interests || []).map(i => i.toLowerCase().trim());
                const sharedInterests = myInterests.filter(i => theirInterests.includes(i));
                if (sharedInterests.length === 0) return null;

                const isFriend = myFriends.includes(uid);
                const isOnlineRaw = !!((io.sockets.adapter.rooms.get(uid)?.size || 0) > 0) || !!obj.isActive || !!(obj.email && obj.email.endsWith('@seed.konnect'));

                return {
                    ...obj,
                    isOnline: isFriend ? isOnlineRaw : null,
                    isFriend,
                    friendRequestSent: sentToIds.includes(uid),
                    friendRequestReceived: receivedFromIds.includes(uid),
                    sharedInterests,
                    matchScore: sharedInterests.length
                };
            })
            .filter(Boolean)
            .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

        res.json(matchedUsers);
    } catch (err) {
        console.error("Failed to fetch nearby users", err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Discover People (50 Nearest Users -> Sorted by Interest Match)
app.get('/api/users/discover', requireAuth, async (req, res) => {
    try {
        const { lat, lng } = req.query;
        const userId = req.user.id;

        if (!lat || !lng) {
            return res.json([]); // Need location for "nearest"
        }

        const currentUser = await User.findById(userId).select('interests friends blockedUsers');
        const myInterests = (currentUser?.interests || []).map(i => i.toLowerCase().trim());
        const myFriends = (currentUser?.friends || []).map(f => f.toString());
        const myBlocked = (currentUser?.blockedUsers || []).map(b => b.toString());

        const usersBlockingMe = await User.find({ blockedUsers: userId }).select('_id');
        const blockedByOthers = usersBlockingMe.map(u => u._id.toString());
        const excludeIdsObj = [...new Set([...myBlocked, ...blockedByOthers, userId])].map(id => new mongoose.Types.ObjectId(id));

        // 1. Gather 50 users near the user (sorted by distance by default)
        const nearestUsers = await User.aggregate([
            {
                $geoNear: {
                    near: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
                    distanceField: "dist.calculated",
                    maxDistance: 10000000, // Large radius (10,000 km) to just get "nearest"
                    query: {
                        _id: { $nin: excludeIdsObj },
                        'location.coordinates': { $ne: [0, 0] }
                    },
                    spherical: true
                }
            },
            { $limit: 50 }, // Take top 50 closest
            {
                $project: {
                    displayName: 1,
                    email: 1,
                    interests: 1,
                    location: 1,
                    profilePhoto: 1,
                    bio: 1,
                    lastLogin: 1,
                    isActive: 1,
                    dist: 1
                }
            }
        ]);

        const sentRequests = await FriendRequest.find({ from: userId, status: 'pending' }).select('to').lean();
        const receivedRequests = await FriendRequest.find({ to: userId, status: 'pending' }).select('from').lean();
        const sentToIds = sentRequests.map(r => r.to.toString());
        const receivedFromIds = receivedRequests.map(r => r.from.toString());

        // 2. Sort by highest number of matching interests
        const discoveredUsers = nearestUsers.map(u => {
            const uid = u._id.toString();
            const theirInterests = (u.interests || []).map(i => i.toLowerCase().trim());
            const sharedInterests = myInterests.filter(i => theirInterests.includes(i));
            const isFriend = myFriends.includes(uid);
            const isOnlineRaw = !!((io.sockets.adapter.rooms.get(uid)?.size || 0) > 0) || !!u.isActive || !!(u.email && u.email.endsWith('@seed.konnect'));

            return {
                ...u,
                isOnline: isFriend ? isOnlineRaw : null,
                isFriend,
                friendRequestSent: sentToIds.includes(uid),
                friendRequestReceived: receivedFromIds.includes(uid),
                sharedInterests,
                matchScore: sharedInterests.length
            };
        }).sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

        res.json(discoveredUsers);

    } catch (err) {
        console.error("Failed to fetch discover users", err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Temporary Seeding Route (Protected by simple secret)
app.get('/api/admin/seed', async (req, res) => {
    const { secret } = req.query;
    if (secret !== 'KONNECT_SECRET_SEED') {
        return res.status(403).json({ error: 'Unauthorized access to seeding' });
    }

    try {
        console.log('Starting remote seeding (Land Only)...');
        const bcrypt = require('bcryptjs');

        // Clear existing seed users
        await User.deleteMany({ email: { $regex: /@example\.com$/ } });
        console.log('Cleared previous seed users');

        // Andhra Pradesh Bounding Box
        const LAT_MIN = 12.5;
        const LAT_MAX = 19.0;
        const LNG_MIN = 77.0;
        const LNG_MAX = 84.5;

        const NAMES = [
            "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan",
            "Diya", "Saanvi", "Aditi", "Myra", "Ananya", "Pari", "Riya", "Aarya", "Anika", "Navya",
            "Ganesh", "Ravi", "Suresh", "Ramesh", "Lakshmi", "Venkatesh", "Srinivas", "Nagarjuna", "Chiranjeevi", "Pawan",
            "Mahesh", "Prabhas", "Allu", "Ram", "NTR", "Vijay", "Samantha", "Kajal", "Tamannaah", "Rashmika"
        ];

        // Use canonical interests list (same source as validation + API)
        const SEED_INTERESTS = require('./config/Interests.json');

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);

        const users = [];

        for (let i = 0; i < 80; i++) {
            const name = NAMES[Math.floor(Math.random() * NAMES.length)] + " " + NAMES[Math.floor(Math.random() * NAMES.length)];

            // Random Interests
            const numInterests = Math.floor(Math.random() * 4) + 1;
            const shuffled = [...SEED_INTERESTS].sort(() => 0.5 - Math.random());
            const selectedInterests = shuffled.slice(0, numInterests);

            // Random Location in AP Box
            const lat = LAT_MIN + Math.random() * (LAT_MAX - LAT_MIN);
            const lng = LNG_MIN + Math.random() * (LNG_MAX - LNG_MIN);

            users.push({
                googleId: `remote_seed_${i}_${Date.now()}`,
                displayName: name,
                email: `user${i}_${Date.now()}@konnect.com`,
                password: hashedPassword,
                profilePhoto: `https://ui-avatars.com/api/?name=${name.replace(' ', '+')}&background=random`,
                bio: "Generated User from AP Region",
                interests: selectedInterests,
                lastLogin: new Date(),
                location: {
                    type: "Point",
                    coordinates: [lng, lat]
                }
            });
        }

        await User.insertMany(users);
        res.json({ message: `Seeded ${users.length} users in Andhra Pradesh region!` });

    } catch (err) {
        console.error('Seeding failed:', err);
        res.status(500).json({ error: 'Seeding failed', details: err.message });
    }
});

// Get Global Users (For when no one is nearby or explicit global search)
// Global view — still shows all users but marks interest matches
app.get('/api/users/global', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const currentUser = await User.findById(userId).select('interests friends blockedUsers');
        const myInterests = (currentUser?.interests || []).map(i => i.toLowerCase().trim());
        const myFriends = (currentUser?.friends || []).map(f => f.toString());
        const myBlocked = (currentUser?.blockedUsers || []).map(b => b.toString());

        const usersBlockingMe = await User.find({ blockedUsers: userId }).select('_id');
        const blockedByOthers = usersBlockingMe.map(u => u._id.toString());
        const excludeIds = [...new Set([...myBlocked, ...blockedByOthers, userId])];

        const globalUsers = await User.find({
            _id: { $nin: excludeIds },
            'location.coordinates': { $ne: [0, 0] },
            interests: { $exists: true, $ne: [] }
        })
            .sort({ lastLogin: -1 })
            .limit(500)
            .select('displayName email interests location profilePhoto bio lastLogin isActive');

        const sentRequests = await FriendRequest.find({ from: userId, status: 'pending' }).select('to').lean();
        const receivedRequests = await FriendRequest.find({ to: userId, status: 'pending' }).select('from').lean();
        const sentToIds = sentRequests.map(r => r.to.toString());
        const receivedFromIds = receivedRequests.map(r => r.from.toString());

        const usersWithMatch = globalUsers.map(u => {
            const obj = u.toObject();
            const uid = u._id.toString();
            const theirInterests = (obj.interests || []).map(i => i.toLowerCase().trim());
            const sharedInterests = myInterests.filter(i => theirInterests.includes(i));
            const isFriend = myFriends.includes(uid);
            const isOnlineRaw = !!((io.sockets.adapter.rooms.get(uid)?.size || 0) > 0) || !!obj.isActive || !!(obj.email && obj.email.endsWith('@seed.konnect'));

            return {
                ...obj,
                isOnline: isFriend ? isOnlineRaw : null,
                isFriend,
                friendRequestSent: sentToIds.includes(uid),
                friendRequestReceived: receivedFromIds.includes(uid),
                sharedInterests,
                matchScore: sharedInterests.length
            };
        })
            // Sort: friends first, then by matchScore descending
            .sort((a, b) => {
                if (a.isFriend !== b.isFriend) return b.isFriend ? 1 : -1;
                return b.matchScore - a.matchScore;
            });

        res.json(usersWithMatch);
    } catch (err) {
        console.error('Error fetching global users:', err);
        res.status(500).json({ error: 'Server error' });
    }
});


async function broadcastNearbyUsers(socket, userId) {
    // Deprecated in favor of REST API for map polling/radius, 
    // but kept for initial socket connection if needed.
    // For now, doing nothing to avoid conflicting with the new frontend logic
    // which handles fetching data via API.
}


// --- Routes ---
// Health Check for Render
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.get('/api/current_user', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const userObj = user.toObject();
        userObj.hasPassword = !!userObj.password;
        delete userObj.password; // Ensure password isn't leaked
        res.json(userObj);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// User Updates - Protected
app.post('/api/user/profile', requireAuth, async (req, res) => {
    try {
        const { displayName, bio, profilePhoto } = req.body;
        const updateData = {};
        if (displayName) updateData.displayName = displayName;
        if (bio !== undefined) updateData.bio = bio;
        if (profilePhoto) updateData.profilePhoto = profilePhoto;

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            updateData,
            { new: true }
        );
        const userObj = updatedUser.toObject();
        userObj.hasPassword = !!userObj.password;
        delete userObj.password;

        res.json(userObj);
    } catch (err) {
        console.error('Error updating profile:', err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

app.post('/api/user/setup-password', requireAuth, async (req, res) => {
    try {
        const { password } = req.body;
        if (!password || password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();

        const userObj = user.toObject();
        userObj.hasPassword = true;
        delete userObj.password;
        res.json(userObj);
    } catch (err) {
        console.error('Error setting password:', err);
        res.status(500).json({ error: 'Failed to set password' });
    }
});

// Update User Location (REST)
app.post('/api/user/location', requireAuth, async (req, res) => {
    try {
        const { lat, lng } = req.body;
        if (!lat || !lng) {
            return res.status(400).json({ error: 'Latitude and Longitude required' });
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            {
                location: {
                    type: 'Point',
                    coordinates: [parseFloat(lng), parseFloat(lat)]
                },
                lastLogin: new Date()
            },
            { new: true }
        ).select('-password');

        res.json(updatedUser);
    } catch (err) {
        console.error('Error updating location via REST:', err);
        res.status(500).json({ error: 'Failed to update location' });
    }
});

const STANDARD_INTERESTS = require('./config/Interests.json');

// Save user interests + persist custom ones to MongoDB
app.post('/api/user/interests', requireAuth, async (req, res) => {
    try {
        const { interests } = req.body; // Array of strings

        if (!interests || !Array.isArray(interests)) {
            return res.status(400).json({ error: 'Interests must be an array' });
        }

        // Must have at least 1 interest
        if (interests.length === 0) {
            return res.status(400).json({ error: 'At least one interest is required' });
        }

        // Helper to capitalize custom interests
        const capitalizeWords = (str) => {
            return str.split(' ').filter(Boolean).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
        };

        // Sanitize: trim whitespace, remove empties, cap at 20
        let sanitized = interests
            .map(i => (typeof i === 'string' ? i.trim() : ''))
            .filter(Boolean)
            .slice(0, 20);

        const moderationResult = validateInterests(sanitized);
        if (!moderationResult.valid) {
            const user = await User.findById(req.user.id);
            if (!user) return res.status(404).json({ error: 'User not found' });

            const currentStrikes = (user.moderationStrikes || 0) + 1;
            user.moderationStrikes = currentStrikes;
            await user.save();

            if (currentStrikes >= 6) {
                const userId = user._id;
                await User.updateMany({ friends: userId }, { $pull: { friends: userId } });
                await FriendRequest.deleteMany({ $or: [{ from: userId }, { to: userId }] });
                await User.findByIdAndDelete(userId);
                io.emit('user_removed', { userId });
                return res.status(403).json({
                    error: 'Account terminated due to repeated community guidelines violations.',
                    code: 'ACCOUNT_DELETED'
                });
            }

            const safeInterests = sanitized.filter(i => !moderationResult.flagged.includes(i));
            return res.status(400).json({
                error: `Inappropriate interests blocked: ${moderationResult.flagged.join(', ')}. You have ${6 - currentStrikes} warnings remaining before account termination.`,
                code: 'MODERATION_WARNING',
                safeInterests
            });
        }

        const finalizedInterests = [];
        const standardLower = STANDARD_INTERESTS.map(s => s.toLowerCase());

        for (let name of sanitized) {
            const lowerName = name.toLowerCase();
            const baseIndex = standardLower.indexOf(lowerName);

            if (baseIndex !== -1) {
                // Use Standard Interest exactly as defined
                finalizedInterests.push(STANDARD_INTERESTS[baseIndex]);
            } else {
                // Custom interest, just capitalize each word
                const capitalized = capitalizeWords(name);
                finalizedInterests.push(capitalized);
            }
        }

        // Deduplicate locally
        const uniqueFinalized = [...new Set(finalizedInterests)];

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { interests: uniqueFinalized },
            { new: true }
        ).select('-password');
        res.send(updatedUser);
    } catch (err) {
        console.error('Error updating interests:', err);
        res.status(500).send(err);
    }
});

// Interests API — serves ONLY 12 standard (Custom interests loaded locally via peers/friends profiles)
console.log(`Standard interests loaded: ${STANDARD_INTERESTS.length} items`);

app.get('/api/interests', requireAuth, async (req, res) => {
    try {
        res.json(STANDARD_INTERESTS);
    } catch (err) {
        console.error('Error fetching interests:', err);
        // Fallback to standard only if DB fails
        res.json(STANDARD_INTERESTS);
    }
});

// Change Password
app.post('/api/user/change-password', requireAuth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Please provide both current and new passwords' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Verify current password
        const isMatch = await require('bcryptjs').compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Incorrect current password' });
        }

        // Hash new password
        const salt = await require('bcryptjs').genSalt(10);
        user.password = await require('bcryptjs').hash(newPassword, salt);
        await user.save();

        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error("Password update error:", err);
        res.status(500).json({ error: 'Failed to update password' });
    }
});

// Delete Account
app.delete('/api/user/delete', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        // Remove user from all friends lists
        await User.updateMany({ friends: userId }, { $pull: { friends: userId } });
        // Remove all friend requests involving this user
        await FriendRequest.deleteMany({ $or: [{ from: userId }, { to: userId }] });
        await User.findByIdAndDelete(userId);

        // Notify all online clients that this user is entirely gone
        io.emit('user_removed', { userId });

        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error("Delete user error:", err);
        res.status(500).json({ error: 'Failed to delete account' });
    }
});

// ---------------------------------------------------------------------------
// FRIEND REQUEST SYSTEM
// ---------------------------------------------------------------------------

// Send a friend request
app.post('/api/friend-request/send', requireAuth, async (req, res) => {
    try {
        const fromId = req.user.id;
        const { toUserId } = req.body;

        if (!toUserId) return res.status(400).json({ error: 'Target user ID required' });
        if (fromId === toUserId) return res.status(400).json({ error: 'Cannot send request to yourself' });

        // Check if target user exists
        const targetUser = await User.findById(toUserId);
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        // Check if already friends
        const currentUser = await User.findById(fromId).select('friends displayName');
        if (currentUser.friends.map(f => f.toString()).includes(toUserId)) {
            return res.status(400).json({ error: 'Already friends' });
        }

        // Check for existing request in either direction
        const existing = await FriendRequest.findOne({
            $or: [
                { from: fromId, to: toUserId },
                { from: toUserId, to: fromId }
            ],
            status: 'pending'
        });

        if (existing) {
            // If THEY already sent us a request, auto-accept it
            if (existing.from.toString() === toUserId) {
                existing.status = 'accepted';
                await existing.save();
                // Add each other as friends
                await User.findByIdAndUpdate(fromId, { $addToSet: { friends: toUserId } });
                await User.findByIdAndUpdate(toUserId, { $addToSet: { friends: fromId } });

                // Notify the other user
                io.to(toUserId).emit('friend_request_accepted', {
                    fromId,
                    fromName: currentUser.displayName,
                    message: `${currentUser.displayName} accepted your friend request.`
                });

                return res.json({ message: 'Friend request auto-accepted! You are now friends.', status: 'accepted' });
            }
            return res.status(400).json({ error: 'Friend request already sent' });
        }

        // Check if previously rejected — allow resending
        const rejected = await FriendRequest.findOne({ from: fromId, to: toUserId, status: 'rejected' });
        if (rejected) {
            rejected.status = 'pending';
            await rejected.save();
            return res.json({ message: 'Friend request re-sent', status: 'pending' });
        }

        // BOT AUTO-ACCEPT FEATURE
        if (targetUser.email && targetUser.email.endsWith('@seed.konnect')) {
            await User.findByIdAndUpdate(fromId, { $addToSet: { friends: toUserId } });
            await User.findByIdAndUpdate(toUserId, { $addToSet: { friends: fromId } });
            return res.json({ message: 'Friend request auto-accepted by bot! You are now friends.', status: 'accepted' });
        }

        await FriendRequest.create({
            from: fromId,
            fromName: currentUser.displayName,
            to: toUserId,
            toName: targetUser.displayName
        });

        // Notify target user
        io.to(toUserId).emit('friend_request_notification', {
            fromId,
            fromName: currentUser.displayName,
            message: `${currentUser.displayName} sent you a friend request!`
        });

        res.json({ message: 'Friend request sent', status: 'pending' });
    } catch (err) {
        console.error('Friend request send error:', err);
        if (err.code === 11000) return res.status(400).json({ error: 'Request already exists' });
        res.status(500).json({ error: 'Failed to send friend request' });
    }
});

// Accept a friend request
app.post('/api/friend-request/accept', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { requestId } = req.body;

        const request = await FriendRequest.findById(requestId);
        if (!request) return res.status(404).json({ error: 'Request not found' });
        if (request.to.toString() !== userId) return res.status(403).json({ error: 'Not your request to accept' });
        if (request.status !== 'pending') return res.status(400).json({ error: 'Request is no longer pending' });

        request.status = 'accepted';
        await request.save();

        // Add each other as friends (bidirectional)
        await User.findByIdAndUpdate(userId, { $addToSet: { friends: request.from } });
        await User.findByIdAndUpdate(request.from, { $addToSet: { friends: userId } });

        const currentUser = await User.findById(userId).select('displayName');
        io.to(request.from.toString()).emit('friend_request_accepted', {
            fromId: userId,
            fromName: currentUser.displayName,
            message: `${currentUser.displayName} accepted your friend request.`
        });

        res.json({ message: 'Friend request accepted' });
    } catch (err) {
        console.error('Friend request accept error:', err);
        res.status(500).json({ error: 'Failed to accept request' });
    }
});

// Reject a friend request
app.post('/api/friend-request/reject', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { requestId } = req.body;

        const request = await FriendRequest.findById(requestId);
        if (!request) return res.status(404).json({ error: 'Request not found' });
        if (request.to.toString() !== userId) return res.status(403).json({ error: 'Not your request to reject' });
        if (request.status !== 'pending') return res.status(400).json({ error: 'Request is no longer pending' });

        request.status = 'rejected';
        await request.save();

        const currentUser = await User.findById(userId).select('displayName');
        io.to(request.from.toString()).emit('friend_request_rejected', {
            fromId: userId,
            fromName: currentUser.displayName,
            message: `${currentUser.displayName} declined your friend request.`
        });

        res.json({ message: 'Friend request rejected' });
    } catch (err) {
        console.error('Friend request reject error:', err);
        res.status(500).json({ error: 'Failed to reject request' });
    }
});

// Cancel a sent friend request
app.post('/api/friend-request/cancel', requireAuth, async (req, res) => {
    try {
        const { toUserId } = req.body;
        if (!toUserId) return res.status(400).json({ error: 'toUserId is required' });

        const request = await FriendRequest.findOneAndDelete({
            from: req.user.id,
            to: toUserId,
            status: 'pending'
        });

        if (!request) {
            return res.status(404).json({ error: 'Friend request not found or already processed' });
        }

        res.json({ message: 'Friend request cancelled' });
    } catch (err) {
        console.error('Cancel friend request error:', err);
        res.status(500).json({ error: 'Failed to cancel friend request' });
    }
});

// Get pending incoming friend requests
app.get('/api/friend-requests/pending', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const pending = await FriendRequest.find({ to: userId, status: 'pending' })
            .populate('from', 'displayName email profilePhoto bio interests')
            .sort({ createdAt: -1 });
        res.json(pending);
    } catch (err) {
        console.error('Fetch pending requests error:', err);
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
});

// Get friends list
app.get('/api/friends', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate('friends', 'displayName email profilePhoto bio interests location lastLogin isActive');

        const friendsList = (user?.friends || []).map(f => {
            const obj = f.toObject();
            return {
                ...obj,
                isOnline: !!((io.sockets.adapter.rooms.get(f._id.toString())?.size || 0) > 0) || !!obj.isActive || !!(obj.email && obj.email.endsWith('@seed.konnect'))
            };
        });

        res.json(friendsList);
    } catch (err) {
        console.error('Fetch friends error:', err);
        res.status(500).json({ error: 'Failed to fetch friends' });
    }
});

// Remove a friend (unfriend)
app.delete('/api/friends/:friendId', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const friendId = req.params.friendId;
        if (!friendId) return res.status(400).json({ error: 'Friend ID required' });

        // Remove from both users' friends arrays
        await User.findByIdAndUpdate(userId, { $pull: { friends: friendId } });
        await User.findByIdAndUpdate(friendId, { $pull: { friends: userId } });

        // Clean up the friend request record
        await FriendRequest.deleteMany({
            $or: [
                { from: userId, to: friendId },
                { from: friendId, to: userId }
            ]
        });

        res.json({ message: 'Friend removed' });
    } catch (err) {
        console.error('Remove friend error:', err);
        res.status(500).json({ error: 'Failed to remove friend' });
    }
});

// --- Chat API Routes ---
app.get('/api/messages/:roomId', requireAuth, async (req, res) => {
    try {
        const { roomId } = req.params;
        const conv = await Conversation.findOne({ roomId });
        const messages = conv ? conv.messages : [];

        // Mark as read if the current user is the receiver
        if (conv) {
            let hasChanges = false;
            conv.messages.forEach(msg => {
                if (msg.receiver.toString() === req.user.id && msg.status !== 'read') {
                    msg.status = 'read';
                    msg.readAt = new Date();
                    hasChanges = true;
                }
            });
            if (hasChanges) {
                await conv.save();
            }
        }

        const decryptedMessages = messages.map(msg => {
            const msgObj = msg.toObject ? msg.toObject() : msg;
            try {
                const bytes = CryptoJS.AES.decrypt(msgObj.content, MESSAGE_SECRET);
                msgObj.content = bytes.toString(CryptoJS.enc.Utf8);
            } catch (err) {
                console.error("Decryption err:", err);
                msgObj.content = "Message unavailable";
            }
            return msgObj;
        });

        res.json(decryptedMessages);
    } catch (err) {
        console.error('Fetch messages error:', err);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

app.get('/api/messages/unread/count', requireAuth, async (req, res) => {
    try {
        const unreadCounts = await Conversation.aggregate([
            { $match: { participants: new mongoose.Types.ObjectId(req.user.id) } },
            { $unwind: "$messages" },
            { $match: { "messages.receiver": new mongoose.Types.ObjectId(req.user.id), "messages.status": { $ne: "read" } } },
            { $group: { _id: "$messages.sender", count: { $sum: 1 } } }
        ]);

        const formattedCounts = {};
        unreadCounts.forEach(item => {
            formattedCounts[item._id.toString()] = item.count;
        });

        res.json(formattedCounts);
    } catch (err) {
        console.error('Fetch unread counts error:', err);
        res.status(500).json({ error: 'Failed to fetch unread counts' });
    }
});

// --- Stats Route ---
app.get('/api/stats/local', requireAuth, async (req, res) => {
    try {
        let { lat, lng } = req.query;
        const userId = req.user.id;

        // If no coords provided, try to use user's stored location
        if (!lat || !lng) {
            const currentUser = await User.findById(userId);
            if (currentUser && currentUser.location && currentUser.location.coordinates) {
                lng = currentUser.location.coordinates[0];
                lat = currentUser.location.coordinates[1];
            }
        }

        // If still no coords or invalid, return zeros early to prevent crash
        if (!lat || !lng || isNaN(parseFloat(lat)) || isNaN(parseFloat(lng)) || (parseFloat(lat) === 0 && parseFloat(lng) === 0)) {
            return res.json({ activeNearby: 0, matchedInterestsNearby: 0 });
        }

        const centerCoords = [parseFloat(lng), parseFloat(lat)];
        const maxDistance = 20000; // 20km

        // Get current user with friends list
        const currentUser = await User.findById(userId).select('interests friends');
        const userInterests = currentUser.interests || [];
        const userFriends = currentUser.friends || [];

        // 1. Friends Online Nearby (mutual friends within 20km)
        // Seed bots (emails ending @konnect.com or @seed.konnect) are always counted as active
        let activeNearby = 0;
        if (userFriends.length > 0) {
            const result = await User.aggregate([
                {
                    $geoNear: {
                        near: { type: 'Point', coordinates: centerCoords },
                        distanceField: "dist.calculated",
                        maxDistance: maxDistance,
                        query: {
                            _id: { $in: userFriends },
                            'location.coordinates': { $ne: [0, 0] }
                        },
                        spherical: true
                    }
                },
                {
                    $match: {
                        $or: [
                            // Real users active within last 24h
                            { lastLogin: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
                            // Seed bots always count as active
                            { email: { $regex: /@konnect\.com$/ } },
                            { email: { $regex: /@seed\.konnect$/ } }
                        ]
                    }
                },
                { $count: "count" }
            ]);
            activeNearby = result[0]?.count || 0;
        }

        // 2. Matched Interests Count (distinct interests from user profile shared by nearby users)
        let matchedInterestsNearby = 0;
        if (userInterests.length > 0) {
            const result = await User.aggregate([
                {
                    $geoNear: {
                        near: { type: 'Point', coordinates: centerCoords },
                        distanceField: "dist.calculated",
                        maxDistance: maxDistance,
                        query: {
                            _id: { $ne: new mongoose.Types.ObjectId(userId) }, // Exclude self
                            'location.coordinates': { $ne: [0, 0] },
                            interests: { $in: userInterests }
                        },
                        spherical: true
                    }
                },
                { $unwind: "$interests" },
                { $match: { interests: { $in: userInterests } } },
                { $group: { _id: "$interests" } },
                { $count: "count" }
            ]);
            matchedInterestsNearby = result[0]?.count || 0;
        }

        // 3. Trending Near You (20km Radius, not intersecting with user profile)
        const pulseDistance = 20000; // 20km
        const topInterestsRaw = await User.aggregate([
            {
                $geoNear: {
                    near: { type: 'Point', coordinates: centerCoords },
                    distanceField: "dist.calculated",
                    maxDistance: pulseDistance,
                    query: {
                        'location.coordinates': { $ne: [0, 0] },
                        isActive: { $ne: false },
                        _id: { $ne: new mongoose.Types.ObjectId(userId) } // Exclude self
                    },
                    spherical: true
                }
            },
            { $unwind: "$interests" },
            { $group: { _id: "$interests", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);
        const topInterests = topInterestsRaw.map(i => ({ category: i._id, count: i.count }));

        res.json({ activeNearby, matchedInterestsNearby, topInterests });

    } catch (err) {
        console.error('Stats error:', err);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
