import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, push, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// --- Your Configs ---
const firebaseConfig = {
    apiKey: "AIzaSyBOyZ3As4GTuNvjemvPF_SpsC6m6vqtNhc",
    authDomain: "fire-b-a8878.firebaseapp.com",
    databaseURL: "https://fire-b-a8878.firebaseio.com",
    projectId: "fire-b-a8878",
    storageBucket: "fire-b-a8878.appspot.com",
    messagingSenderId: "658673187627",
    appId: "1:658673187627:web:6e4c29af661785f0afa36e"
};
const CLOUD_NAME = "dqkujefxj";
const UPLOAD_PRESET = "banter_box";
const DEFAULT_AVG = "https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
let currentUser = null;

// --- Auth State ---
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    document.getElementById('auth-screen').style.display = user ? 'none' : 'flex';
    document.getElementById('main-app').style.display = user ? 'block' : 'none';
    if(user) loadFeed();
});

// --- Modal Logic ---
const modal = document.getElementById('upload-modal');
document.getElementById('add-post-btn').onclick = () => modal.style.display = 'block';
document.getElementById('close-modal').onclick = () => modal.style.display = 'none';

// --- Create Post ---
document.getElementById('upload-form').onsubmit = async (e) => {
    e.preventDefault();
    const file = document.getElementById('image-file').files[0];
    const caption = document.getElementById('caption').value;
    const status = document.getElementById('upload-status');

    status.innerText = "Uploading to ONA...";
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
    const data = await res.json();

    await set(push(ref(db, 'posts')), {
        author: currentUser.email.split('@')[0],
        imageUrl: data.secure_url,
        caption: caption,
        timestamp: Date.now()
    });

    modal.style.display = 'none';
    document.getElementById('upload-form').reset();
    status.innerText = "";
};

// --- Render Feed (The Card Design) ---
function loadFeed() {
    onValue(ref(db, 'posts'), (snap) => {
        const feed = document.getElementById('feed');
        feed.innerHTML = "";
        const data = snap.val();
        if(!data) return;

        Object.values(data).reverse().forEach(post => {
            const card = `
                <div class="post-card">
                    <div class="post-header">
                        <img src="${DEFAULT_AVG}" class="avatar">
                        <span class="username">${post.author}</span>
                    </div>
                    <img src="${post.imageUrl}" class="post-img">
                    <div class="post-actions">
                        <i data-lucide="heart"></i>
                        <i data-lucide="message-circle"></i>
                        <i data-lucide="send"></i>
                    </div>
                    <div class="post-content">
                        <b>${post.author}</b> ${post.caption}
                    </div>
                </div>
            `;
            feed.insertAdjacentHTML('beforeend', card);
        });
        lucide.createIcons(); // Re-run icons for new content
    });
}

// Log Out
document.getElementById('logout-btn').onclick = () => signOut(auth);
