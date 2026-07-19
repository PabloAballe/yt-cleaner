import random
from typing import List, Optional
from fastapi import FastAPI, Request, Query
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

import youtube_client

app = FastAPI(title="YT Cleaner Stateless API")

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# CURATED SEARCH QUERY POOLS BY LANGUAGE
QUERIES_ES = {
    "general": [
        "nuevas tecnologias programacion",
        "divulgacion cientifica documentales",
        "curiosidades cientificas astronomia",
        "historia mundial documental independiente",
        "inteligencia artificial innovaciones",
        "veritasium español ciencia"
    ],
    "entertainment": [
        "documentales cinefilos analisis de peliculas",
        "video ensayos cinematograficos espanol",
        "analisis de libros clasicos literatura",
        "stand up comedy inteligente español"
    ],
    "music": [
        "musica para programar lofi chill",
        "sesion acustica en vivo indie",
        "musica clasica para estudiar profundamente",
        "documental historia de la musica"
    ],
    "education": [
        "curso completo de programacion python",
        "derivaciones fisica cuantica clase",
        "tutorial de programacion rust espanol",
        "explicaciones cientificas animadas"
    ]
}

QUERIES_EN = {
    "general": [
        "quantum computing research documentary",
        "web development trends 2026",
        "space exploration discoveries nasa",
        "veritasium physics space",
        "future biotechnology genetics documentary"
    ],
    "entertainment": [
        "smart storytelling mystery history documentary",
        "independent short film award winners",
        "video essay movie analysis channel",
        "cinematography analysis video essays"
    ],
    "music": [
        "lofi chillhop beats to code",
        "acoustic live session performance indie",
        "ambient synthesizer modular performance",
        "jazz trio live session concert",
        "chill synthwave study track"
    ],
    "education": [
        "python coding tutorial full course",
        "quantum mechanics derivation physics lecture",
        "mathematics visualization 3blue1brown",
        "building full stack programming project tutorial"
    ]
}

# Suffixes to pair with user liked keywords for personalized generation
CATEGORY_SUFFIXES = {
    "general": [
        "nuevas tecnologias", "future technology", "quantum physics", "science discoveries", "divulgacion cientifica", "space exploration"
    ],
    "entertainment": [
        "documental cinefilo", "video ensayo", "storytelling", "cine de culto", "independent film"
    ],
    "music": [
        "lofi chill beats", "acoustic live session", "ambient synthesizer", "modular performance", "jazz live", "synthwave study"
    ],
    "education": [
        "coding tutorial", "full course lesson", "mathematics visualization", "science explanation", "clase magistral"
    ]
}

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    """Renders the single-page application UI."""
    try:
        return templates.TemplateResponse(request, "index.html")
    except TypeError:
        return templates.TemplateResponse("index.html", {"request": request})

@app.get("/api/videos")
async def get_videos(
    q: Optional[str] = Query(None), 
    category: str = "general", 
    lang: str = "mixed", 
    kws: Optional[str] = Query(None)
):
    """
    Fetches raw search result videos from YouTube (scraped).
    Category feeds are dynamically curated using language-specific query pools
    intermixed with personalized search queries generated from the user's top liked keywords.
    """
    raw_videos = []
    
    try:
        if q and q.strip():
            # If explicit search query is typed, search exactly that query
            raw_videos = youtube_client.search_youtube(q.strip(), max_results=35)
        else:
            # Parse user liked keywords from query param
            user_kws = []
            if kws:
                user_kws = [k.strip() for k in kws.split(",") if k.strip()]
            
            # Generate personalized dynamic search queries
            dynamic_queries = []
            if user_kws:
                suffixes = CATEGORY_SUFFIXES.get(category, CATEGORY_SUFFIXES["general"])
                for kw in user_kws:
                    suffix = random.choice(suffixes)
                    dynamic_queries.append(f"{kw} {suffix}")
            
            # Select category pools as fallbacks or mix-ins
            if lang == "es":
                static_pool = QUERIES_ES.get(category, QUERIES_ES["general"])
            elif lang == "en":
                static_pool = QUERIES_EN.get(category, QUERIES_EN["general"])
            else:  # mixed/all
                static_pool = QUERIES_ES.get(category, QUERIES_ES["general"]) + QUERIES_EN.get(category, QUERIES_EN["general"])
            
            # Mix dynamic (personalized) and static queries
            random.shuffle(dynamic_queries)
            random.shuffle(static_pool)
            
            # Take up to 2 dynamic queries, and fill the rest to make a total of 3 queries
            chosen_queries = []
            if dynamic_queries:
                chosen_queries.extend(dynamic_queries[:2])
            
            remaining_needed = 3 - len(chosen_queries)
            if remaining_needed > 0:
                chosen_queries.extend(static_pool[:remaining_needed])
            
            # Fetch videos from YouTube search
            for query in chosen_queries:
                res = youtube_client.search_youtube(query, max_results=15)
                raw_videos.extend(res)
                
            random.shuffle(raw_videos)
            
        return JSONResponse(content={"videos": raw_videos})
    except Exception as e:
        print(f"Error scraping YouTube results: {e}")
        return JSONResponse(status_code=500, content={"error": str(e), "videos": []})
