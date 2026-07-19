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

// Local Memory State (localStorage)
let channelWeights = JSON.parse(localStorage.getItem('yt_cleaner_channels') || '{}');
let keywordWeights = JSON.parse(localStorage.getItem('yt_cleaner_keywords') || '{}');
let seenVideoIds = new Set(JSON.parse(localStorage.getItem('yt_cleaner_seen') || '[]'));

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
    updateSearchSuggestions();
    fetchInitialFeed();
    setupEventListeners();
});

// Save client state to localStorage
function savePreferencesToStorage() {
    localStorage.setItem('yt_cleaner_channels', JSON.stringify(channelWeights));
    localStorage.setItem('yt_cleaner_keywords', JSON.stringify(keywordWeights));
    localStorage.setItem('yt_cleaner_seen', JSON.stringify(Array.from(seenVideoIds)));
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
            
            // Re-process current raw list with updated tab filters
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
            savePreferencesToStorage();
            renderPreferencesList();
            processAndRenderVideos(currentRawVideos, false);
        }
    });
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

// Change high-level active category
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
    fetchInitialFeed();
}

// Set active tab style and state
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
    
    // Re-process current raw list with updated tab filters
    processAndRenderVideos(currentRawVideos, false);
}

// Reset search state and return to curated home feed
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

// Extract keywords from title text (ignoring common stop words)
function extractKeywords(title) {
    const words = title.toLowerCase().match(/\b[a-zA-Záéíóúñ]{4,15}\b/g) || [];
    const stopWords = new Set([
        'with', 'your', 'from', 'this', 'that', 'about', 'how', 'what', 'why', 'who', 'where', 'when',
        'para', 'como', 'este', 'esta', 'todo', 'sobre', 'pero', 'bien', 'clase', 'curso'
    ]);
    return words.filter(w => !stopWords.has(w));
}

// Check clickbait features with JS Regex
function checkClickbait(title) {
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
    
    // Check CAPS proportion
    const words = title.split(/\s+/).filter(w => w.length > 0);
    const capsWords = words.filter(w => w === w.toUpperCase() && w.replace(/[^\w]/g, '').length > 2);
    if (words.length >= 4 && (capsWords.length / words.length) >= 0.3) {
        return { detected: true, reason: `Excessive ALL CAPS words (${capsWords.length} words)` };
    }
    
    // Check Emojis
    const emojiMatch = title.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\p{Emoji_Presentation}|\p{Emoji}\uFE0F/gu) || [];
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

    const url = query 
        ? `/api/videos?q=${encodeURIComponent(query)}` 
        : `/api/videos?category=${currentCategory}`;
    
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

// Fetch more videos for Infinite Scroll
function fetchMoreVideos() {
    if (isLoading) return;
    
    isLoading = true;
    infiniteLoadingState.classList.remove("hidden");
    
    const url = currentSearchQuery 
        ? `/api/videos?q=${encodeURIComponent(currentSearchQuery)}` 
        : `/api/videos?category=${currentCategory}`;
    
    fetch(url)
        .then(res => res.json())
        .then(data => {
            const newRawVideos = data.videos || [];
            infiniteLoadingState.classList.add("hidden");
            isLoading = false;
            
            if (newRawVideos.length === 0) return;
            
            // Merge into currentRawVideos
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
    // 1. Filter seen videos
    let eligible = rawVideosList.filter(v => !seenVideoIds.has(v.id));
    
    // 2. Filter blacklisted channels (weight <= -30)
    eligible = eligible.filter(v => (channelWeights[v.channel] || 0) > -30);
    
    // 3. Automated quality duration filters (shorts Blocked, stream Blocked)
    eligible = eligible.filter(v => {
        if (v.duration > 0) {
            if (v.duration < 120) return false; // shorts
            if (v.duration > 5400) return false; // streams
        }
        return true;
    });
    
    // 4. Low view spam filter: views >= 1000 views, unless channel is liked (weight > 0)
    eligible = eligible.filter(v => {
        const chanWeight = channelWeights[v.channel] || 0;
        if (v.view_count > 0 && v.view_count < 1000 && chanWeight <= 0) {
            return false;
        }
        return true;
    });
    
    // 5. Score calculations
    const scoredList = eligible.map(video => {
        let score = 50;
        const reasons = [];
        
        // Channel weight evaluation
        const chanW = channelWeights[video.channel] || 0;
        if (chanW !== 0) {
            score += chanW;
            reasons.push(`Channel '${video.channel}' (${chanW > 0 ? '+' : ''}${chanW} pts)`);
        }
        
        // Keyword weight evaluation
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
        
        // Clickbait penalty check
        const clickbait = checkClickbait(video.title);
        if (clickbait.detected) {
            score -= 25;
            reasons.push(`Clickbait detected: ${clickbait.reason} (-25 pts)`);
        }
        
        // Clone and annotate video
        const scoredVideo = { ...video };
        scoredVideo.score = Math.max(0, Math.min(100, score));
        scoredVideo.reasons = reasons.length > 0 ? reasons : ["Passed quality checks (Neutral)"];
        scoredVideo.is_clickbait = clickbait.detected;
        scoredVideo.type = video.view_count >= 50000 ? "consolidated" : "gem";
        
        return scoredVideo;
    });
    
    // Store in currentVideos state
    currentVideos = scoredList;
    
    // 6. Apply Active Tab filter (Gems vs Consolidated)
    let filteredList = currentVideos;
    if (activeTab === "gems") {
        filteredList = filteredList.filter(v => v.type === "gem");
    } else if (activeTab === "consolidated") {
        filteredList = filteredList.filter(v => v.type === "consolidated");
    }
    
    // Apply Anti-clickbait active filter
    if (hideClickbaitActive) {
        filteredList = filteredList.filter(v => !v.is_clickbait);
    }
    
    // 7. Interleave Consolidated and Gems (one of each, sorted by score)
    const consolidatedList = filteredList.filter(v => v.type === "consolidated");
    const gemsList = filteredList.filter(v => v.type === "gem");
    
    // Sort separately
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
    
    // Sync loaded video IDs track
    loadedVideoIds.clear();
    interleaved.forEach(v => loadedVideoIds.add(v.id));
    
    // Update count indicator
    videoCountBadge.textContent = `${loadedVideoIds.size} videos`;
    
    // Render Grid
    renderGrid(interleaved, isAppend);
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
        const reasonsHtml = video.reasons.map(r => `<li class="flex items-center gap-1.5"><span class="w-1 h-1 rounded-full bg-zinc-500"></span>${r}</li>`).join("");

        const card = document.createElement("div");
        card.id = `video-card-${video.id}`;
        card.className = "group relative rounded-lg border border-border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:border-zinc-700 flex flex-col justify-between overflow-hidden";
        
        card.innerHTML = `
            <div>
                <!-- Thumbnail -->
                <div class="relative aspect-video w-full overflow-hidden bg-muted">
                    <a href="${video.url}" target="_blank" class="block w-full h-full">
                        <img 
                            src="${video.thumbnail}" 
                            alt="${video.title}" 
                            class="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                        >
                    </a>
                    ${durationStr ? `<span class="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-tight text-white">${durationStr}</span>` : ''}
                </div>

                <!-- Text metadata -->
                <div class="p-4 space-y-2">
                    <div class="space-y-1">
                        <a href="${video.url}" target="_blank" class="block">
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
                        <span class="${scoreColorClass} font-mono">Score: ${video.score}</span>
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
            <div class="p-4 pt-0 border-t border-border/30 mt-auto flex items-center justify-between gap-2">
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
            </div>
        `;
        
        feedGrid.appendChild(card);
    });
    
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
        // Channel weight add +15
        channelWeights[video.channel] = (channelWeights[video.channel] || 0) + 15;
        
        // Keywords weight add +3
        const keywords = extractKeywords(video.title);
        keywords.forEach(kw => {
            keywordWeights[kw] = (keywordWeights[kw] || 0) + 3;
        });
        
        // Mark as seen
        seenVideoIds.add(videoId);
    } 
    else if (action === 'dislike') {
        // Channel weight subtract -30 (soft blacklist)
        channelWeights[video.channel] = (channelWeights[video.channel] || 0) - 30;
        
        // Keywords weight subtract -5
        const keywords = extractKeywords(video.title);
        keywords.forEach(kw => {
            keywordWeights[kw] = (keywordWeights[kw] || 0) - 5;
        });
        
        // Mark as seen
        seenVideoIds.add(videoId);
    } 
    else if (action === 'skip') {
        // Simply mark as seen to hide it
        seenVideoIds.add(videoId);
    }

    // Save and update UI
    savePreferencesToStorage();
    renderPreferencesList();
    
    // Immediate local updates
    if (action !== 'like' && card) {
        setTimeout(() => {
            card.remove();
            loadedVideoIds.delete(videoId);
            
            // Remove from local raw list so it's not re-scrawled
            currentRawVideos = currentRawVideos.filter(v => v.id !== videoId);
            videoCountBadge.textContent = `${loadedVideoIds.size} videos`;
            
            if (feedGrid.children.length === 0) {
                emptyState.classList.remove("hidden");
            }
        }, 300);
    } else {
        // Likes keep rendering but prompt recalculation of scores
        processAndRenderVideos(currentRawVideos, false);
    }
}

// Render weights display on sidebar
function renderPreferencesList() {
    // Sort channels
    const channels = Object.entries(channelWeights)
        .map(([name, weight]) => ({ name, weight }))
        .filter(c => c.weight !== 0)
        .sort((a, b) => b.weight - a.weight);

    // Sort keywords
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
