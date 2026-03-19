import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, push, set, onValue, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// --- Configs ---
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

// --- Helper: Time Ago ---
function timeAgo(ts) {
    const s = Math.floor((new Date() - new Date(ts)) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s/60) + "m";
    if (s < 86400) return Math.floor(s/3600) + "h";
    return Math.floor(s/86400) + "d";
}

// --- Auth State Logic ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const userRef = ref(db, `users/${user.uid}`);
        const snapshot = await get(userRef);
        if (!snapshot.exists()) {
            await set(userRef, { username: user.email.split('@')[0], photoURL: DEFAULT_AVG });
        }
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        loadFeed();
    } else {
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('main-app').style.display = 'none';
    }
    lucide.createIcons();
});

// --- Auth Form (Login/Signup) ---
let isLogin = true;
document.getElementById('toggle-auth').onclick = () => {
    isLogin = !isLogin;
    document.getElementById('auth-btn').innerText = isLogin ? "Log In" : "Sign Up";
    document.getElementById('toggle-auth').innerHTML = isLogin ? "Don't have an account? <b>Sign up</b>" : "Have an account? <b>Log in</b>";
};

document.getElementById('auth-form').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    try {
        isLogin ? await signInWithEmailAndPassword(auth, email, pass) : await createUserWithEmailAndPassword(auth, email, pass);
    } catch (err) { document.getElementById('auth-error').innerText = err.message; }
};

document.getElementById('logout-btn').onclick = () => signOut(auth);

// --- Navigation ---
document.getElementById('nav-home').onclick = () => {
    document.getElementById('feed-view').style.display = 'block';
    document.getElementById('profile-view').style.display = 'none';
};
document.getElementById('nav-profile').onclick = () => {
    document.getElementById('feed-view').style.display = 'none';
    document.getElementById('profile-view').style.display = 'block';
    loadUserProfile();
};

// --- Post & Upload ---
const modal = document.getElementById('upload-modal');
document.getElementById('add-post-btn').onclick = () => modal.style.display = 'block';
document.getElementById('close-modal').onclick = () => modal.style.display = 'none';

document.getElementById('upload-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-post-btn');
    const file = document.getElementById('image-file').files[0];
    const status = document.getElementById('upload-status');
    btn.disabled = true; status.innerText = "Sharing...";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
    const imgData = await res.json();

    const userSnap = await get(ref(db, `users/${currentUser.uid}`));
    const userData = userSnap.val();

    await set(push(ref(db, 'posts')), {
        authorId: currentUser.uid,
        username: userData.username,
        avatar: userData.photoURL,
        imageUrl: imgData.secure_url,
        caption: document.getElementById('caption').value,
        timestamp: Date.now()
    });

    modal.style.display = 'none';
    document.getElementById('upload-form').reset();
    btn.disabled = false; status.innerText = "";
};

// --- Load Content ---
function loadFeed() {
    onValue(ref(db, 'posts'), (snap) => {
        const feed = document.getElementById('feed');
        feed.innerHTML = "";
        const data = snap.val();
        if(!data) return feed.innerHTML = '<p class="status-text">No posts yet.</p>';

        Object.keys(data).reverse().forEach(id => {
            const p = data[id];
            const likesCount = p.likes ? Object.keys(p.likes).length : 0;
            const isLiked = p.likes && p.likes[currentUser.uid] ? 'fill="red" stroke="red"' : '';
            
            feed.innerHTML += `
                <div class="post-card">
                    <div class="post-header">
                        <img src="${p.avatar}" class="avatar">
                        <div class="header-info"><span class="username">${p.username}</span><span class="timestamp">• ${timeAgo(p.timestamp)}</span></div>
                    </div>
                    <img src="${p.imageUrl}" class="post-img">
                    <div class="post-actions">
                        <i data-lucide="heart" onclick="toggleLike('${id}')" ${isLiked}></i>
                        <i data-lucide="message-circle"></i>
                    </div>
                    <div class="post-content"><b>${likesCount} likes</b><br><b>${p.username}</b> ${p.caption}</div>
                </div>
            `;
        });
        lucide.createIcons();
    });
}

async function loadUserProfile() {
    const userSnap = await get(ref(db, `users/${currentUser.uid}`));
    const userData = userSnap.val();
    document.getElementById('user-profile-img').src = userData.photoURL;
    document.getElementById('user-profile-name').innerText = userData.username;

    onValue(ref(db, 'posts'), (snap) => {
        const grid = document.getElementById('user-posts-grid');
        grid.innerHTML = "";
        const data = snap.val();
        if(!data) return;
        Object.values(data).filter(p => p.authorId === currentUser.uid).reverse().forEach(p => {
            grid.innerHTML += `<img src="${p.imageUrl}">`;
        });
    });
}

window.toggleLike = async (id) => {
    const likeRef = ref(db, `posts/${id}/likes/${currentUser.uid}`);
    const snap = await get(likeRef);
    await set(likeRef, snap.exists() ? null : true);
};
