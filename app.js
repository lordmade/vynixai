import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, push, set, onValue, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBOyZ3As4GTuNvjemvPF_SpsC6m6vqtNhc",
    authDomain: "fire-b-a8878.firebaseapp.com",
    databaseURL: "https://fire-b-a8878.firebaseio.com",
    projectId: "fire-b-a8878",
    storageBucket: "fire-b-a8878.appspot.com",
    messagingSenderId: "658673187627",
    appId: "1:658673187627:web:6e4c29af661785f0afa36e"
};
const CLOUD_NAME = "dqkujefxj", UPLOAD_PRESET = "banter_box", DEFAULT_AVG = "https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png";

const app = initializeApp(firebaseConfig), auth = getAuth(app), db = getDatabase(app);
let currentUser = null;

// --- Time Format ---
const timeAgo = (ts) => {
    const s = Math.floor((new Date() - new Date(ts)) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s/60) + "m";
    if (s < 86400) return Math.floor(s/3600) + "h";
    return Math.floor(s/86400) + "d";
};

// --- Auth Handling ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const userRef = ref(db, `users/${user.uid}`);
        const snap = await get(userRef);
        if (!snap.exists()) await set(userRef, { username: user.email.split('@')[0], photoURL: DEFAULT_AVG });
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        loadFeed();
    } else {
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('main-app').style.display = 'none';
    }
    lucide.createIcons();
});

// --- View Navigation ---
const showView = (id) => {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.getElementById(id).style.display = 'block';
};
document.getElementById('nav-home').onclick = () => showView('feed-view');
document.getElementById('nav-search').onclick = () => showView('search-view');
document.getElementById('nav-profile').onclick = () => { showView('profile-view'); loadUserProfile(); };

// --- Search Logic ---
document.getElementById('search-input').oninput = async (e) => {
    const term = e.target.value.toLowerCase();
    const results = document.getElementById('search-results');
    if (!term) return results.innerHTML = "";
    
    const usersSnap = await get(ref(db, 'users'));
    results.innerHTML = "";
    Object.values(usersSnap.val()).forEach(u => {
        if (u.username.toLowerCase().includes(term)) {
            results.innerHTML += `
                <div class="search-item">
                    <img src="${u.photoURL || DEFAULT_AVG}" class="avatar">
                    <span class="username">${u.username}</span>
                </div>`;
        }
    });
};

// --- Upload Post ---
const modal = document.getElementById('upload-modal');
document.getElementById('add-post-btn').onclick = () => modal.style.display = 'block';
document.getElementById('close-modal').onclick = () => modal.style.display = 'none';

document.getElementById('upload-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-post-btn');
    btn.disabled = true;
    
    const formData = new FormData();
    formData.append("file", document.getElementById('image-file').files[0]);
    formData.append("upload_preset", UPLOAD_PRESET);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
    const imgData = await res.json();
    const userSnap = await get(ref(db, `users/${currentUser.uid}`));

    await set(push(ref(db, 'posts')), {
        authorId: currentUser.uid,
        username: userSnap.val().username,
        avatar: userSnap.val().photoURL,
        imageUrl: imgData.secure_url,
        caption: document.getElementById('caption').value,
        timestamp: Date.now()
    });

    modal.style.display = 'none';
    document.getElementById('upload-form').reset();
    btn.disabled = false;
};

// --- Load Feed ---
function loadFeed() {
    onValue(ref(db, 'posts'), (snap) => {
        const feed = document.getElementById('feed');
        feed.innerHTML = "";
        const data = snap.val();
        if(!data) return;

        Object.keys(data).reverse().forEach(id => {
            const p = data[id];
            const likesCount = p.likes ? Object.keys(p.likes).length : 0;
            const isLiked = p.likes && p.likes[currentUser.uid] ? 'liked-anim' : '';
            
            feed.innerHTML += `
                <div class="post-card">
                    <div class="post-header">
                        <img src="${p.avatar}" class="avatar">
                        <div class="header-text">
                            <div class="username-row">
                                <span class="username">${p.username}</span>
                                <span class="timestamp">• ${timeAgo(p.timestamp)}</span>
                            </div>
                            <div class="post-caption-top">${p.caption}</div>
                        </div>
                    </div>
                    <img src="${p.imageUrl}" class="post-img">
                    <div class="post-actions">
                        <i data-lucide="heart" class="${isLiked}" onclick="toggleLike('${id}', this)"></i>
                        <i data-lucide="message-circle"></i>
                    </div>
                    <div class="likes-count">${likesCount} likes</div>
                </div>`;
        });
        lucide.createIcons();
    });
}

window.toggleLike = async (id, el) => {
    const likeRef = ref(db, `posts/${id}/likes/${currentUser.uid}`);
    const snap = await get(likeRef);
    
    if (snap.exists()) {
        await set(likeRef, null);
        el.classList.remove('liked-anim');
    } else {
        await set(likeRef, true);
        el.classList.add('liked-anim');
    }
};

async function loadUserProfile() {
    const userSnap = await get(ref(db, `users/${currentUser.uid}`));
    document.getElementById('user-profile-img').src = userSnap.val().photoURL;
    document.getElementById('user-profile-name').innerText = userSnap.val().username;

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

document.getElementById('auth-form').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value, pass = document.getElementById('password').value;
    try { await signInWithEmailAndPassword(auth, email, pass); } catch(e) { await createUserWithEmailAndPassword(auth, email, pass); }
};
document.getElementById('logout-btn').onclick = () => signOut(auth);
