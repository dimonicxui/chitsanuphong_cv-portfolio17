// Safe storage wrapper to prevent crash in file:// protocol on security restricted browsers
const safeStorage = {
    getItem(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            console.warn("Storage access denied. Falling back to in-memory storage.", e);
            return this._inMemoryStorage[key] || null;
        }
    },
    setItem(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.warn("Storage write denied. Saving in memory.", e);
            this._inMemoryStorage[key] = value;
        }
    },
    removeItem(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.warn("Storage delete denied. Removing from memory.", e);
            delete this._inMemoryStorage[key];
        }
    },
    _inMemoryStorage: {}
};

// Safe initializer utility
function safeInit(fn, name) {
    try {
        fn();
    } catch (e) {
        console.error(`Failed to initialize ${name}: `, e);
    }
}

// Initialize on DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
    // Initialize Lucide Icons
    try {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        } else {
            console.warn("Lucide icons not loaded (offline?). Standard layouts will use CSS placeholders.");
        }
    } catch (e) {
        console.error("Lucide failed to initialize: ", e);
    }

    // Call safe initializations
    safeInit(initTheme, "Theme Toggle");
    safeInit(initEditMode, "Edit Mode");
    safeInit(initTypewriter, "Typewriter");
    safeInit(initContacts, "Contact Clipboard Copy");
    safeInit(initLightbox, "Lightbox Modal");
});

/* ==========================================
   1. Theme Switcher (Dark / Light Mode)
   ========================================== */
function initTheme() {
    const themeToggle = document.getElementById("themeToggle");
    const body = document.body;
    
    // Check local storage for theme preference
    const savedTheme = safeStorage.getItem("theme");
    if (savedTheme === "light") {
        body.classList.remove("dark-theme");
        body.classList.add("light-theme");
    } else {
        body.classList.add("dark-theme");
        body.classList.remove("light-theme");
    }

    if (themeToggle) {
        themeToggle.addEventListener("click", () => {
            if (body.classList.contains("light-theme")) {
                body.classList.remove("light-theme");
                body.classList.add("dark-theme");
                safeStorage.setItem("theme", "dark");
            } else {
                body.classList.remove("dark-theme");
                body.classList.add("light-theme");
                safeStorage.setItem("theme", "light");
            }
        });
    }
}

/* ==========================================
   1.5 Edit Mode Toggle (Lock / Unlock)
   ========================================== */
function initEditMode() {
    const editToggle = document.getElementById("editToggle");
    const body = document.body;

    // Check saved edit mode state
    const savedEditMode = safeStorage.getItem("editModeActive");
    if (savedEditMode === "true") {
        body.classList.add("edit-mode");
    } else {
        body.classList.remove("edit-mode");
    }

    if (editToggle) {
        editToggle.addEventListener("click", () => {
            if (body.classList.contains("edit-mode")) {
                // Lock edit mode
                body.classList.remove("edit-mode");
                safeStorage.setItem("editModeActive", "false");
                showToast("ปิดโหมดแก้ไขแล้ว (ล็อคข้อมูลเรียบร้อย)");
            } else {
                // Prompt for password
                const password = prompt("กรุณากรอกรหัสผ่านเพื่อปลดล็อคโหมดแก้ไข (รหัสผ่านคือ 1234):");
                if (password === "1234") {
                    body.classList.add("edit-mode");
                    safeStorage.setItem("editModeActive", "true");
                    showToast("ปลดล็อคโหมดแก้ไขสำเร็จ! คุณสามารถเปลี่ยนรูปโปรไฟล์และเกียรติบัตรได้แล้ว");
                } else if (password !== null) {
                    showToast("รหัสผ่านไม่ถูกต้อง! กรุณาลองใหม่อีกครั้ง");
                }
            }
        });
    }
}

/* ==========================================
   2. Typing Effect (Typewriter)
   ========================================== */
const roles = [
    "Computer Engineering Student",
    "AI & Computer Vision Enthusiast",
    "Full-Stack Web Developer",
    "FastAPI & Next.js Developer"
];

function initTypewriter() {
    const textEl = document.getElementById("role-text");
    if (!textEl) return;
    
    let roleIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typingSpeed = 100;

    function type() {
        const currentRole = roles[roleIndex];
        
        if (isDeleting) {
            // Deleting text
            textEl.textContent = currentRole.substring(0, charIndex - 1);
            charIndex--;
            typingSpeed = 50; // Delete faster
        } else {
            // Typing text
            textEl.textContent = currentRole.substring(0, charIndex + 1);
            charIndex++;
            typingSpeed = 100; // Normal typing speed
        }

        // State changes
        if (!isDeleting && charIndex === currentRole.length) {
            // Fully typed, pause before deleting
            typingSpeed = 2000; 
            isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            // Fully deleted, move to next role
            isDeleting = false;
            roleIndex = (roleIndex + 1) % roles.length;
            typingSpeed = 500; // Short pause before typing next
        }

        setTimeout(type, typingSpeed);
    }

    // Start typewriter loop
    setTimeout(type, 1000);
}

/* ==========================================
   3. Copy Contact Details to Clipboard
   ========================================== */
let toastTimeout;
function copyToClipboard(text, successMessage) {
    navigator.clipboard.writeText(text).then(() => {
        showToast(successMessage);
    }).catch(err => {
        console.error("Failed to copy text: ", err);
        // Fallback for older browsers
        const textCol = document.createElement("textarea");
        textCol.value = text;
        textCol.style.position = "fixed";
        document.body.appendChild(textCol);
        textCol.focus();
        textCol.select();
        try {
            document.execCommand("copy");
            showToast(successMessage);
        } catch (fallbackErr) {
            console.error("Fallback copy failed: ", fallbackErr);
        }
        document.body.removeChild(textCol);
    });
}

function showToast(message) {
    const toast = document.getElementById("toast");
    const toastMsg = document.getElementById("toastMsg");
    if (!toast || !toastMsg) return;
    
    toastMsg.textContent = message;
    toast.classList.add("active");
    
    // Clear any existing timeout to prevent cut-off
    clearTimeout(toastTimeout);
    
    toastTimeout = setTimeout(() => {
        toast.classList.remove("active");
    }, 2500);
}

function initContacts() {
    const btnCopyPhone = document.getElementById("btnCopyPhone");
    const btnCopyEmail = document.getElementById("btnCopyEmail");
    
    if (btnCopyPhone) {
        btnCopyPhone.addEventListener("click", () => {
            copyToClipboard('0998425062', 'คัดลอกเบอร์โทรศัพท์แล้ว!');
        });
    }
    
    if (btnCopyEmail) {
        btnCopyEmail.addEventListener("click", () => {
            copyToClipboard('chitsanuphong.cha67@psru.ac.th', 'คัดลอกอีเมลแล้ว!');
        });
    }
}

/* ==========================================
   4. Certificate Uploader & Storage
   ========================================== */
function initCertUploader() {
    const certUploadCard = document.getElementById("certUploadCard");
    const certInput = document.getElementById("certInput");
    const certGrid = document.getElementById("certGrid");
    
    if (!certInput || !certGrid) return;

    // Load saved certificates from safeStorage
    let savedCerts = safeStorage.getItem("certificates");
    if (savedCerts) {
        try {
            const certList = JSON.parse(savedCerts);
            certList.forEach(cert => {
                createCertCard(cert.id, cert.src, cert.name);
            });
        } catch (e) {
            console.error("Failed to parse saved certificates", e);
        }
    }

    if (certUploadCard) {
        certUploadCard.addEventListener("click", () => {
            if (document.body.classList.contains("edit-mode")) {
                certInput.click();
            } else {
                showToast("กรุณาเปิดโหมดแก้ไข (ปุ่มแม่กุญแจ) ก่อนอัปโหลดเกียรติบัตร");
            }
        });
    }

    certInput.addEventListener("change", (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        // Loop through selected files
        Array.from(files).forEach(file => {
            if (!file.type.startsWith("image/")) {
                showToast("กรุณาเลือกเฉพาะไฟล์รูปภาพ!");
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                const imageUrl = event.target.result;
                const uniqueId = "cert_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
                
                // Add to DOM
                createCertCard(uniqueId, imageUrl, file.name);

                // Save to safeStorage
                let certList = safeStorage.getItem("certificates");
                certList = certList ? JSON.parse(certList) : [];
                certList.push({ id: uniqueId, src: imageUrl, name: file.name });
                
                try {
                    safeStorage.setItem("certificates", JSON.stringify(certList));
                    showToast("เพิ่มเกียรติบัตรเรียบร้อยและบันทึกออฟไลน์แล้ว!");
                } catch (error) {
                    console.warn("Storage quota exceeded. Image displayed but not saved to disk.", error);
                    showToast("เพิ่มรูปเกียรติบัตรแล้ว! (ขนาดไฟล์ใหญ่เกินไปสำหรับการเซฟข้ามหน้าเว็บ)");
                }
            };
            reader.readAsDataURL(file);
        });

        // Reset input value
        certInput.value = "";
    });
}

function createCertCard(id, imgSrc, altText) {
    const certGrid = document.getElementById("certGrid");
    const placeholder = document.getElementById("certUploadCard");
    if (!certGrid || !placeholder) return;
    
    // Create Card element
    const card = document.createElement("div");
    card.className = "cert-card";
    card.setAttribute("data-id", id);
    
    // Create image element
    const img = document.createElement("img");
    img.src = imgSrc;
    img.alt = altText;
    img.className = "cert-image";
    img.addEventListener("click", () => {
        openLightbox(imgSrc, altText);
    });
    
    // Create remove button
    const removeBtn = document.createElement("button");
    removeBtn.className = "cert-remove-btn";
    removeBtn.innerHTML = '<i data-lucide="trash-2" style="width: 12px; height: 12px;"></i>';
    removeBtn.title = "ลบเกียรติบัตรนี้";
    
    removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        
        // Remove from safeStorage
        let certList = safeStorage.getItem("certificates");
        if (certList) {
            try {
                let parsed = JSON.parse(certList);
                parsed = parsed.filter(item => item.id !== id);
                safeStorage.setItem("certificates", JSON.stringify(parsed));
            } catch (err) {
                console.error("Error updating saved cert list: ", err);
            }
        }

        // Remove from DOM
        card.style.opacity = "0";
        card.style.transform = "scale(0.8)";
        setTimeout(() => {
            card.remove();
            showToast("ลบเกียรติบัตรเรียบร้อยแล้ว");
        }, 200);
    });

    card.appendChild(img);
    card.appendChild(removeBtn);
    
    // Insert card before placeholder to keep uploader at the end
    certGrid.insertBefore(card, placeholder);
    
    // Render icon in newly added button
    if (typeof lucide !== 'undefined') {
        lucide.createIcons({
            attrs: {
                class: "lucide-icon"
            },
            nameAttr: "data-lucide"
        });
    }
}

/* ==========================================
   5. Lightbox Modal functions
   ========================================== */
function initLightbox() {
    const lightbox = document.getElementById("lightbox");
    const lightboxClose = document.getElementById("lightboxClose");
    
    if (lightbox) {
        lightbox.addEventListener("click", (e) => {
            // Close only if clicking the background overlay itself
            if (e.target === lightbox) {
                closeLightbox();
            }
        });
    }
    
    if (lightboxClose) {
        lightboxClose.addEventListener("click", (e) => {
            e.stopPropagation();
            closeLightbox();
        });
    }
}

function openLightbox(src, alt) {
    const lightbox = document.getElementById("lightbox");
    const lightboxImg = document.getElementById("lightboxImg");
    
    if (!lightbox || !lightboxImg) return;
    
    lightboxImg.src = src;
    lightboxImg.alt = alt || "Certificate Image";
    lightbox.classList.add("active");
    
    // Disable body scrolling when modal is open
    document.body.style.overflow = "hidden";
}

// Global exposure for close
function closeLightbox() {
    const lightbox = document.getElementById("lightbox");
    if (!lightbox) return;
    
    lightbox.classList.remove("active");
    // Restore scrolling
    document.body.style.overflow = "";
}

/* ==========================================
   6. Profile Avatar Uploader & Persistence
   ========================================== */
function initAvatarUploader() {
    const avatarContainer = document.getElementById("avatarContainer");
    const avatarInput = document.getElementById("avatarInput");
    const avatarWrapper = document.getElementById("avatarWrapper");
    const body = document.body;
    
    if (!avatarInput || !avatarWrapper) return;

    // Load saved avatar if any
    const savedAvatar = safeStorage.getItem("profileAvatar");
    if (savedAvatar) {
        setAvatarImage(savedAvatar);
    }

    if (avatarContainer) {
        avatarContainer.addEventListener("click", () => {
            if (body.classList.contains("edit-mode")) {
                avatarInput.click();
            } else {
                showToast("กรุณาเปิดโหมดแก้ไข (ปุ่มแม่กุญแจ) ก่อนเปลี่ยนรูปโปรไฟล์");
            }
        });
    }

    avatarInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            showToast("กรุณาเลือกเฉพาะไฟล์รูปภาพสำหรับรูปโปรไฟล์!");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target.result;
            
            // Set image preview
            setAvatarImage(dataUrl);

            // Save to storage
            try {
                safeStorage.setItem("profileAvatar", dataUrl);
                showToast("เปลี่ยนรูปโปรไฟล์สำเร็จ!");
            } catch (error) {
                console.warn("Storage quota exceeded. Profile image will not persist on reload.", error);
                showToast("เปลี่ยนรูปสำเร็จ! (ขนาดไฟล์ใหญ่เกินไปสำหรับการบันทึกถาวร)");
            }
        };
        reader.readAsDataURL(file);
    });

    function setAvatarImage(src) {
        avatarWrapper.innerHTML = `<img src="${src}" alt="ชิษณุพงศ์ จันสอน" class="avatar-image">`;
    }
}
