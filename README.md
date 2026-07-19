# YT Cleaner 🚀 (Stateless YouTube Curation Feed)

YT Cleaner is an intelligent, database-free YouTube dashboard that filters out clickbait/Shorts and curates a clean feed dynamically. All learning preferences (favorite channels, keyword weights, and skipped video history) are saved inside your browser's local storage, keeping the application fast, portable, and completely private.

💻 **Run Locally in 1 command:** `python -m uvicorn main:app --reload` (Open [http://localhost:8000](http://localhost:8000))

---

## ⚡ Quick Start

### Running Locally
```bash
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

### Running with Docker
```bash
docker build -t yt-cleaner .
docker run -d -p 8000:8000 yt-cleaner
```

---

## ✨ Features (What it does)

- **⚙️ Automated Quality Curation:** Instantly blocks Shorts (< 2 min), blocks streams/movies (> 90 min), blocks low-view spam (< 1000 views), and automatically applies a -25 clickbait score penalty to sensationalist titles.
- **💾 LocalStorage Memory:** Learns your preferences when you click **Keep** (+15 channel, +3 keywords) or **Junk** (-30 channel, -5 keywords). Your weights persist locally in your browser.
- **💎 Balanced Feed:** Mixes and interleaves **Consolidated** ($\ge 50k$ views) and **Emerging Gems** ($< 50k$ views) so small quality creators are not buried.
- **📁 Curated Categories:** Quick tabs for **General**, **Entertainment**, **Music**, and **Education** with category-specific adaptive suggestions.
- **⌨️ Keyboard Shortcuts:** Press `/` to focus the search bar, `ESC` to close suggestions.
- **🗂️ Collapsible Filters:** Category selectors and dials are tucked inside a tray toggled by a header **Filters** button.

---

## 📦 Directory Tree Structure
```
yt-cleaner/
├── static/js/app.js      # Curation engine, localStorage memory & filters (JS)
├── templates/index.html  # Responsive dashboard HTML (Tailwind & custom fonts)
├── Dockerfile            # Lightweight, stateless FastAPI Docker container
├── main.py               # Stateless FastAPI backend (Scraper router)
├── requirements.txt      # Python dependencies
└── youtube_client.py     # yt-dlp metadata scraper
```
