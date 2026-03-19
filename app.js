import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, push, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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

// --- Init ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
let currentUser = null;

// --- Auth Handling ---
const authForm = document.getElementById('auth-form');
const toggleBtn = document.getElementById('toggle-auth');
let isLogin = true;

toggleBtn.onclick = () => {
    isLogin = !isLogin;
    document.getElementById('auth-btn').innerText = isLogin ? "Log In" : "Sign Up";
    toggleBtn.innerHTML = isLogin ? "Don't have an account? <b>Sign up</b>" : "Already have an account? <b>Log in</b>";
};

authForm.onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    try {
        isLogin ? await signInWithEmailAndPassword(auth, email, pass) : await createUserWithEmailAndPassword(auth, email, pass);
    } catch (err) {
        document.getElementById('auth-error').innerText = err.message;
    }
};

document.getElementById('logout-btn').onclick = () => signOut(auth);

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    document.getElementById('auth-screen').style.display = user ? 'none' : 'flex';
    document.getElementById('main-app').style.display = user ? 'block' : 'none';
    if(user) loadFeed();
});

// --- Post & Feed Logic ---
const modal = document.getElementById('upload-modal');
document.getElementById('fab').onclick = () => modal.style.display = 'flex';
document.getElementById('close-modal').onclick = () => modal.style.display = 'none';

document.getElementById('upload-form').onsubmit = async (e) => {
    e.preventDefault();
    const file = document.getElementById('image-file').files[0];
    const caption = document.getElementById('caption').value;
    const status = document.getElementById('upload-status');

    status.innerText = "Posting...";
    
    // Cloudinary Upload
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
    const data = await res.json();

    // Firebase Save
    const newPostRef = push(ref(db, 'posts'));
    await set(newPostRef, {
        author: currentUser.email.split('@')[0],
        imageUrl: data.secure_url,
        caption: caption,
        timestamp: Date.now()
    });

    modal.style.display = 'none';
    status.innerText = "";
};

function loadFeed() {
    onValue(ref(db, 'posts'), (snap) => {
        const feed = document.getElementById('feed');
        feed.innerHTML = "";
        const data = snap.val();
        if(!data) return;

        Object.values(data).reverse().forEach(post => {
            feed.innerHTML += `
                <div class="post">
                    <div class="post-header">
                        <img src="${DEFAULT_AVG}" class="avatar">
                        <span>${post.author}</span>
                    </div>
                    <img src="${post.imageUrl}" class="post-img">
                    <div class="post-info"><b>${post.author}</b> ${post.caption}</div>
                </div>
            `;
        });
    });
}
