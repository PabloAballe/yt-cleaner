# YT Cleaner 🚀 (Stateless YouTube Curation Feed)

YT Cleaner is an intelligent, database-free YouTube dashboard that filters out clickbait/Shorts and curates your feed dynamically. All learning preferences (weights, skip history, views settings) are saved in your browser's `localStorage`, eliminating the need to deploy or configure a database server.

- 🚀 **Deploy Free on Render in 2 mins:** Connect this repository to [Render](https://render.com) as a Docker web service.
- 💻 **Run Locally in 1 command:** `python -m uvicorn main:app --reload` (Open [http://localhost:8000](http://localhost:8000))

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

- **⚙️ Automated Curation:** Instantly blocks Shorts (< 2 min), blocks streams/movies (> 90 min), blocks low-view spam (< 1000 views), and applies a -25 clickbait score penalty.
- **💾 LocalStorage Memory:** Learns your preferences when you click **Keep** (+15 channel, +3 keywords) or **Junk** (-30 channel, -5 keywords). Your weights persist locally in your browser.
- **💎 Balanced Feed:** Mixes and interleaves **Consolidated** ($\ge 50k$ views) and **Emerging Gems** ($< 50k$ views) so small quality creators are not buried.
- **📁 Curated Categories:** Quick tabs for **General**, **Entertainment**, **Music**, and **Education** with category-specific adaptive suggestions.
- **⌨️ Shortcuts:** Press `/` to focus the search bar, `ESC` to close suggestions.
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

---

## ☁️ Deploying to Render (Free)
1. Log in to [Render](https://render.com) -> **New > Web Service**.
2. Link your GitHub repository.
3. Choose **Docker** as the runtime.
4. Click **Deploy**. Your data remains safe in your browser's local storage.
