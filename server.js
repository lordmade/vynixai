require('dotenv').config();
const express = require('express');
const firebase = require('firebase-admin');
const fetch = require('node-fetch');
const path = require('path');

const app = express();

// Initialize Firebase Admin SDK
firebase.initializeApp({
  credential: firebase.credential.cert({
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    projectId: process.env.FIREBASE_PROJECT_ID
  }),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = firebase.database();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files (HTML, CSS, JS)

// Safe Firebase config for client-side (excludes sensitive keys)
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

// API Endpoints
// 1. Get client-side config
app.get('/api/config', (req, res) => {
  res.json({
    firebaseConfig,
    mapboxToken: process.env.MAPBOX_TOKEN
  });
});

// 2. Geocode address using Mapbox
app.post('/api/geocode', async (req, res) => {
  const { address } = req.body;
  if (!address) {
    return res.status(400).json({ error: 'Address is required' });
  }
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${process.env.MAPBOX_TOKEN}`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    if (data.features && data.features.length > 0) {
      res.json({
        place_name: data.features[0].place_name,
        coordinates: data.features[0].center
      });
    } else {
      res.status(400).json({ error: 'Invalid address' });
    }
  } catch (error) {
    console.error('Geocoding failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 3. Register business
app.post('/api/register', async (req, res) => {
  const { businessName, businessType, address, contactName, contactEmail, contactNumber, userId } = req.body;
  if (!businessName || !businessType || !address || !contactName || !contactEmail || !contactNumber || !userId) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  try {
    const registrationRef = db.ref('pending_registrations');
    await registrationRef.push({
      businessName,
      businessType,
      address,
      contactName,
      contactEmail,
      contactNumber,
      userId,
      status: 'pending',
      timestamp: Date.now()
    });
    res.json({ message: 'Registration submitted successfully' });
  } catch (error) {
    console.error('Registration failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 4. Check business status
app.get('/api/business-status/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const userRef = db.ref(`users/${userId}`);
    const snapshot = await userRef.once('value');
    if (snapshot.exists() && snapshot.val().approvedBusinessId) {
      res.json({ approved: true, businessId: snapshot.val().approvedBusinessId });
    } else {
      res.json({ approved: false });
    }
  } catch (error) {
    console.error('Error checking business status:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Serve the frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
