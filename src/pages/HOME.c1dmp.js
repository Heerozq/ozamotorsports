import wixWindow from 'wix-window';

// Aapke diye gaye elements ki list
const ELEMENT_IDS = ['#text1', '#html1', '#hamburgerOpenButton3', '#text14', '#image7', '#videoBox1'];

$w.onReady(async function () {
    // 1. Pehle wale screenshot ka logic (Device type ke hisaab se elements ko hide/show ya expand/collapse karna)
    let deviceType = wixWindow.formFactor; // "Desktop", "Tablet", ya "Mobile" detect karega

    if (deviceType === "Mobile") {
        // Phone screen ke liye elements ko collapse karna ya adjust karna
        $w('#box1').collapse();
        $w('#box2').collapse();
        if ($w('#complexWidget')) $w('#complexWidget').collapse();
    } else if (deviceType === "Desktop" || deviceType === "Tablet") {
        // Desktop aur Tablet ke liye elements ko visible/expand rakhna
        $w('#box1').expand();
        $w('#box2').expand();
        if ($w('#complexWidget')) $w('#complexWidget').expand();
    }

    // 2. Naya Responsive & Dynamic Layout Scaling (Big screens, Projectors, TVs par niche gap hatane ke liye)
    adjustLayoutForScreen();

    wixWindow.getBoundingRect().then((windowSize) => {
        handleResponsiveScaling(windowSize.window.width, windowSize.window.height);
    });
});

function adjustLayoutForScreen() {
    wixWindow.getBoundingRect().then((rect) => {
        const screenWidth = rect.window.width;
        const screenHeight = rect.window.height;
        handleResponsiveScaling(screenWidth, screenHeight);
    });
}

function handleResponsiveScaling(width, height) {
    const baseWidth = 1920;
    const baseHeight = 1080;

    let scaleX = width / baseWidth;
    let scaleY = height / baseHeight;

    // Mobile, Laptop aur Bade screens/Projectors ke liye dynamic constraints
    if (width <= 768) {
        scaleX = Math.max(scaleX, 0.65);
        scaleY = Math.max(scaleY, 0.65);
        applyMobileAdjustments();
    } else if (width >= 2560) {
        // 4K TVs aur Projectors ke liye extra bottom gap ko fix karne ka scaling
        scaleX = Math.min(scaleX, 1.25);
        scaleY = Math.min(scaleY, 1.25);
        applyLargeScreenAdjustments();
    } else {
        applyStandardDesktopAdjustments();
    }
}

function applyMobileAdjustments() {
    ELEMENT_IDS.forEach(id => {
        try {
            const el = $w(id);
            if (el) {
                // Mobile par zaroori elements expand rahenge
                if (id === '#hamburgerOpenButton3' || id === '#image7' || id === '#text1') {
                    el.expand();
                }
            }
        } catch (err) {}
    });
}

function applyStandardDesktopAdjustments() {
    ELEMENT_IDS.forEach(id => {
        try {
            const el = $w(id);
            if (el) el.expand();
        } catch (err) {}
    });
}

function applyLargeScreenAdjustments() {
    ELEMENT_IDS.forEach(id => {
        try {
            const el = $w(id);
            if (el) {
                el.expand();
            }
        } catch (err) {}
    });
}