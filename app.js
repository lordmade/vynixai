import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, push, set, onValue, get, remove, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ==================== CONFIGURATION ====================
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
const DEFAULT_AVATAR = "https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png";

// ==================== INITIALIZATION ====================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
let currentUser = null;
let currentUsername = null;
let currentAvatar = null;
let feedUnsubscribe = null;
let profileUnsubscribe = null;

// ==================== UTILITY FUNCTIONS ====================
const timeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h';
    if (seconds < 604800) return Math.floor(seconds / 86400) + 'd';
    return new Date(timestamp).toLocaleDateString();
};

const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

const showToast = (message, duration = 3000) => {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    requestAnimationFrame(() => toast.classList.add('show'));
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
};

const setLoading = (btn, isLoading, text = 'Loading...') => {
    btn.disabled = isLoading;
    btn.textContent = isLoading ? text : btn.dataset.originalText || btn.textContent;
};

// ==================== AUTHENTICATION ====================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        
        // Get or create user data
        const userRef = ref(db, `users/${user.uid}`);
        const snap = await get(userRef);
        
        if (!snap.exists()) {
            const username = user.email.split('@')[0];
            await set(userRef, { 
                username: username, 
                photoURL: DEFAULT_AVATAR,
                email: user.email,
                createdAt: Date.now()
            });
            currentUsername = username;
            currentAvatar = DEFAULT_AVATAR;
        } else {
            const data = snap.val();
            currentUsername = data.username;
            currentAvatar = data.photoURL || DEFAULT_AVATAR;
        }
        
        // Show main app
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        
        // Initialize
        showView('feed-view');
        loadFeed();
        lucide.createIcons();
    } else {
        currentUser = null;
        currentUsername = null;
        currentAvatar = null;
        
        // Cleanup listeners
        if (feedUnsubscribe) feedUnsubscribe();
        if (profileUnsubscribe) profileUnsubscribe();
        
        // Show auth screen
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('main-app').style.display = 'none';
        lucide.createIcons();
    }
});

// Auth form handling
document.getElementById('auth-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('auth-btn');
    const errorMsg = document.getElementById('auth-error');
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const isSignUp = btn.textContent === 'Sign Up';
    
    setLoading(btn, true);
    errorMsg.textContent = '';
    
    try {
        if (isSignUp) {
            await createUserWithEmailAndPassword(auth, email, password);
            showToast('Account created successfully!');
        } else {
            await signInWithEmailAndPassword(auth, email, password);
        }
    } catch (error) {
        console.error('Auth error:', error);
        let message = error.message;
        if (error.code === 'auth/user-not-found') message = 'No account found with this email';
        if (error.code === 'auth/wrong-password') message = 'Incorrect password';
        if (error.code === 'auth/email-already-in-use') message = 'Email already registered';
        if (error.code === 'auth/weak-password') message = 'Password should be at least 6 characters';
        errorMsg.textContent = message;
    } finally {
        setLoading(btn, false, isSignUp ? 'Sign Up' : 'Log In');
    }
};

// Toggle auth mode
document.getElementById('toggle-auth').onclick = () => {
    const btn = document.getElementById('auth-btn');
    const toggle = document.getElementById('toggle-auth');
    const isSignUp = btn.textContent === 'Log In';
    
    btn.textContent = isSignUp ? 'Sign Up' : 'Log In';
    toggle.innerHTML = isSignUp 
        ? 'Already have an account? <b>Log in</b>' 
        : 'Don\'t have an account? <b>Sign up</b>';
};

// Logout
document.getElementById('logout-btn').onclick = () => {
    signOut(auth);
    showToast('Logged out successfully');
};

// ==================== NAVIGATION ====================
const showView = (viewId) => {
    // Hide all views
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    
    // Show selected view
    document.getElementById(viewId).style.display = 'block';
    
    // Update nav icons
    document.querySelectorAll('.bottom-nav i').forEach(icon => {
        icon.classList.remove('nav-active');
        icon.style.color = 'var(--text-grey)';
    });
    
    // Set active nav icon
    const activeMap = {
        'feed-view': 'nav-home',
        'search-view': 'nav-search',
        'profile-view': 'nav-profile'
    };
    
    const activeIcon = document.getElementById(activeMap[viewId]);
    if (activeIcon) {
        activeIcon.classList.add('nav-active');
        activeIcon.style.color = 'var(--text-main)';
    }
    
    // Cleanup listeners when leaving views
    if (viewId !== 'feed-view' && feedUnsubscribe) {
        feedUnsubscribe();
        feedUnsubscribe = null;
    }
    if (viewId !== 'profile-view' && profileUnsubscribe) {
        profileUnsubscribe();
        profileUnsubscribe = null;
    }
    
    // Load view data
    if (viewId === 'feed-view') loadFeed();
    if (viewId === 'profile-view') loadUserProfile();
    
    lucide.createIcons();
};

document.getElementById('nav-home').onclick = () => showView('feed-view');
document.getElementById('nav-search').onclick = () => showView('search-view');
document.getElementById('nav-profile').onclick = () => showView('profile-view');

// ==================== FEED ====================
function loadFeed() {
    const feed = document.getElementById('feed');
    const empty = document.getElementById('feed-empty');
    
    // Cleanup existing listener
    if (feedUnsubscribe) feedUnsubscribe();
    
    feedUnsubscribe = onValue(ref(db, 'posts'), (snap) => {
        feed.innerHTML = '';
        const data = snap.val();
        
        if (!data) {
            empty.style.display = 'block';
            return;
        }
        
        empty.style.display = 'none';
        const posts = Object.entries(data).reverse();
        
        posts.forEach(([id, post]) => {
            const likesCount = post.likes ? Object.keys(post.likes).length : 0;
            const isLiked = post.likes && post.likes[currentUser.uid];
            const comments = post.comments ? Object.values(post.comments) : [];
            const commentsCount = comments.length;
            
            const postEl = document.createElement('div');
            postEl.className = 'post-card';
            postEl.innerHTML = `
                <div class="post-header">
                    <img src="${escapeHtml(post.avatar || DEFAULT_AVATAR)}" class="avatar" alt="${escapeHtml(post.username)}">
                    <div class="header-text">
                        <div class="username-row">
                            <span class="username">${escapeHtml(post.username)}</span>
                            <span class="timestamp">• ${timeAgo(post.timestamp)}</span>
                        </div>
                        <div class="post-caption-top">${escapeHtml(post.caption || '')}</div>
                    </div>
                </div>
                <img src="${escapeHtml(post.imageUrl)}" class="post-img" alt="Post" onclick="openLightbox('${escapeHtml(post.imageUrl)}')">
                <div class="post-actions">
                    <i data-lucide="heart" class="${isLiked ? 'liked-anim' : ''}" onclick="toggleLike('${id}', this)" style="${isLiked ? 'color: #ed4956; fill: #ed4956;' : ''}"></i>
                    <i data-lucide="message-circle" onclick="focusComment('${id}')"></i>
                    <i data-lucide="send" style="transform: rotate(-45deg) translateY(-2px);"></i>
                </div>
                <div class="likes-count">${likesCount} like${likesCount !== 1 ? 's' : ''}</div>
                ${commentsCount > 0 ? `
                    <div class="comments-section">
                        ${commentsCount > 2 ? `<div class="view-all-comments" onclick="viewAllComments('${id}')">View all ${commentsCount} comments</div>` : ''}
                        ${comments.slice(0, 2).map(c => `
                            <div class="comment-item">
                                <span class="comment-username">${escapeHtml(c.username)}</span>
                                <span class="comment-text">${escapeHtml(c.text)}</span>
                            </div>
                        `).join('')}
                        <div class="comment-input-container">
                            <input type="text" class="comment-input" id="comment-${id}" placeholder="Add a comment..." maxlength="500">
                            <button class="comment-submit" onclick="addComment('${id}')" id="submit-comment-${id}">Post</button>
                        </div>
                    </div>
                ` : `
                    <div class="comments-section">
                        <div class="comment-input-container">
                            <input type="text" class="comment-input" id="comment-${id}" placeholder="Add a comment..." maxlength="500">
                            <button class="comment-submit" onclick="addComment('${id}')" id="submit-comment-${id}">Post</button>
                        </div>
                    </div>
                `}
            `;
            feed.appendChild(postEl);
        });
        
        lucide.createIcons();
    });
}

// ==================== LIKES ====================
window.toggleLike = async (postId, el) => {
    if (!currentUser) return;
    
    const likeRef = ref(db, `posts/${postId}/likes/${currentUser.uid}`);
    const snap = await get(likeRef);
    
    try {
        if (snap.exists()) {
            await remove(likeRef);
            el.classList.remove('liked-anim');
            el.style.color = '';
            el.style.fill = '';
        } else {
            await set(likeRef, true);
            el.classList.add('liked-anim');
            el.style.color = '#ed4956';
            el.style.fill = '#ed4956';
        }
    } catch (error) {
        console.error('Like error:', error);
    }
};

// ==================== COMMENTS ====================
window.addComment = async (postId) => {
    if (!currentUser) return;
    
    const input = document.getElementById(`comment-${postId}`);
    const submitBtn = document.getElementById(`submit-comment-${postId}`);
    const text = input.value.trim();
    
    if (!text) return;
    
    submitBtn.disabled = true;
    
    try {
        await push(ref(db, `posts/${postId}/comments`), {
            username: currentUsername,
            text: text,
            timestamp: Date.now()
        });
        input.value = '';
    } catch (error) {
        console.error('Comment error:', error);
        showToast('Failed to add comment');
    } finally {
        submitBtn.disabled = false;
    }
};

window.focusComment = (postId) => {
    const input = document.getElementById(`comment-${postId}`);
    if (input) input.focus();
};

window.viewAllComments = (postId) => {
    // Could open a modal with all comments
    showToast('Comments modal coming soon');
};

// ==================== SEARCH ====================
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const searchEmpty = document.getElementById('search-empty');

searchInput.oninput = async (e) => {
    const term = e.target.value.toLowerCase().trim();
    
    if (!term) {
        searchResults.innerHTML = '';
        searchEmpty.style.display = 'block';
        return;
    }
    
    searchEmpty.style.display = 'none';
    
    try {
        const usersSnap = await get(ref(db, 'users'));
        searchResults.innerHTML = '';
        
        if (!usersSnap.exists()) return;
        
        const users = Object.entries(usersSnap.val());
        let found = false;
        
        users.forEach(([uid, user]) => {
            if (user.username.toLowerCase().includes(term) && uid !== currentUser?.uid) {
                found = true;
                const item = document.createElement('div');
                item.className = 'search-item';
                item.innerHTML = `
                    <img src="${escapeHtml(user.photoURL || DEFAULT_AVATAR)}" class="avatar">
                    <span class="username">${escapeHtml(user.username)}</span>
                `;
                item.onclick = () => viewUserProfile(uid);
                searchResults.appendChild(item);
            }
        });
        
        if (!found) {
            searchResults.innerHTML = '<div class="empty-state"><p>No users found</p></div>';
        }
    } catch (error) {
        console.error('Search error:', error);
    }
};

window.viewUserProfile = (userId) => {
    showToast('User profiles coming soon');
};

// ==================== PROFILE ====================
async function loadUserProfile() {
    if (!currentUser) return;
    
    // Cleanup existing listener
    if (profileUnsubscribe) profileUnsubscribe();
    
    // Load user info
    document.getElementById('user-profile-img').src = currentAvatar;
    document.getElementById('user-profile-name').textContent = currentUsername;
    
    // Load posts
    const grid = document.getElementById('user-posts-grid');
    const empty = document.getElementById('profile-empty');
    
    profileUnsubscribe = onValue(ref(db, 'posts'), (snap) => {
        grid.innerHTML = '';
        const data = snap.val();
        
        if (!data) {
            empty.style.display = 'block';
            document.getElementById('posts-count').textContent = '0';
            return;
        }
        
        const userPosts = Object.values(data).filter(p => p.authorId === currentUser.uid).reverse();
        
        document.getElementById('posts-count').textContent = userPosts.length;
        
        if (userPosts.length === 0) {
            empty.style.display = 'block';
        } else {
            empty.style.display = 'none';
            userPosts.forEach(post => {
                const img = document.createElement('img');
                img.src = post.imageUrl;
                img.alt = 'Post';
                img.onclick = () => openLightbox(post.imageUrl);
                grid.appendChild(img);
            });
        }
    });
}

// ==================== BOTTOM SHEET MODAL ====================
const modal = document.getElementById('upload-modal');
const previewContainer = document.getElementById('preview-container');
const previewImg = document.getElementById('preview-img');
const imageInput = document.getElementById('image-file');
const changeImageBtn = document.getElementById('change-image');
const captionInput = document.getElementById('caption');
const charCount = document.getElementById('char-count');
const uploadLoading = document.getElementById('upload-loading');
const submitBtn = document.getElementById('submit-post-btn');
const dragHandle = document.getElementById('modal-drag-handle');

// Open modal
document.getElementById('add-post-btn').onclick = () => {
    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('active'));
    loadCurrentUserInfo();
};

// Close modal
function closeModal() {
    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
        resetForm();
    }, 350);
}

document.getElementById('close-modal').onclick = closeModal;

// Close on backdrop click
modal.onclick = (e) => {
    if (e.target === modal) closeModal();
};

// Drag to dismiss
let startY = 0, currentY = 0, isDragging = false;

dragHandle.addEventListener('touchstart', handleDragStart, { passive: true });
dragHandle.addEventListener('touchmove', handleDragMove, { passive: true });
dragHandle.addEventListener('touchend', handleDragEnd);
dragHandle.addEventListener('mousedown', handleDragStart);
document.addEventListener('mousemove', handleDragMove);
document.addEventListener('mouseup', handleDragEnd);

function handleDragStart(e) {
    startY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    isDragging = true;
    modal.querySelector('.modal-content').style.transition = 'none';
}

function handleDragMove(e) {
    if (!isDragging) return;
    currentY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    const diff = currentY - startY;
    if (diff > 0) {
        modal.querySelector('.modal-content').style.transform = `translateY(${diff}px)`;
    }
}

function handleDragEnd() {
    if (!isDragging) return;
    isDragging = false;
    const diff = currentY - startY;
    modal.querySelector('.modal-content').style.transition = 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)';
    
    if (diff > 100) {
        closeModal();
    } else {
        modal.querySelector('.modal-content').style.transform = 'translateY(0)';
    }
}

// Image preview
imageInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
        showToast('Image must be less than 10MB');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        previewImg.src = e.target.result;
        previewContainer.classList.add('has-image');
    };
    reader.readAsDataURL(file);
};

// Change image
changeImageBtn.onclick = () => imageInput.click();

// Character count
captionInput.oninput = () => {
    const count = captionInput.value.length;
    charCount.textContent = `${count}/2200`;
    
    charCount.classList.remove('warning', 'error');
    if (count > 2000) charCount.classList.add('error');
    else if (count > 1800) charCount.classList.add('warning');
};

// Load current user info
async function loadCurrentUserInfo() {
    if (!currentUser) return;
    document.getElementById('current-user-name').textContent = currentUsername;
    document.getElementById('current-user-avatar').src = currentAvatar;
}

// Reset form
function resetForm() {
    document.getElementById('upload-form').reset();
    previewContainer.classList.remove('has-image');
    previewImg.src = '';
    charCount.textContent = '0/2200';
    charCount.classList.remove('warning', 'error');
    uploadLoading.classList.remove('active');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Share';
}

// Upload submission
document.getElementById('upload-form').onsubmit = async (e) => {
    e.preventDefault();
    
    if (!imageInput.files[0]) {
        showToast('Please select an image');
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sharing...';
    uploadLoading.classList.add('active');
    
    try {
        const formData = new FormData();
        formData.append("file", imageInput.files[0]);
        formData.append("upload_preset", UPLOAD_PRESET);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { 
            method: "POST", 
            body: formData 
        });
        
        if (!res.ok) throw new Error('Upload failed');
        
        const imgData = await res.json();

        await set(push(ref(db, 'posts')), {
            authorId: currentUser.uid,
            username: currentUsername,
            avatar: currentAvatar,
            imageUrl: imgData.secure_url,
            caption: captionInput.value,
            timestamp: Date.now(),
            likes: {}
        });

        showToast('Post shared successfully!');
        closeModal();
    } catch (error) {
        console.error('Upload error:', error);
        showToast('Upload failed. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Share';
        uploadLoading.classList.remove('active');
    }
};

// ==================== LIGHTBOX ====================
const lightbox = document.getElementById('lightbox-modal');
const lightboxImg = document.getElementById('lightbox-img');

window.openLightbox = (src) => {
    lightboxImg.src = src;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
};

document.getElementById('lightbox-close').onclick = () => {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
};

lightbox.onclick = (e) => {
    if (e.target === lightbox) {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }
};

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (lightbox.classList.contains('active')) {
            lightbox.classList.remove('active');
            document.body.style.overflow = '';
        }
        if (modal.classList.contains('active')) {
            closeModal();
        }
    }
});

// ==================== INITIALIZE ====================
// Store original button texts
document.querySelectorAll('button').forEach(btn => {
    btn.dataset.originalText = btn.textContent;
});

console.log('ONA App initialized');
