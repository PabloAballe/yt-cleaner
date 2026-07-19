# YT Cleaner 🚀

An intelligent, 100% stateless, and database-free YouTube feed curation dashboard. It scrapes search results without requiring an API key, filters out clickbait and low-quality videos in real-time, and learns your content preferences using your browser's local storage.

---

## 📦 Directory Tree Structure
```
yt-cleaner/
├── static/
│   └── js/
│       └── app.js          # Client-side curation engine, localStorage weights & filtering
├── templates/
│   └── index.html      # Responsive dashboard HTML (Outfit & Plus Jakarta Sans typography)
├── Dockerfile          # Stateless, lightweight FastAPI container configuration
├── main.py             # Stateless backend search API (FastAPI)
├── requirements.txt    # Python package dependencies
└── youtube_client.py   # Scraper integration for YouTube metadata (using yt-dlp)
```

---

## ✨ Features

- **⚙️ Automated Curation:** Zero setup needed. Automatically blocks Shorts (< 2 min), blocks movies/streams (> 90 min), blocks low-view spam (< 1000 views, unless channel is liked), and applies clickbait penalties.
- **💾 LocalStorage Memory:** Learns your favorite channels and keywords as you click **Keep** (+15 channel, +3 keywords) or **Junk** (-30 channel, -5 keywords). Weights and skip histories are stored safely inside your browser. No backend database required!
- **💎 Consolidated vs. Emerging Gems:** Automatically classifies videos based on community validation and interleaves them 50/50 in the feed so rising creators aren't pushed to the bottom.
- **📁 Curated Category Tabs:** Switch instantly between **General**, **Entertainment**, **Music**, and **Education** feeds. Suggestions dropdown list adapts dynamically to match your active category.
- **⌨️ Keyboard Shortcuts:** Focus search instantly by pressing the `/` key from anywhere. Close suggestions and defocus using `ESC`.
- **🗂️ Collapsible Filters Tray:** Group category pills, subtopic searches, gems/consolidated tabs, and clickbait toggles inside a neat panel toggled via the **Filters** button.

---

## 🚀 How to Upload to GitHub

You already have a repository initialized at `https://github.com/PabloAballe/yt-cleaner.git`. Instead of uploading only the README, run these commands in your project folder to upload the entire codebase:

```bash
# 1. Initialize git (if not already done)
git init

# 2. Add all the project files
git add .

# 3. Create initial commit
git commit -m "feat: initial release of stateless yt-cleaner"

# 4. Set branch to main
git branch -M main

# 5. Link your remote GitHub repository
git remote add origin https://github.com/PabloAballe/yt-cleaner.git

# 6. Push your files to GitHub
git push -u origin main
```

---

## ☁️ How to Deploy on Render (100% Free)

Since the backend is stateless (database-free), deploying it takes less than 2 minutes:

1. **Sign Up / Log In** on [Render](https://render.com).
2. Click the blue **New** button in the top right and select **Web Service**.
3. Connect your **GitHub account** and select the repository **`yt-cleaner`**.
4. In the configuration:
   - **Name:** `yt-cleaner`
   - **Region:** Choose the closest one to you.
   - **Runtime:** Select **Docker** (Render will automatically read our `Dockerfile`).
   - **Instance Type:** Select **Free** ($0/month).
5. Click **Deploy Web Service** at the bottom.

*Render will build your container image and host it at `https://yt-cleaner-xxxx.onrender.com`. All your curation learning memory will persist in your browser's local storage.*
