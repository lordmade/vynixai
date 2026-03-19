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
const CLOUD_NAME = "dqkujefxj", UPLOAD_PRESET = "banter_box";

const app = initializeApp(firebaseConfig), auth = getAuth(app), db = getDatabase(app);
let currentUser = null;

// --- UI Helpers ---
const toggleSheet = (id, overlay, state) => {
    document.getElementById(id).classList.toggle('active', state);
    document.getElementById(overlay).style.display = state ? 'block' : 'none';
};

document.getElementById('open-auth-sheet').onclick = () => toggleSheet('auth-sheet', 'auth-overlay', true);
document.getElementById('auth-overlay').onclick = () => toggleSheet('auth-sheet', 'auth-overlay', false);
document.getElementById('nav-add').onclick = () => toggleSheet('upload-sheet', 'upload-overlay', true);
document.getElementById('upload-overlay').onclick = () => toggleSheet('upload-sheet', 'upload-overlay', false);

// --- Auth Handling ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const userRef = ref(db, `users/${user.uid}`);
        const snap = await get(userRef);
        if (!snap.exists()) await set(userRef, { username: user.email.split('@')[0], photoURL: "https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png" });
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'flex';
        loadFeed();
    } else {
        document.getElementById('auth-screen').style.display = 'block';
        document.getElementById('main-app').style.display = 'none';
    }
    lucide.createIcons();
});

// --- Sequential Multi-Media Upload ---
document.getElementById('upload-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-post-btn'), status = document.getElementById('upload-status');
    const files = document.getElementById('media-files').files;
    btn.disabled = true;

    const uploadedMedia = [];
    for (let i = 0; i < files.length; i++) {
        status.innerText = `Uploading ${i+1}/${files.length}...`;
        const formData = new FormData();
        formData.append("file", files[i]);
        formData.append("upload_preset", UPLOAD_PRESET);
        
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, { method: "POST", body: formData });
        const data = await res.json();
        uploadedMedia.push({ url: data.secure_url, type: files[i].type.startsWith('video') ? 'video' : 'image' });
    }

    const userSnap = await get(ref(db, `users/${currentUser.uid}`));
    await set(push(ref(db, 'posts')), {
        authorId: currentUser.uid,
        username: userSnap.val().username,
        avatar: userSnap.val().photoURL,
        media: uploadedMedia,
        caption: document.getElementById('caption').value,
        timestamp: Date.now()
    });

    toggleSheet('upload-sheet', 'upload-overlay', false);
    document.getElementById('upload-form').reset();
    btn.disabled = false; status.innerText = "";
};

// --- Render Carousel Feed ---
function loadFeed() {
    onValue(ref(db, 'posts'), (snap) => {
        const feed = document.getElementById('feed');
        feed.innerHTML = "";
        const data = snap.val();
        if (!data) return;

        Object.keys(data).reverse().forEach(postId => {
            const p = data[postId];
            let mediaHTML = `<div class="carousel">`;
            p.media.forEach(m => {
                mediaHTML += (m.type === 'video') 
                    ? `<video src="${m.url}" class="carousel-item" loop muted autoplay playsinline></video>`
                    : `<img src="${m.url}" class="carousel-item">`;
            });
            mediaHTML += `</div>`;

            feed.innerHTML += `
                <div class="post-card">
                    <div class="post-header">
                        <img src="${p.avatar}" class="avatar">
                        <div class="header-text">
                            <span class="username">${p.username}</span>
                            <div class="post-caption">${p.caption}</div>
                        </div>
                    </div>
                    ${mediaHTML}
                    <div class="post-actions">
                        <i data-lucide="heart" onclick="toggleLike('${postId}', this)"></i>
                        <i data-lucide="message-circle"></i>
                    </div>
                </div>`;
        });
        lucide.createIcons();
    });
}

// --- Auth Toggle & Action ---
let isLogin = true;
document.getElementById('toggle-auth').onclick = () => {
    isLogin = !isLogin;
    document.getElementById('auth-title').innerText = isLogin ? "Welcome Back" : "Create Account";
    document.getElementById('auth-btn').innerText = isLogin ? "Log In" : "Sign Up";
    document.getElementById('toggle-auth').innerHTML = isLogin ? "New here? <b>Create Account</b>" : "Have an account? <b>Log In</b>";
};

document.getElementById('auth-form').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value, pass = document.getElementById('password').value;
    try { isLogin ? await signInWithEmailAndPassword(auth, email, pass) : await createUserWithEmailAndPassword(auth, email, pass); } 
    catch(err) { alert(err.message); }
};

document.getElementById('logout-btn').onclick = () => signOut(auth);

// View Switchers
document.getElementById('nav-home').onclick = () => { document.querySelectorAll('.view').forEach(v => v.style.display = 'none'); document.getElementById('feed-view').style.display = 'block'; };
document.getElementById('nav-profile').onclick = () => { document.querySelectorAll('.view').forEach(v => v.style.display = 'none'); document.getElementById('profile-view').style.display = 'block'; loadUserProfile(); };

window.toggleLike = async (id, el) => {
    const r = ref(db, `posts/${id}/likes/${currentUser.uid}`);
    const s = await get(r);
    await set(r, s.exists() ? null : true);
};
