// State variables
let currentRawVideos = [];
let currentVideos = [];
let loadedVideoIds = new Set();
let isLoading = false;
let currentSearchQuery = "";
let currentCategory = "general"; // "general" | "entertainment" | "music" | "education"

// Filter State (Local client-side filtering)
let activeTab = "all"; // "all" | "gems" | "consolidated"
let hideClickbaitActive = false;
let currentLang = localStorage.getItem('yt_cleaner_lang') || 'mixed';
let groundedModeActive = localStorage.getItem('yt_cleaner_grounded') === 'true';
let activeTimeBudget = "all"; // "all" | "pills" | "standard" | "deep"
let gemsBoostWeight = parseInt(localStorage.getItem('yt_cleaner_gems_boost')) || 50;
let youtubePlayer = null;
let activeVideoSponsorSegments = [];
let playerCheckInterval = null;
let activePlayingVideoId = null;

// Local Memory State (localStorage with try-catch fallback)
let channelWeights = {};
try {
    const raw = localStorage.getItem('yt_cleaner_channels');
    channelWeights = (raw && raw !== "null" && raw !== "undefined") ? JSON.parse(raw) : {};
    if (!channelWeights || typeof channelWeights !== 'object' || Array.isArray(channelWeights)) {
        channelWeights = {};
    }
} catch (e) {
    console.error("Failed to parse channels weights from localStorage:", e);
    channelWeights = {};
}

let keywordWeights = {};
try {
    const raw = localStorage.getItem('yt_cleaner_keywords');
    keywordWeights = (raw && raw !== "null" && raw !== "undefined") ? JSON.parse(raw) : {};
    if (!keywordWeights || typeof keywordWeights !== 'object' || Array.isArray(keywordWeights)) {
        keywordWeights = {};
    }
} catch (e) {
    console.error("Failed to parse keywords weights from localStorage:", e);
    keywordWeights = {};
}

let seenVideoIds = new Set();
try {
    const seenArray = JSON.parse(localStorage.getItem('yt_cleaner_seen')) || [];
    seenVideoIds = new Set(seenArray);
} catch (e) {
    console.error("Failed to parse seen videos from localStorage:", e);
    seenVideoIds = new Set();
}

let bannedChannels = new Set();
try {
    const bannedArray = JSON.parse(localStorage.getItem('yt_cleaner_banned_channels')) || [];
    bannedChannels = new Set(bannedArray);
} catch (e) {
    console.error("Failed to parse banned channels from localStorage:", e);
    bannedChannels = new Set();
}

let customSeeds = { general: [], entertainment: [], music: [], education: [] };
try {
    const parsed = JSON.parse(localStorage.getItem('yt_cleaner_custom_seeds'));
    if (parsed && typeof parsed === 'object') {
        customSeeds = {
            general: Array.isArray(parsed.general) ? parsed.general : [],
            entertainment: Array.isArray(parsed.entertainment) ? parsed.entertainment : [],
            music: Array.isArray(parsed.music) ? parsed.music : [],
            education: Array.isArray(parsed.education) ? parsed.education : []
        };
    }
} catch (e) {
    console.error("Failed to parse custom seeds from localStorage:", e);
    customSeeds = { general: [], entertainment: [], music: [], education: [] };
}

// Adaptive suggestions template maps
const categorySuggestions = {
    general: [
        { label: "🐍 Python coding tutorials", query: "Python coding tutorials for beginners" },
        { label: "⚛️ Quantum physics discoveries", query: "Quantum physics documentary veritasium" },
        { label: "🤖 AI and future tech trends", query: "Artificial intelligence tech trends" },
        { label: "🌌 Cosmology & Space explorations", query: "Cosmology space exploration documentary" }
    ],
    entertainment: [
        { label: "🎬 Cinema history analysis", query: "documentales cinefilos analisis de peliculas" },
        { label: "👁️ Video essays storytelling", query: "video essays documentary films" },
        { label: "🎭 Smart stand up comedy", query: "stand up comedy inteligente" },
        { label: "🏆 Award-winning short films", query: "independent short film award winners" }
    ],
    music: [
        { label: "🎧 Lofi chillhop beats for coding", query: "lofi chillhop beats to code" },
        { label: "🎸 Acoustic indie performances", query: "acoustic live session performance indie" },
        { label: "🎹 Classical study playlist", query: "classical music deep study playlist" },
        { label: "🎷 Live jazz trio sessions", query: "jazz trio live session concert" }
    ],
    education: [
        { label: "💻 Python full course tutorials", query: "python coding tutorial full course" },
        { label: "🔬 Quantum mechanics physics", query: "quantum mechanics derivation physics" },
        { label: "📚 Mathematics visuals (3B1B)", query: "mathematics visualization 3blue1brown" },
        { label: "🧬 Genetics & biology lectures", query: "genetics biology breakthroughs lecture" }
    ]
};

// DOM Elements
const brandLogo = document.getElementById("brand-logo");
const feedScrollContainer = document.getElementById("feed-scroll-container");
const feedGrid = document.getElementById("feed-grid");
const feedTitle = document.getElementById("feed-title");
const feedDesc = document.getElementById("feed-desc");
const videoCountBadge = document.getElementById("video-count");
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const searchSuggestions = document.getElementById("search-suggestions");
const refreshBtn = document.getElementById("refresh-btn");
const refreshBtnMobile = document.getElementById("refresh-btn-mobile");

// Collapsible filters tray
const quickFiltersPanel = document.getElementById("quick-filters-panel");
const filtersToggle = document.getElementById("filters-toggle");
const filtersToggleMobile = document.getElementById("filters-toggle-mobile");

const loadingState = document.getElementById("loading-state");
const infiniteLoadingState = document.getElementById("infinite-loading-state");
const emptyState = document.getElementById("empty-state");

// Sidebar controls
const sidebarToggle = document.getElementById("sidebar-toggle");
const sidebarToggleMobile = document.getElementById("sidebar-toggle-mobile");
const sidebarClose = document.getElementById("sidebar-close");
const sidebarPanel = document.getElementById("sidebar-panel");
const sidebarBackdrop = document.getElementById("sidebar-backdrop");

// Sidebar weights list
const learnedChannelsContainer = document.getElementById("learned-channels");
const learnedKeywordsContainer = document.getElementById("learned-keywords");
const clearMemBtn = document.getElementById("clear-mem-btn");

// Tab buttons & toggles
const tabAll = document.getElementById("tab-all");
const tabGems = document.getElementById("tab-gems");
const tabConsolidated = document.getElementById("tab-consolidated");
const toggleAntiClickbait = document.getElementById("toggle-anti-clickbait");

// Initialization
document.addEventListener("DOMContentLoaded", () => {
    renderPreferencesList();
    renderCuratedSeeds();
    updateSearchSuggestions();
    
    // Set initial visual state for language buttons
    document.querySelectorAll(".lang-btn").forEach(btn => {
        const btnLang = btn.getAttribute("data-lang");
        if (btnLang === currentLang) {
            btn.className = "lang-btn inline-flex items-center justify-center whitespace-nowrap rounded-md px-2.5 py-1 text-[10px] font-bold transition-all focus-visible:outline-none bg-background text-foreground shadow font-heading gap-1";
        } else {
            btn.className = "lang-btn inline-flex items-center justify-center whitespace-nowrap rounded-md px-2.5 py-1 text-[10px] font-semibold transition-all focus-visible:outline-none text-muted-foreground hover:text-foreground font-heading";
        }
    });

    // Grounded Feed CSS styles injection (Option 1)
    const groundedStyle = document.createElement('style');
    groundedStyle.innerHTML = `
        #feed-grid.grounded-feed img {
            filter: blur(20px) grayscale(100%) !important;
            opacity: 0.65 !important;
            transition: filter 0.4s ease, opacity 0.4s ease, transform 0.4s ease !important;
        }
        #feed-grid.grounded-feed .group:hover img {
            filter: none !important;
            opacity: 1 !important;
            transform: scale(1.03) !important;
        }
        .scrollbar-none::-webkit-scrollbar {
            display: none !important;
        }
        .scrollbar-none {
            -ms-overflow-style: none !important;
            scrollbar-width: none !important;
        }
    `;
    document.head.appendChild(groundedStyle);

    // Initial state Grounded UI
    const toggleGrounded = document.getElementById("toggle-grounded-mode");
    if (toggleGrounded) {
        if (groundedModeActive) {
            toggleGrounded.classList.add("text-emerald-400", "border-emerald-500/30", "bg-emerald-950/40");
            toggleGrounded.classList.remove("text-muted-foreground", "bg-card");
            feedGrid.classList.add("grounded-feed");
        } else {
            toggleGrounded.classList.remove("text-emerald-400", "border-emerald-500/30", "bg-emerald-950/40");
            toggleGrounded.classList.add("text-muted-foreground", "bg-card");
            feedGrid.classList.remove("grounded-feed");
        }
    }

    // Gems Booster slider initialization (Option 5)
    const slider = document.getElementById("gems-boost-slider");
    if (slider) {
        slider.value = gemsBoostWeight;
        updateGemsSliderLabel(gemsBoostWeight);
    }

    // Dynamically request YouTube player API script (Option 2)
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    fetchInitialFeed();
    setupEventListeners();
});

// Save client state to localStorage
function savePreferencesToStorage() {
    try {
        localStorage.setItem('yt_cleaner_channels', JSON.stringify(channelWeights));
        localStorage.setItem('yt_cleaner_keywords', JSON.stringify(keywordWeights));
        localStorage.setItem('yt_cleaner_seen', JSON.stringify(Array.from(seenVideoIds)));
    } catch (e) {
        console.error("Failed to save preferences to localStorage:", e);
    }
}

// Event listeners setup
function setupEventListeners() {
    // Brand logo click to return home
    if (brandLogo) {
        brandLogo.addEventListener("click", () => {
            resetSearchAndGoHome();
        });
    }

    // Toggle quick filters panel tray
    const toggleFiltersHandler = () => {
        if (quickFiltersPanel) {
            quickFiltersPanel.classList.toggle("hidden");
            [filtersToggle, filtersToggleMobile].forEach(btn => {
                if (btn) {
                    btn.classList.toggle("bg-primary");
                    btn.classList.toggle("text-primary-foreground");
                    btn.classList.toggle("bg-card");
                    btn.classList.toggle("text-foreground");
                }
            });
        }
    };
    if (filtersToggle) filtersToggle.addEventListener("click", toggleFiltersHandler);
    if (filtersToggleMobile) filtersToggleMobile.addEventListener("click", toggleFiltersHandler);

    // Keyboard shortcut / focus search
    document.addEventListener("keydown", (e) => {
        const isTyping = document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA";
        
        if (isTyping) {
            if (e.key === "Escape") {
                if (searchSuggestions) searchSuggestions.classList.add("hidden");
                searchInput.blur();
            }
            return;
        }

        if (e.key === "/") {
            e.preventDefault();
            searchInput.focus();
            searchInput.select();
        }
    });

    // Toggle suggestions dropdown on focus
    if (searchInput && searchSuggestions) {
        searchInput.addEventListener("focus", () => {
            updateSearchSuggestions();
            searchSuggestions.classList.remove("hidden");
        });
        
        searchInput.addEventListener("blur", () => {
            setTimeout(() => {
                searchSuggestions.classList.add("hidden");
            }, 180);
        });
    }

    // Search Submit
    searchForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (query) {
            currentSearchQuery = query;
            fetchInitialFeed(query);
        }
        if (searchSuggestions) searchSuggestions.classList.add("hidden");
        searchInput.blur();
    });

    // Refresh Feed handlers
    const refreshHandler = () => {
        resetSearchAndGoHome();
    };
    if (refreshBtn) refreshBtn.addEventListener("click", refreshHandler);
    if (refreshBtnMobile) refreshBtnMobile.addEventListener("click", refreshHandler);

    // Sidebar drawer toggles (both desktop and mobile)
    if (sidebarToggle) sidebarToggle.addEventListener("click", openSidebar);
    if (sidebarToggleMobile) sidebarToggleMobile.addEventListener("click", openSidebar);
    if (sidebarClose) sidebarClose.addEventListener("click", closeSidebar);
    if (sidebarBackdrop) sidebarBackdrop.addEventListener("click", closeSidebar);

    // High-Level Category buttons click
    document.querySelectorAll(".category-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const category = btn.getAttribute("data-category");
            if (category) {
                setCategory(category);
            }
        });
    });

    // Topic Pills handler
    document.querySelectorAll(".topic-pill").forEach(pill => {
        pill.addEventListener("click", () => {
            const topic = pill.getAttribute("data-topic");
            if (topic) {
                searchInput.value = topic;
                currentSearchQuery = topic;
                fetchInitialFeed(topic);
            }
        });
    });

    // Feed Type Tabs
    if (tabAll) tabAll.addEventListener("click", () => setTab("all"));
    if (tabGems) tabGems.addEventListener("click", () => setTab("gems"));
    if (tabConsolidated) tabConsolidated.addEventListener("click", () => setTab("consolidated"));

    // Anti-Clickbait Toggle
    if (toggleAntiClickbait) {
        toggleAntiClickbait.addEventListener("click", () => {
            hideClickbaitActive = !hideClickbaitActive;
            
            if (hideClickbaitActive) {
                toggleAntiClickbait.classList.remove("text-muted-foreground", "bg-card");
                toggleAntiClickbait.classList.add("text-emerald-400", "border-emerald-500/30", "bg-emerald-950/40");
            } else {
                toggleAntiClickbait.classList.remove("text-emerald-400", "border-emerald-500/30", "bg-emerald-950/40");
                toggleAntiClickbait.classList.add("text-muted-foreground", "bg-card");
            }
            
            processAndRenderVideos(currentRawVideos, false);
        });
    }

    // Infinite Scroll listener
    if (feedScrollContainer) {
        feedScrollContainer.addEventListener("scroll", () => {
            const scrollTop = feedScrollContainer.scrollTop;
            const scrollHeight = feedScrollContainer.scrollHeight;
            const clientHeight = feedScrollContainer.clientHeight;
            
            if (scrollTop + clientHeight >= scrollHeight - 250) {
                fetchMoreVideos();
            }
        });
    }

    // Clear memory weights
    clearMemBtn.addEventListener("click", () => {
        if (confirm("Are you sure you want to clear all learning memory? This will reset all weights and channels data in this browser.")) {
            channelWeights = {};
            keywordWeights = {};
            seenVideoIds.clear();
            bannedChannels.clear();
            localStorage.removeItem('yt_cleaner_banned_channels');
            savePreferencesToStorage();
            renderPreferencesList();
            processAndRenderVideos(currentRawVideos, false);
        }
    });

    // Language select buttons click
    document.querySelectorAll(".lang-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const lang = btn.getAttribute("data-lang");
            if (lang) {
                setLanguage(lang);
            }
        });
    });

    // Add Curated Seed Form (Upgrade B)
    const addSeedForm = document.getElementById("add-seed-form");
    if (addSeedForm) {
        addSeedForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const input = document.getElementById("new-seed-input");
            const val = input.value.trim();
            if (val) {
                if (!customSeeds[currentCategory]) {
                    customSeeds[currentCategory] = [];
                }
                if (!customSeeds[currentCategory].includes(val)) {
                    customSeeds[currentCategory].push(val);
                    localStorage.setItem('yt_cleaner_custom_seeds', JSON.stringify(customSeeds));
                    renderCuratedSeeds();
                    fetchInitialFeed();
                }
                input.value = "";
            }
        });
    }

    // Grounded Mode toggle click (Option 1)
    const toggleGroundedBtn = document.getElementById("toggle-grounded-mode");
    if (toggleGroundedBtn) {
        toggleGroundedBtn.addEventListener("click", () => {
            groundedModeActive = !groundedModeActive;
            localStorage.setItem('yt_cleaner_grounded', groundedModeActive);
            
            if (groundedModeActive) {
                toggleGroundedBtn.classList.add("text-emerald-400", "border-emerald-500/30", "bg-emerald-950/40");
                toggleGroundedBtn.classList.remove("text-muted-foreground", "bg-card");
                feedGrid.classList.add("grounded-feed");
            } else {
                toggleGroundedBtn.classList.remove("text-emerald-400", "border-emerald-500/30", "bg-emerald-950/40");
                toggleGroundedBtn.classList.add("text-muted-foreground", "bg-card");
                feedGrid.classList.remove("grounded-feed");
            }
        });
    }

    // Time budget filter buttons click (Option 4)
    document.querySelectorAll(".time-filter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const range = btn.getAttribute("data-range");
            activeTimeBudget = range;
            
            document.querySelectorAll(".time-filter-btn").forEach(b => {
                const bRange = b.getAttribute("data-range");
                if (bRange === range) {
                    b.className = "time-filter-btn inline-flex items-center justify-center whitespace-nowrap rounded-md px-2.5 py-1 text-[10px] font-bold transition-all focus-visible:outline-none bg-background text-foreground shadow font-heading";
                } else {
                    b.className = "time-filter-btn inline-flex items-center justify-center whitespace-nowrap rounded-md px-2.5 py-1 text-[10px] font-semibold transition-all focus-visible:outline-none text-muted-foreground hover:text-foreground font-heading";
                }
            });
            
            processAndRenderVideos(currentRawVideos, false);
        });
    });

    // Gems Booster slider change (Option 5)
    const gemsSlider = document.getElementById("gems-boost-slider");
    if (gemsSlider) {
        gemsSlider.addEventListener("input", (e) => {
            const val = parseInt(e.target.value);
            gemsBoostWeight = val;
            localStorage.setItem('yt_cleaner_gems_boost', val);
            updateGemsSliderLabel(val);
            processAndRenderVideos(currentRawVideos, false);
        });
    }

    // Close Player Modal actions (Option 2)
    const closePlayerBtn = document.getElementById("close-player-btn");
    if (closePlayerBtn) {
        closePlayerBtn.addEventListener("click", closePlayerModal);
    }
    const playerModalBackdrop = document.getElementById("player-modal");
    if (playerModalBackdrop) {
        playerModalBackdrop.addEventListener("click", (e) => {
            if (e.target === playerModalBackdrop) {
                closePlayerModal();
            }
        });
    }
}

// Update search suggestions list dynamically
function updateSearchSuggestions() {
    const list = document.getElementById("suggestions-list");
    if (!list) return;
    
    const items = categorySuggestions[currentCategory] || categorySuggestions.general;
    
    list.innerHTML = items.map(item => `
        <button type="button" class="suggestion-item w-full text-left px-2 py-1.5 text-xs rounded-sm hover:bg-secondary text-foreground/90 transition-colors font-medium flex items-center gap-2" data-query="${item.query}">
            <span>${item.label}</span>
        </button>
    `).join("");
    
    list.querySelectorAll(".suggestion-item").forEach(item => {
        item.addEventListener("click", () => {
            const query = item.getAttribute("data-query");
            if (query) {
                searchInput.value = query;
                currentSearchQuery = query;
                fetchInitialFeed(query);
            }
        });
    });
}

// Change category
function setCategory(category) {
    currentCategory = category;
    
    document.querySelectorAll(".category-btn").forEach(btn => {
        const catAttr = btn.getAttribute("data-category");
        if (catAttr === category) {
            btn.className = "category-btn h-8 px-4 rounded-md text-xs font-bold transition-all bg-primary text-primary-foreground font-heading flex items-center gap-1.5 shadow";
        } else {
            btn.className = "category-btn h-8 px-4 rounded-md text-xs font-semibold transition-all border border-border bg-card text-muted-foreground hover:text-foreground font-heading flex items-center gap-1.5";
        }
    });
    
    searchInput.value = "";
    currentSearchQuery = "";
    
    updateSearchSuggestions();
    renderCuratedSeeds();
    fetchInitialFeed();
}

// Set active tab style
function setTab(tabType) {
    activeTab = tabType;
    
    const tabs = [
        { el: tabAll, type: "all" },
        { el: tabGems, type: "gems" },
        { el: tabConsolidated, type: "consolidated" }
    ];
    
    tabs.forEach(t => {
        if (!t.el) return;
        if (t.type === tabType) {
            t.el.className = "tab-btn inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-bold transition-all focus-visible:outline-none bg-background text-foreground shadow font-heading";
        } else {
            t.el.className = "tab-btn inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-semibold transition-all focus-visible:outline-none text-muted-foreground hover:text-foreground font-heading";
        }
    });
    
    processAndRenderVideos(currentRawVideos, false);
}

// Set active language preference
function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('yt_cleaner_lang', lang);
    
    // Update visual styling
    document.querySelectorAll(".lang-btn").forEach(btn => {
        const btnLang = btn.getAttribute("data-lang");
        if (btnLang === lang) {
            btn.className = "lang-btn inline-flex items-center justify-center whitespace-nowrap rounded-md px-2.5 py-1 text-[10px] font-bold transition-all focus-visible:outline-none bg-background text-foreground shadow font-heading gap-1";
        } else {
            btn.className = "lang-btn inline-flex items-center justify-center whitespace-nowrap rounded-md px-2.5 py-1 text-[10px] font-semibold transition-all focus-visible:outline-none text-muted-foreground hover:text-foreground font-heading";
        }
    });
    
    fetchInitialFeed();
}

// Reset search state
function resetSearchAndGoHome() {
    searchInput.value = "";
    currentSearchQuery = "";
    fetchInitialFeed();
}

// Sidebar drawer operations
function openSidebar() {
    sidebarPanel.classList.remove("translate-x-full");
    sidebarPanel.classList.add("translate-x-0");
    sidebarBackdrop.classList.remove("hidden");
}

function closeSidebar() {
    sidebarPanel.classList.remove("translate-x-0");
    sidebarPanel.classList.add("translate-x-full");
    sidebarBackdrop.classList.add("hidden");
}

// Extract keywords safely
function extractKeywords(title) {
    if (!title || typeof title !== "string") return [];
    const words = title.toLowerCase().match(/\b[a-zA-Záéíóúñ]{4,15}\b/g) || [];
    const stopWords = new Set([
        'with', 'your', 'from', 'this', 'that', 'about', 'how', 'what', 'why', 'who', 'where', 'when',
        'para', 'como', 'este', 'esta', 'todo', 'sobre', 'pero', 'bien', 'clase', 'curso'
    ]);
    return words.filter(w => !stopWords.has(w));
}

// Universal clickbait check (no property escapes)
function checkClickbait(title) {
    if (!title || typeof title !== "string") return { detected: false };
    
    const patterns = [
        /\b(increible|alucinante|no\s+creeras|sorprendente|revelado|por\s+fin|la\s+verdad\s+sobre|esto\s+cambia\s+todo|el\s+fin\s+de|nunca\s+antes|secreto|brutal|impactante|urgente|atencion)\b/i,
        /\b(shocking|must\s+watch|won't\s+believe|revealed|finally|truth\s+about|changes\s+everything|end\s+of|never\s+before|secret|mind-blowing|unbelievable)\b/i
    ];
    
    for (let pattern of patterns) {
        const match = title.match(pattern);
        if (match) {
            return { detected: true, reason: `Sensationalist phrase detected ('${match[0]}')` };
        }
    }
    
    const words = title.split(/\s+/).filter(w => w.length > 0);
    const capsWords = words.filter(w => w === w.toUpperCase() && w.replace(/[^\w]/g, '').length > 2);
    if (words.length >= 4 && (capsWords.length / words.length) >= 0.3) {
        return { detected: true, reason: `Excessive ALL CAPS words (${capsWords.length} words)` };
    }
    
    // Universally compatible emoji character ranges
    const emojiMatch = title.match(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g) || [];
    if (emojiMatch.length > 3) {
        return { detected: true, reason: `Excessive emojis (${emojiMatch.length} emojis)` };
    }
    
    return { detected: false };
}

// Load initial feed
function fetchInitialFeed(query = "") {
    if (isLoading) return;
    
    isLoading = true;
    currentRawVideos = [];
    loadedVideoIds.clear();
    
    feedGrid.innerHTML = "";
    loadingState.classList.remove("hidden");
    emptyState.classList.add("hidden");
    infiniteLoadingState.classList.add("hidden");
    
    if (query) {
        feedTitle.innerHTML = `Search: "${query}" <button id="clear-search-btn" class="text-xs text-muted-foreground hover:text-foreground underline ml-2.5 font-semibold font-heading" title="Go back to curated feed">Back to Home</button>`;
        feedDesc.textContent = "Auto-filtering video feed in real-time.";
        
        setTimeout(() => {
            const clearSearchBtn = document.getElementById("clear-search-btn");
            if (clearSearchBtn) {
                clearSearchBtn.addEventListener("click", resetSearchAndGoHome);
            }
        }, 50);
    } else {
        const catLabel = currentCategory.charAt(0).toUpperCase() + currentCategory.slice(1);
        feedTitle.textContent = `${catLabel} Curated Feed`;
        feedDesc.textContent = `Clean, clickbait-free ${currentCategory} videos mixed according to your preferences.`;
    }

    // Gather top 5 positive keywords to personalize the dynamic category queries
    const topKeywords = Object.entries(keywordWeights)
        .filter(([_, w]) => w > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([kw]) => kw);
    const kwsParam = topKeywords.length > 0 ? `&kws=${encodeURIComponent(topKeywords.join(','))}` : '';

    // Gather active category custom seeds (Upgrade B)
    const activeSeeds = customSeeds[currentCategory] || [];
    const seedsParam = activeSeeds.length > 0 ? `&seeds=${encodeURIComponent(activeSeeds.join(','))}` : '';

    // Gather highly liked channels to pull their uploads (Upgrade C)
    const favChannels = Object.entries(channelWeights)
        .filter(([_, w]) => w >= 15)
        .map(([c]) => c);
    const channelsParam = favChannels.length > 0 ? `&fav_channels=${encodeURIComponent(favChannels.join(','))}` : '';

    const url = query 
        ? `/api/videos?q=${encodeURIComponent(query)}` 
        : `/api/videos?category=${currentCategory}&lang=${currentLang}${kwsParam}${seedsParam}${channelsParam}`;
    
    fetch(url)
        .then(res => res.json())
        .then(data => {
            const rawVideos = data.videos || [];
            loadingState.classList.add("hidden");
            isLoading = false;
            
            if (rawVideos.length === 0) {
                emptyState.classList.remove("hidden");
                videoCountBadge.textContent = "0 videos";
                return;
            }
            
            currentRawVideos = rawVideos;
            processAndRenderVideos(currentRawVideos, false);
        })
        .catch(err => {
            console.error("Error loading initial feed:", err);
            feedGrid.innerHTML = `<div class="col-span-full py-16 text-center text-rose-400 font-medium">Connection error with the server. Make sure the FastAPI backend is running.</div>`;
            loadingState.classList.add("hidden");
            isLoading = false;
        });
}

// Fetch more videos (Infinite Scroll)
function fetchMoreVideos() {
    if (isLoading) return;
    
    isLoading = true;
    infiniteLoadingState.classList.remove("hidden");
    
    // Gather top 5 positive keywords to personalize the scroll category queries
    const topKeywords = Object.entries(keywordWeights)
        .filter(([_, w]) => w > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([kw]) => kw);
    const kwsParam = topKeywords.length > 0 ? `&kws=${encodeURIComponent(topKeywords.join(','))}` : '';

    // Gather active category custom seeds (Upgrade B)
    const activeSeeds = customSeeds[currentCategory] || [];
    const seedsParam = activeSeeds.length > 0 ? `&seeds=${encodeURIComponent(activeSeeds.join(','))}` : '';

    // Gather highly liked channels to pull their uploads (Upgrade C)
    const favChannels = Object.entries(channelWeights)
        .filter(([_, w]) => w >= 15)
        .map(([c]) => c);
    const channelsParam = favChannels.length > 0 ? `&fav_channels=${encodeURIComponent(favChannels.join(','))}` : '';

    const url = currentSearchQuery 
        ? `/api/videos?q=${encodeURIComponent(currentSearchQuery)}` 
        : `/api/videos?category=${currentCategory}&lang=${currentLang}${kwsParam}${seedsParam}${channelsParam}`;
    
    fetch(url)
        .then(res => res.json())
        .then(data => {
            const newRawVideos = data.videos || [];
            infiniteLoadingState.classList.add("hidden");
            isLoading = false;
            
            if (newRawVideos.length === 0) return;
            
            newRawVideos.forEach(v => {
                if (!currentRawVideos.some(x => x.id === v.id)) {
                    currentRawVideos.push(v);
                }
            });
            
            processAndRenderVideos(currentRawVideos, true);
        })
        .catch(err => {
            console.error("Error fetching more videos (Infinite Scroll):", err);
            infiniteLoadingState.classList.add("hidden");
            isLoading = false;
        });
}

// Score, Filter, and Interleave Videos on Client-Side
function processAndRenderVideos(rawVideosList, isAppend = false) {
    try {
        let eligible = rawVideosList.filter(v => v && v.id && !seenVideoIds.has(v.id) && !bannedChannels.has(v.channel));
        
        // Filter by detected language if language is selected (not mixed) (Upgrade A)
        if (currentLang === "es") {
            eligible = eligible.filter(v => detectLanguage(v.title) !== "en");
        } else if (currentLang === "en") {
            eligible = eligible.filter(v => detectLanguage(v.title) !== "es");
        }
        
        eligible = eligible.filter(v => (channelWeights[v.channel] || 0) > -30);
        
        eligible = eligible.filter(v => {
            if (v.duration > 0) {
                if (v.duration < 120) return false;
                if (v.duration > 5400) return false;
            }
            return true;
        });

        // Filter by Time Budget range (Option 4)
        eligible = eligible.filter(v => {
            if (activeTimeBudget === "pills") {
                return v.duration > 0 && v.duration < 300; // Under 5 mins
            } else if (activeTimeBudget === "standard") {
                return v.duration >= 300 && v.duration <= 1500; // 5 to 25 mins
            } else if (activeTimeBudget === "deep") {
                return v.duration > 1500; // Over 25 mins
            }
            return true; // All Time
        });
        
        eligible = eligible.filter(v => {
            const chanWeight = channelWeights[v.channel] || 0;
            if (v.view_count > 0 && v.view_count < 1000 && chanWeight <= 0) {
                return false;
            }
            return true;
        });
        
        const scoredList = eligible.map(video => {
            let score = 50;
            const reasons = [];
            
            const chanW = channelWeights[video.channel] || 0;
            if (chanW !== 0) {
                score += chanW;
                reasons.push(`Channel '${video.channel}' (${chanW > 0 ? '+' : ''}${chanW} pts)`);
            }
            
            const keywords = extractKeywords(video.title);
            let kwScore = 0;
            const kwMatches = [];
            keywords.forEach(kw => {
                const kwW = keywordWeights[kw] || 0;
                if (kwW !== 0) {
                    kwScore += kwW;
                    kwMatches.push(`'${kw}' (${kwW > 0 ? '+' : ''}${kwW})`);
                }
            });
            if (kwScore !== 0) {
                score += kwScore;
                reasons.push(`Keywords: ${kwMatches.join(', ')}`);
            }
            
            const clickbait = checkClickbait(video.title);
            if (clickbait.detected) {
                score -= 25;
                reasons.push(`Clickbait detected: ${clickbait.reason} (-25 pts)`);
            }
            
            // Gems Boosting/Mainstream blocker (Option 5)
            const isGem = video.view_count > 0 && video.view_count < 50000;
            const boostFactor = Math.round((gemsBoostWeight - 50) * 0.6); // Range: -30 to +30
            if (isGem) {
                score += boostFactor;
                if (boostFactor !== 0) {
                    reasons.push(`Emerging Gem priority boost (${boostFactor > 0 ? '+' : ''}${boostFactor} pts)`);
                }
            } else {
                score -= boostFactor;
                if (boostFactor !== 0) {
                    reasons.push(`Consolidated mainstream discount (${boostFactor > 0 ? '-' : '+'}${Math.abs(boostFactor)} pts)`);
                }
            }

            const scoredVideo = { ...video };
            scoredVideo.score = Math.max(0, Math.min(100, score));
            scoredVideo.reasons = reasons.length > 0 ? reasons : ["Passed quality checks (Neutral)"];
            scoredVideo.is_clickbait = clickbait.detected;
            scoredVideo.type = video.view_count >= 50000 ? "consolidated" : "gem";
            
            return scoredVideo;
        });
        
        currentVideos = scoredList;
        
        let filteredList = currentVideos;
        if (activeTab === "gems") {
            filteredList = filteredList.filter(v => v.type === "gem");
        } else if (activeTab === "consolidated") {
            filteredList = filteredList.filter(v => v.type === "consolidated");
        }
        
        if (hideClickbaitActive) {
            filteredList = filteredList.filter(v => !v.is_clickbait);
        }
        
        const consolidatedList = filteredList.filter(v => v.type === "consolidated");
        const gemsList = filteredList.filter(v => v.type === "gem");
        
        consolidatedList.sort((a, b) => b.score - a.score || b.view_count - a.view_count);
        gemsList.sort((a, b) => b.score - a.score || b.view_count - a.view_count);
        
        const interleaved = [];
        let i = 0, j = 0;
        while (i < consolidatedList.length || j < gemsList.length) {
            if (i < consolidatedList.length) {
                interleaved.push(consolidatedList[i]);
                i++;
            }
            if (j < gemsList.length) {
                interleaved.push(gemsList[j]);
                j++;
            }
        }
        
        loadedVideoIds.clear();
        interleaved.forEach(v => loadedVideoIds.add(v.id));
        
        videoCountBadge.textContent = `${loadedVideoIds.size} videos`;
        
        renderGrid(interleaved, isAppend);
    } catch (error) {
        console.error("Error in processAndRenderVideos:", error);
        throw error;
    }
}

// Render video cards inside the feed grid container
function renderGrid(videosList, isAppend = false) {
    if (!isAppend) {
        feedGrid.innerHTML = "";
    }
    
    if (videosList.length === 0) {
        emptyState.classList.remove("hidden");
        return;
    } else {
        emptyState.classList.add("hidden");
    }
    
    videosList.forEach(video => {
        let scoreColorClass = "text-zinc-400";
        if (video.score >= 70) {
            scoreColorClass = "text-emerald-400";
        } else if (video.score < 40) {
            scoreColorClass = "text-rose-400";
        }
        
        const typeLabel = video.type === "consolidated" ? "Consolidated" : "Emerging Gem";
        const typeColorClass = video.type === "consolidated" ? "text-blue-400" : "text-amber-400";
        
        const durationStr = formatDuration(video.duration);
        const viewsStr = formatViews(video.view_count);
        const reasonsHtml = (video.reasons || ["Passed quality checks (Neutral)"]).map(r => `<li class="flex items-center gap-1.5"><span class="w-1 h-1 rounded-full bg-zinc-500"></span>${r}</li>`).join("");

        const card = document.createElement("div");
        card.id = `video-card-${video.id}`;
        card.className = "group relative rounded-lg border border-border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:border-zinc-700 flex flex-col justify-between overflow-hidden";
        card.innerHTML = `
            <div>
                <!-- Thumbnail -->
                <div class="relative aspect-video w-full overflow-hidden bg-muted">
                    <a href="${video.url}" target="_blank" onclick="event.preventDefault(); playVideo('${video.id}')" class="block w-full h-full">
                        <img 
                            src="${video.thumbnail}" 
                            alt="${video.title}" 
                            class="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                        >
                    </a>
                    ${durationStr ? `<span class="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-tight text-white">${durationStr}</span>` : ''}
                    
                    <!-- Sponsor Warning Badge (Option 4) -->
                    <div id="sponsor-badge-${video.id}" class="absolute top-2 left-2 hidden">
                        <span class="bg-amber-500/90 text-zinc-950 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shadow font-heading select-none">
                            <i data-lucide="alert-triangle" class="h-2.5 w-2.5 text-zinc-950"></i>
                            Sponsor
                        </span>
                    </div>
                </div>

                <!-- Text metadata -->
                <div class="p-4 space-y-2">
                    <div class="space-y-1">
                        <a href="${video.url}" target="_blank" onclick="event.preventDefault(); playVideo('${video.id}')" class="block">
                            <h3 class="text-sm font-semibold tracking-tight line-clamp-2 hover:text-white transition-colors font-sans leading-snug" title="${video.title}">
                                ${video.title}
                            </h3>
                        </a>
                        <p class="text-xs text-muted-foreground font-medium truncate mt-2 leading-none">${video.channel}</p>
                    </div>

                    <div class="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold flex-wrap">
                        <span>${viewsStr}</span>
                        ${video.upload_date ? `<span>•</span> <span>${formatUploadDate(video.upload_date)}</span>` : ''}
                        <span>•</span>
                        <span class="${typeColorClass}">${typeLabel}</span>
                        <span>•</span>
                        <span class="${scoreColorClass} font-mono font-bold">Score: ${video.score}</span>
                    </div>

                    <!-- Explanations details -->
                    <div class="mt-3 pt-2 border-t border-border/40">
                        <details class="text-[10px] text-muted-foreground font-medium cursor-pointer">
                            <summary class="hover:text-foreground font-semibold select-none flex items-center justify-between">
                                Why this score?
                                <i data-lucide="chevron-down" class="h-3 w-3 inline ml-1 opacity-70"></i>
                            </summary>
                            <ul class="mt-1.5 space-y-1 pl-0.5 font-normal leading-relaxed text-muted-foreground/90">
                                ${reasonsHtml}
                            </ul>
                        </details>
                    </div>
                </div>
            </div>

            <!-- Footer Action Controls (English) -->
            <div class="p-4 pt-0 border-t border-border/30 mt-auto flex items-center justify-between gap-1.5">
                <button 
                    onclick="submitFeedback('${video.id}', 'like')"
                    class="flex-1 h-8 rounded-md bg-secondary hover:bg-emerald-950/40 border border-transparent hover:border-emerald-900/30 text-muted-foreground hover:text-emerald-400 text-[11px] font-bold transition-colors flex items-center justify-center gap-1 font-heading"
                    title="Keep this video and channels/keywords like this"
                >
                    <i data-lucide="thumbs-up" class="h-3.5 w-3.5"></i>
                    Keep
                </button>
                <button 
                    onclick="submitFeedback('${video.id}', 'dislike')"
                    class="flex-1 h-8 rounded-md bg-secondary hover:bg-rose-950/40 border border-transparent hover:border-rose-900/30 text-muted-foreground hover:text-rose-400 text-[11px] font-bold transition-colors flex items-center justify-center gap-1 font-heading"
                    title="Mark as junk (penalize channel/keywords)"
                >
                    <i data-lucide="thumbs-down" class="h-3.5 w-3.5"></i>
                    Junk
                </button>
                <button 
                    onclick="submitFeedback('${video.id}', 'skip')"
                    class="h-8 w-8 rounded-md bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
                    title="Hide (already seen)"
                >
                    <i data-lucide="eye-off" class="h-3.5 w-3.5"></i>
                </button>
                <button 
                    onclick="banChannel('${video.channel.replace(/'/g, "\\'")}')"
                    class="h-8 w-8 rounded-md bg-secondary hover:bg-rose-950/40 border border-transparent hover:border-rose-900/30 text-muted-foreground hover:text-rose-400 transition-colors flex items-center justify-center animate-fade-in"
                    title="Ban channel (never show again)"
                >
                    <i data-lucide="ban" class="h-3.5 w-3.5"></i>
                </button>
            </div>
        `;
        
        feedGrid.appendChild(card);
    });

    // Bulk query SponsorBlock segments for all active videos in the grid (Option 4)
    const activeVideoIds = videosList.map(v => v.id);
    if (activeVideoIds.length > 0) {
        fetchSponsorSegmentsBulk(activeVideoIds);
    }
    
    lucide.createIcons();
}

// Format date YYYYMMDD to human string
function formatUploadDate(dateStr) {
    if (!dateStr || dateStr.length !== 8) return "";
    const y = dateStr.substring(0, 4);
    const m = dateStr.substring(4, 6);
    const d = dateStr.substring(6, 8);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

// Format duration seconds to H:MM:SS or M:SS
function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return "";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// Format view count to K or M notation
function formatViews(views) {
    if (!views || views <= 0) return "No views";
    if (views >= 1000000) {
        return `${(views / 1000000).toFixed(1).replace(/\.0$/, '')}M views`;
    }
    if (views >= 1000) {
        return `${(views / 1000).toFixed(1).replace(/\.0$/, '')}K views`;
    }
    return `${views} views`;
}

// Log Thumbs Feedback and re-score local list
function submitFeedback(videoId, action) {
    const card = document.getElementById(`video-card-${videoId}`);
    const video = currentVideos.find(v => v.id === videoId);
    
    if (!video) return;

    if (card) {
        if (action === 'like') {
            card.classList.add("ring-2", "ring-emerald-500/50", "border-emerald-500");
            setTimeout(() => {
                card.classList.remove("ring-2", "ring-emerald-500/50");
            }, 800);
        } else {
            card.classList.add("scale-95", "opacity-0");
        }
    }

    // Apply learning memory inside browser localStorage
    if (action === 'like') {
        channelWeights[video.channel] = (channelWeights[video.channel] || 0) + 15;
        const keywords = extractKeywords(video.title);
        keywords.forEach(kw => {
            keywordWeights[kw] = (keywordWeights[kw] || 0) + 3;
        });
        seenVideoIds.add(videoId);
    } 
    else if (action === 'dislike') {
        channelWeights[video.channel] = (channelWeights[video.channel] || 0) - 30;
        const keywords = extractKeywords(video.title);
        keywords.forEach(kw => {
            keywordWeights[kw] = (keywordWeights[kw] || 0) - 5;
        });
        seenVideoIds.add(videoId);
    } 
    else if (action === 'skip') {
        seenVideoIds.add(videoId);
    }

    savePreferencesToStorage();
    renderPreferencesList();
    
    if (action !== 'like' && card) {
        setTimeout(() => {
            card.remove();
            loadedVideoIds.delete(videoId);
            currentRawVideos = currentRawVideos.filter(v => v.id !== videoId);
            videoCountBadge.textContent = `${loadedVideoIds.size} videos`;
            
            if (feedGrid.children.length === 0) {
                emptyState.classList.remove("hidden");
            }
        }, 300);
    } else {
        processAndRenderVideos(currentRawVideos, false);
    }
}

// Render weights display on sidebar
function renderPreferencesList() {
    const channels = Object.entries(channelWeights)
        .map(([name, weight]) => ({ name, weight }))
        .filter(c => c.weight !== 0)
        .sort((a, b) => b.weight - a.weight);

    const keywords = Object.entries(keywordWeights)
        .map(([name, weight]) => ({ name, weight }))
        .filter(kw => kw.weight !== 0)
        .sort((a, b) => b.weight - a.weight);

    if (channels.length === 0) {
        learnedChannelsContainer.innerHTML = `<p class="text-[10px] text-muted-foreground italic">No records yet.</p>`;
    } else {
        learnedChannelsContainer.innerHTML = channels.map(c => {
            const isPos = c.weight > 0;
            const badgeClass = isPos 
                ? "bg-emerald-950/60 text-emerald-400 border-emerald-900/30 hover:bg-emerald-900/40" 
                : "bg-rose-950/60 text-rose-400 border-rose-900/30 hover:bg-rose-900/40";
            return `
                <span class="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold border ${badgeClass} font-mono select-none">
                    ${c.name} (${isPos ? '+' : ''}${c.weight})
                </span>
            `;
        }).join("");
    }

    if (keywords.length === 0) {
        learnedKeywordsContainer.innerHTML = `<p class="text-[10px] text-muted-foreground italic">No records yet.</p>`;
    } else {
        learnedKeywordsContainer.innerHTML = keywords.map(kw => {
            const isPos = kw.weight > 0;
            const badgeClass = isPos 
                ? "bg-emerald-950/60 text-emerald-400 border-emerald-900/30 hover:bg-emerald-900/40" 
                : "bg-rose-950/60 text-rose-400 border-rose-900/30 hover:bg-rose-900/40";
            return `
                <span class="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold border ${badgeClass} font-mono select-none">
                    ${kw.name} (${isPos ? '+' : ''}${kw.weight})
                </span>
            `;
        }).join("");
    }
}

// Render and manage custom category seeds (Upgrade B)
function renderCuratedSeeds() {
    const listContainer = document.getElementById("curated-seeds-list");
    if (!listContainer) return;
    
    const activeSeeds = customSeeds[currentCategory] || [];
    
    if (activeSeeds.length === 0) {
        listContainer.innerHTML = `<p class="text-[10px] text-muted-foreground italic">No custom seeds.</p>`;
        return;
    }
    
    listContainer.innerHTML = activeSeeds.map((seed, idx) => `
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold border border-zinc-700 bg-zinc-900/60 text-foreground/90 font-mono select-none">
            ${seed}
            <button type="button" onclick="deleteSeed('${currentCategory}', ${idx})" class="hover:text-rose-400 focus:outline-none ml-0.5">
                <i data-lucide="x" class="h-2.5 w-2.5"></i>
            </button>
        </span>
    `).join("");
    
    lucide.createIcons();
}

// Delete specific seed (Upgrade B)
window.deleteSeed = function(category, index) {
    const activeSeeds = customSeeds[category] || [];
    activeSeeds.splice(index, 1);
    localStorage.setItem('yt_cleaner_custom_seeds', JSON.stringify(customSeeds));
    renderCuratedSeeds();
    fetchInitialFeed();
};

// Client-Side Language Detector (Upgrade A)
function detectLanguage(title) {
    if (!title || typeof title !== "string") return "unknown";
    const words = title.toLowerCase().split(/\s+/);
    
    const esStop = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'y', 'en', 'de', 'para', 'con', 'que', 'del', 'al', 'como', 'este', 'esta']);
    const enStop = new Set(['the', 'a', 'an', 'and', 'of', 'for', 'with', 'to', 'in', 'on', 'at', 'by', 'this', 'that', 'is', 'are', 'was', 'were']);
    
    let esCount = 0;
    let enCount = 0;
    
    words.forEach(w => {
        const clean = w.replace(/[^\w]/g, '');
        if (esStop.has(clean)) esCount++;
        if (enStop.has(clean)) enCount++;
    });
    
    if (esCount > enCount) return "es";
    if (enCount > esCount) return "en";
    if (/[áéíóúñÁÉÍÓÚÑ]/i.test(title)) return "es";
    
    return "unknown";
}

// Ban a specific channel entirely (Option 5)
window.banChannel = function(channelName) {
    if (!channelName) return;
    if (confirm(`Are you sure you want to ban and block the channel "${channelName}" entirely?`)) {
        bannedChannels.add(channelName);
        try {
            localStorage.setItem('yt_cleaner_banned_channels', JSON.stringify(Array.from(bannedChannels)));
        } catch (e) {
            console.error("Failed to save banned channels:", e);
        }
        
        // Find all cards from this channel, animate and remove them
        document.querySelectorAll(".group").forEach(card => {
            const chanText = card.querySelector(".text-muted-foreground")?.textContent;
            if (chanText === channelName) {
                card.classList.add("scale-95", "opacity-0");
            }
        });
        
        setTimeout(() => {
            processAndRenderVideos(currentRawVideos, false);
        }, 300);
    }
};

// Fetch SponsorBlock skip segments in bulk (Option 4)
async function fetchSponsorSegmentsBulk(videoIds) {
    if (!videoIds || videoIds.length === 0) return;
    try {
        const response = await fetch("https://sponsor.ajay.app/api/skipSegments", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                videoIds: videoIds,
                categories: ["sponsor"]
            })
        });
        
        if (response.status === 200) {
            const data = await response.json();
            if (data && typeof data === "object" && !Array.isArray(data)) {
                Object.entries(data).forEach(([videoID, segments]) => {
                    if (Array.isArray(segments)) {
                        const sponsorSegs = segments.filter(seg => seg.category === "sponsor");
                        if (sponsorSegs.length > 0) {
                            let totalDuration = 0;
                            sponsorSegs.forEach(seg => {
                                if (seg.segment && seg.segment.length >= 2) {
                                    totalDuration += (seg.segment[1] - seg.segment[0]);
                                }
                            });
                            
                            if (totalDuration > 0) {
                                showSponsorBadge(videoID, Math.round(totalDuration));
                            }
                        }
                    }
                });
            }
        }
    } catch (error) {
        console.warn("Failed to fetch SponsorBlock segments:", error);
    }
}

// Display Sponsor Warning Badge on the video card thumbnail (Option 4)
function showSponsorBadge(videoId, seconds) {
    const badge = document.getElementById(`sponsor-badge-${videoId}`);
    if (!badge) return;
    
    badge.classList.remove("hidden");
    const mins = Math.round(seconds / 60);
    const timeLabel = mins > 0 ? `Sponsor ~${mins}m` : `Sponsor ${seconds}s`;
    
    const badgeSpan = badge.querySelector("span");
    if (badgeSpan) {
        badgeSpan.innerHTML = `
            <i data-lucide="alert-triangle" class="h-2.5 w-2.5"></i>
            ${timeLabel}
        `;
    }
    
    // Add sponsor to reasons list if available
    const card = document.getElementById(`video-card-${videoId}`);
    if (card) {
        const detailsList = card.querySelector("details ul");
        if (detailsList) {
            // Check if already exists
            if (!detailsList.querySelector(".sponsor-reason-item")) {
                const li = document.createElement("li");
                li.className = "sponsor-reason-item flex items-center gap-1.5 text-amber-400 font-medium";
                li.innerHTML = `<span class="w-1 h-1 rounded-full bg-amber-400"></span>Sponsor detected: ~${mins > 0 ? mins + 'm' : seconds + 's'}`;
                detailsList.appendChild(li);
            }
        }
    }
    
    // Refresh lucide icons
    lucide.createIcons();
}

// Global video play click router (handles safe object lookup to avoid quote escaping errors)
window.playVideo = function(videoId) {
    const video = currentVideos.find(v => v.id === videoId);
    if (video) {
        openPlayerModal(video.id, video.title, video.channel, video.score, video.reasons || [], video.url);
    }
};

// Update gems slider text label (Option 5)
function updateGemsSliderLabel(val) {
    const label = document.getElementById("gems-boost-value");
    if (!label) return;
    if (val > 65) {
        label.textContent = `High Gems Boost (${val}%)`;
        label.className = "text-emerald-400 font-mono font-bold";
    } else if (val < 35) {
        label.textContent = `Mainstream Boost (${val}%)`;
        label.className = "text-blue-400 font-mono font-bold";
    } else {
        label.textContent = `Balanced (${val}%)`;
        label.className = "text-amber-400 font-mono font-bold";
    }
}

// Open YouTube Player Modal with Curation Dashboard & Sponsor Auto-Skip (Option 2)
function openPlayerModal(videoId, title, channel, score, reasons, videoUrl) {
    const modal = document.getElementById("player-modal");
    const modalTitle = document.getElementById("modal-video-title");
    const modalChannel = document.getElementById("modal-video-channel");
    const scoreBadge = document.getElementById("modal-video-score");
    const reasonsList = document.getElementById("modal-reasons-list");
    const ytLink = document.getElementById("modal-youtube-link");
    const sponsorSection = document.getElementById("modal-sponsor-section");
    const segmentsList = document.getElementById("modal-sponsor-segments-list");
    
    if (!modal) return;
    
    activePlayingVideoId = videoId;
    modalTitle.textContent = title;
    modalChannel.textContent = channel;
    
    // Set Curation Score Badge with dynamic coloring
    if (scoreBadge) {
        scoreBadge.textContent = `Score: ${score}`;
        scoreBadge.className = "inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold font-mono " +
            (score >= 70 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
             score < 40 ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
             "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20");
    }
    
    // Populate reasons list
    if (reasonsList) {
        reasonsList.innerHTML = reasons.map(r => `
            <li class="flex items-start gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-zinc-500 mt-1 flex-shrink-0"></span>
                <span>${r}</span>
            </li>
        `).join("");
    }
    
    // Set external YouTube link
    if (ytLink) {
        ytLink.href = videoUrl || `https://www.youtube.com/watch?v=${videoId}`;
    }
    
    // Bind Curation action buttons inside the player modal
    const keepBtn = document.getElementById("modal-btn-keep");
    const junkBtn = document.getElementById("modal-btn-junk");
    const banBtn = document.getElementById("modal-btn-ban");
    
    if (keepBtn) {
        keepBtn.onclick = () => {
            submitFeedback(videoId, 'like');
            closePlayerModal();
        };
    }
    if (junkBtn) {
        junkBtn.onclick = () => {
            submitFeedback(videoId, 'dislike');
            closePlayerModal();
        };
    }
    if (banBtn) {
        banBtn.onclick = () => {
            banChannel(channel);
            closePlayerModal();
        };
    }
    
    activeVideoSponsorSegments = [];
    if (sponsorSection) sponsorSection.classList.add("hidden");
    
    // Fetch sponsor segments for player skipping & visualization
    fetch(`https://sponsor.ajay.app/api/skipSegments?videoID=${videoId}&categories=["sponsor"]`)
        .then(res => {
            if (res.status === 200) return res.json();
            return [];
        })
        .then(data => {
            if (Array.isArray(data) && data.length > 0) {
                activeVideoSponsorSegments = data.map(seg => seg.segment);
                if (sponsorSection) sponsorSection.classList.remove("hidden");
                if (segmentsList) {
                    segmentsList.innerHTML = data.map(seg => {
                        const start = formatSegmentTime(seg.segment[0]);
                        const end = formatSegmentTime(seg.segment[1]);
                        return `
                            <li class="flex items-center justify-between text-muted-foreground/80 hover:text-amber-300 transition-colors py-0.5 select-none">
                                <span>Sponsor Block</span>
                                <span class="bg-zinc-800 px-1 rounded text-zinc-400">${start} - ${end}</span>
                            </li>
                        `;
                    }).join("");
                }
            }
        })
        .catch(err => console.warn("Failed to load skip segments for player:", err));

    modal.classList.remove("hidden");
    
    // Load video in YouTube player
    if (typeof YT !== "undefined" && YT.Player) {
        if (youtubePlayer && typeof youtubePlayer.loadVideoById === "function") {
            try {
                youtubePlayer.loadVideoById(videoId);
            } catch (e) {
                fallbackIframeEmbed(videoId);
            }
        } else {
            youtubePlayer = new YT.Player("youtube-player-placeholder", {
                height: "100%",
                width: "100%",
                videoId: videoId,
                playerVars: {
                    autoplay: 1,
                    modestbranding: 1,
                    rel: 0
                }
            });
        }
    } else {
        fallbackIframeEmbed(videoId);
    }
    
    // Start interval listener for auto-skipping sponsor blocks
    if (playerCheckInterval) clearInterval(playerCheckInterval);
    playerCheckInterval = setInterval(checkAndSkipSponsors, 250);
    
    // Refresh icons inside modal
    lucide.createIcons();
}

// Convert seconds count to M:SS layout
function formatSegmentTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// Fallback plain iframe embed if YT API is slow to load
function fallbackIframeEmbed(videoId) {
    document.getElementById("youtube-player-placeholder").innerHTML = `
        <iframe 
            src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1" 
            class="w-full h-full border-0" 
            allow="autoplay; encrypted-media" 
            allowfullscreen
        ></iframe>
    `;
}

// Close player modal and stop video playback (Option 2)
function closePlayerModal() {
    const modal = document.getElementById("player-modal");
    if (modal) {
        modal.classList.add("hidden");
    }
    if (playerCheckInterval) {
        clearInterval(playerCheckInterval);
        playerCheckInterval = null;
    }
    
    if (youtubePlayer && typeof youtubePlayer.stopVideo === "function") {
        try {
            youtubePlayer.stopVideo();
        } catch (e) {
            document.getElementById("youtube-player-placeholder").innerHTML = "";
        }
    } else {
        document.getElementById("youtube-player-placeholder").innerHTML = "";
    }
    activePlayingVideoId = null;
}

// Core auto-skip monitor checking every 250ms (Option 2)
function checkAndSkipSponsors() {
    if (!youtubePlayer || typeof youtubePlayer.getCurrentTime !== "function" || typeof youtubePlayer.getPlayerState !== "function") return;
    if (activeVideoSponsorSegments.length === 0) return;
    
    // Get player state (1 means PLAYING)
    let state = -1;
    try {
        state = youtubePlayer.getPlayerState();
    } catch (e) {
        return;
    }
    
    if (state !== 1) return;
    
    const currentTime = youtubePlayer.getCurrentTime();
    activeVideoSponsorSegments.forEach(seg => {
        const start = seg[0];
        const end = seg[1];
        
        if (currentTime >= start && currentTime < end) {
            youtubePlayer.seekTo(end, true);
            showSkipToast();
        }
    });
}

// Display temporary badge overlay when skipping sponsor blocks
function showSkipToast() {
    let toast = document.getElementById("sponsor-skip-toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "sponsor-skip-toast";
        toast.className = "absolute bottom-16 left-1/2 transform -translate-x-1/2 bg-amber-500 text-zinc-950 font-bold text-xs px-3.5 py-1.5 rounded-full shadow-lg z-50 flex items-center gap-1.5 animate-bounce select-none pointer-events-none";
        toast.innerHTML = `<i data-lucide="sparkles" class="h-3.5 w-3.5 flex-shrink-0"></i> Skipped sponsor segment!`;
        document.getElementById("player-modal").appendChild(toast);
        lucide.createIcons();
    }
    
    setTimeout(() => {
        if (toast && toast.parentNode) {
            toast.remove();
        }
    }, 2200);
}
