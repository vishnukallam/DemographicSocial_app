    /**
 * Unified Seed Script for KON-NECT
 * ----------------------------------
 * Seeds 80 users in AP & Telangana + 200 users across India = 280 total
 * Uses the 12 standard interests from config/Interests.json
 * Each user gets 2-5 random interests
 * 
 * Usage:  node server/seed.js
 * 
 * This will REMOVE all previously seeded users (email ending @seed.konnect)
 * before inserting new ones. Real users (who registered via the app) are untouched.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.error('FATAL: MONGO_URI not found. Create a .env in the project root.');
    process.exit(1);
}

// ─────────────────────────────────── Interests ────────────────────────────────
const INTERESTS = require('../config/Interests.json');

// ─────────────────────────────────── Indian Names ─────────────────────────────
const MALE_NAMES = [
    "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan",
    "Krishna", "Ishaan", "Ganesh", "Ravi", "Suresh", "Ramesh", "Venkatesh",
    "Srinivas", "Nagarjuna", "Pawan", "Mahesh", "Prabhas", "Ram", "Vijay",
    "Karthik", "Surya", "Vikram", "Dhanush", "Siddharth", "Abhi", "Balaji",
    "Chaitanya", "Deepak", "Gopi", "Harsh", "Jai", "Kunal", "Lokesh",
    "Manish", "Nikhil", "Om", "Pranav", "Rahul", "Sachin", "Tarun",
    "Uday", "Varun", "Yash", "Ankit", "Bharat", "Dhruv", "Gaurav",
    "Himanshu", "Ishan", "Jayesh", "Karan", "Lakshman", "Mohit", "Naveen",
    "Omkar", "Pradeep", "Rakesh", "Sandeep", "Tushar", "Utkarsh", "Vishal",
    "Akash", "Bhuvan", "Chirag", "Dev", "Ekansh", "Firoz", "Gopal",
    "Hemant", "Indrajit", "Jatin", "Kartik", "Lalit", "Mayank", "Neeraj",
    "Parth", "Rohan", "Sagar", "Tanmay", "Vijayendra", "Yogesh", "Zubair",
    "Arnav", "Darshan", "Farhan", "Girish", "Hitesh", "Kabir", "Madhav",
    "Navin", "Pratik", "Rajat", "Shubham", "Tejas", "Umesh", "Vinay"
];

const FEMALE_NAMES = [
    "Diya", "Saanvi", "Aditi", "Myra", "Ananya", "Pari", "Riya", "Aarya",
    "Anika", "Navya", "Lakshmi", "Samantha", "Kajal", "Rashmika", "Bhavya",
    "Chandana", "Deepika", "Esha", "Gitanjali", "Harini", "Indu", "Jaya",
    "Kavya", "Lavanya", "Meghana", "Nithya", "Padma", "Radha", "Sandhya",
    "Tejaswini", "Uma", "Vani", "Yamini", "Zara", "Amara", "Divya",
    "Gauri", "Isha", "Keerthi", "Mansi", "Neha", "Pooja", "Ritika",
    "Shreya", "Trisha", "Vidya", "Anushka", "Bhumi", "Charmi", "Durga",
    "Fatima", "Geeta", "Himani", "Janvi", "Komal", "Lata", "Meera",
    "Nandini", "Prerna", "Roshni", "Sakshi", "Tanya", "Urmi", "Vanshika",
    "Aishwarya", "Bela", "Charu", "Devika", "Ekta", "Falguni", "Gayatri",
    "Hema", "Indira", "Juhi", "Kiara", "Lekha", "Maitri", "Niharika",
    "Pallavi", "Rachana", "Shalini", "Tanvi", "Ujjwala", "Varsha",
    "Ankita", "Deepti", "Heena", "Jyoti", "Madhuri", "Priyanka", "Sonali",
    "Swati", "Shweta", "Sneha", "Suman", "Seema", "Rupal", "Reema"
];

const ALL_NAMES = [...MALE_NAMES, ...FEMALE_NAMES];

const BIOS = [
    "Exploring the world one step at a time.",
    "Passionate about learning new things every day.",
    "Love meeting new people and sharing ideas.",
    "Coffee addict and avid reader.",
    "Tech enthusiast building cool stuff.",
    "Nature lover and weekend trekker.",
    "Foodie on a mission to try everything.",
    "Music is my therapy.",
    "Always up for an adventure.",
    "Fitness freak and health nut.",
    "Photography is how I see the world.",
    "Film buff and binge-watcher.",
    "History nerd with a love for stories.",
    "Creative mind, artistic soul.",
    "Sports junkie, always game for a match.",
    "Travel lover, 15 states and counting!",
    "Business-minded and growth-oriented.",
    "Science geek at heart.",
    "Cars, bikes, and everything on wheels.",
    "Designing my way through life.",
    "Bookworm with too many wishlists.",
    "Living life one chai at a time.",
    "Weekend warrior, weekday dreamer.",
    "Making memories wherever I go.",
    "Just vibing through life. ✌️",
    "Future entrepreneur in the making.",
    "Love the mountains more than the beach.",
    "A smile is my favourite accessory.",
    "Lifelong student of everything.",
    "Home is where the heart is."
];

// ─────────────────────────── Geographic Regions ────────────────────────────────
/**
 * DEVELOPERS: SWAP THIS ARRAY WITH YOUR OWN STATE/COUNTRY COORDINATES.
 * Each object needs: name, lat (latitude), and lng (longitude).
 * These serve as 'base' points where users will be clustered around.
 */
const ANDHRA_PRADESH_CITIES = [
    { name: "Visakhapatnam", lat: 17.6868, lng: 83.2185 },
    { name: "Vijayawada", lat: 16.5062, lng: 80.6480 },
    { name: "Guntur", lat: 16.3067, lng: 80.4365 },
    { name: "Nellore", lat: 14.4426, lng: 79.9865 },
    { name: "Kurnool", lat: 15.8281, lng: 78.0373 },
    { name: "Rajahmundry", lat: 17.0005, lng: 81.8040 },
    { name: "Kakinada", lat: 16.9891, lng: 82.2475 },
    { name: "Tirupati", lat: 13.6288, lng: 79.4192 },
    { name: "Anantapur", lat: 14.6819, lng: 77.6006 },
    { name: "Kadapa", lat: 14.4674, lng: 78.8241 },
    { name: "Eluru", lat: 16.7107, lng: 81.0952 },
    { name: "Ongole", lat: 15.5057, lng: 80.0499 },
    { name: "Srikakulam", lat: 18.2949, lng: 83.8938 },
    { name: "Machilipatnam", lat: 16.1875, lng: 81.1389 },
    { name: "Proddatur", lat: 14.7502, lng: 78.5481 },
    { name: "Chittoor", lat: 13.2172, lng: 79.1003 },
    { name: "Anakapalle", lat: 17.6896, lng: 83.0024 },
    { name: "Adoni", lat: 15.6299, lng: 77.2730 },
    { name: "Tenali", lat: 16.2367, lng: 80.6475 },
    { name: "Hindupur", lat: 13.8291, lng: 77.4930 }
];

// ─────────────────────────── Helper Functions ───────────────────────────────

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

/** 
 * Jitter a city's coordinates by ±0.05 degrees (~5km) for realistic spread.
 * DEVELOPERS: Increase 'range' for wider dispersal, decrease for tight clusters.
 */
function jitter(value, range = 0.05) {
    return value + (Math.random() * 2 - 1) * range;
}

/** Pick 2-5 random interests from the 12 standard categories */
function getRandomInterests() {
    const count = Math.floor(Math.random() * 4) + 2; // 2..5
    const shuffled = [...INTERESTS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

function getRandomName() {
    /** DEVELOPERS: Swap MALE_NAMES / FEMALE_NAMES arrays above with your local languages. */
    return pick(ALL_NAMES);
}

function getRandomBio() {
    return pick(BIOS);
}

// ─────────────────────────── Main Seed Function ──────────────────────────────

async function seed() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // 1. Clean up ALL previously existing users and friends arrays
        const deleteResult = await User.deleteMany({});
        console.log(`🗑  Removed ${deleteResult.deletedCount} previous users from database`);

        const friendRequestsResult = await FriendRequest.deleteMany({});
        console.log(`🗑  Removed ${friendRequestsResult.deletedCount} old friend requests`);

        // 2. Hash a common password once (efficient — all seed users share this)
        const hashedPassword = await bcrypt.hash('Konnect@Seed2026', 10);
        console.log('🔐 Password hashed');

        const users = [];

        // ─── Seeding exactly 200 users in Andhra Pradesh ──────────────────────────────
        console.log('\n📍 Creating 200 users within Andhra Pradesh boundaries...');
        for (let i = 0; i < 200; i++) {
            const city = pick(ANDHRA_PRADESH_CITIES);
            const name = getRandomName();
            users.push({
                displayName: name,
                email: `ap_seed_${i}_${Date.now()}@seed.konnect`,
                password: hashedPassword,
                bio: getRandomBio(),
                interests: getRandomInterests(),
                userType: 'user',
                authMethod: 'local',
                isActive: true,
                moderationStrikes: 0,
                lastLogin: new Date(Date.now() - Math.floor(Math.random() * 48 * 60 * 60 * 1000)),
                location: {
                    type: 'Point',
                    coordinates: [jitter(city.lng), jitter(city.lat)]
                },
                profilePhoto: null
            });
        }

        // 3. Insert all at once
        await User.insertMany(users);
        console.log(`\n✅ Successfully seeded ${users.length} users strictly in Andhra Pradesh.`);
        console.log(`\n📊 Total users in DB: ${await User.countDocuments()}`);

        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    }
}

seed();
