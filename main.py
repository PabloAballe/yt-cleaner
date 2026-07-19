import random
from typing import List, Optional
from fastapi import FastAPI, Request, Query
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

import youtube_client

app = FastAPI(title="YT Cleaner Stateless API")

# Mount static and templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Default quality search terms for category pools
DEFAULT_QUERIES = [
    "nuevas tecnologias programacion",
    "quantum computing research documentary",
    "web development trends 2026",
    "space exploration discoveries",
    "divulgacion cientifica documentales",
    "artificial intelligence innovation",
    "independent history documentary",
    "curiosidades cientificas astronomia",
    "rust coding project tutorial",
    "cybersecurity tools open source",
    "veritasium space physics",
    "physics experiments quantum mechanics",
    "future biotechnology genetics"
]

ENTERTAINMENT_QUERIES = [
    "documentales cinefilos analisis de peliculas",
    "video ensayos cinematograficos",
    "smart storytelling mystery history",
    "stand up comedy inteligente",
    "independent short film award winners",
    "curiosidades sobre directores de cine",
    "literatura analizando libros clasicos"
]

MUSIC_QUERIES = [
    "lofi chillhop beats to code",
    "acoustic live session performance indie",
    "classical music deep study playlist",
    "music history documentary analysis",
    "ambient synthesizer modular performance",
    "jazz trio live session concert",
    "chill synthwave study track"
]

EDUCATION_QUERIES = [
    "python coding tutorial full course",
    "quantum mechanics derivation physics",
    "history research documents lessons",
    "mathematics visualization 3blue1brown",
    "genetics biology breakthroughs lecture",
    "building full stack programming project",
    "science communication explanations"
]

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    """Renders the single-page application UI."""
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/api/videos")
async def get_videos(q: Optional[str] = Query(None), category: str = "general"):
    """
    Fetches raw search result videos from YouTube (scraped).
    All ranking, quality checking, and preferences are computed on the client side.
    """
    raw_videos = []
    
    try:
        if q and q.strip():
            # Specific search query
            raw_videos = youtube_client.search_youtube(q.strip(), max_results=35)
        else:
            # Category random query combination
            if category == "music":
                chosen_queries = random.sample(MUSIC_QUERIES, min(3, len(MUSIC_QUERIES)))
            elif category == "entertainment":
                chosen_queries = random.sample(ENTERTAINMENT_QUERIES, min(3, len(ENTERTAINMENT_QUERIES)))
            elif category == "education":
                chosen_queries = random.sample(EDUCATION_QUERIES, min(3, len(EDUCATION_QUERIES)))
            else:
                chosen_queries = random.sample(DEFAULT_QUERIES, min(3, len(DEFAULT_QUERIES)))
                
            for query in chosen_queries:
                res = youtube_client.search_youtube(query, max_results=15)
                raw_videos.extend(res)
                
            random.shuffle(raw_videos)
            
        return JSONResponse(content={"videos": raw_videos})
    except Exception as e:
        print(f"Error scraping YouTube results: {e}")
        return JSONResponse(status_code=500, content={"error": str(e), "videos": []})
