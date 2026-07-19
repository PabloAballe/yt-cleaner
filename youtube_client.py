import yt_dlp
import logging
from typing import List, Dict, Any

# Disable noisy logging from yt-dlp
ydl_logger = logging.getLogger("yt_dlp")
ydl_logger.setLevel(logging.ERROR)

def search_youtube(query: str, max_results: int = 40) -> List[Dict[str, Any]]:
    """
    Searches YouTube for a query using yt-dlp and extracts video metadata.
    Does not download any video content.
    """
    ydl_opts = {
        'format': 'best',
        'quiet': True,
        'no_warnings': True,
        'skip_download': True,
        'extract_flat': True,  # Flat extract is extremely fast
        'logger': ydl_logger,
    }
    
    search_query = f"ytsearch{max_results}:{query}"
    
    videos = []
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            result = ydl.extract_info(search_query, download=False)
            if not result:
                return []
                
            entries = result.get('entries', [])
            for entry in entries:
                if not entry:
                    continue
                
                # Check that it's a video (and not a playlist or channel)
                # yt-dlp entries usually have 'ie_key' or type.
                video_id = entry.get('id')
                if not video_id:
                    continue
                
                # Build thumbnail URL
                thumbnail_url = entry.get('thumbnail')
                if not thumbnail_url:
                    thumbnail_url = f"https://img.youtube.com/vi/{video_id}/mqdefault.jpg"
                
                # Extract and parse duration
                duration = entry.get('duration')
                try:
                    duration = int(duration) if duration is not None else 0
                except (ValueError, TypeError):
                    duration = 0
                
                # Extract and parse views
                view_count = entry.get('view_count')
                try:
                    view_count = int(view_count) if view_count is not None else 0
                except (ValueError, TypeError):
                    view_count = 0
                
                videos.append({
                    'id': video_id,
                    'title': entry.get('title', 'Unknown Title'),
                    'channel': entry.get('uploader') or entry.get('channel') or 'Unknown Channel',
                    'duration': duration, # in seconds
                    'view_count': view_count,
                    'thumbnail': thumbnail_url,
                    'url': f"https://www.youtube.com/watch?v={video_id}",
                    'upload_date': entry.get('upload_date') or ''
                })
    except Exception as e:
        print(f"Error searching YouTube with yt-dlp: {e}")
        # Return empty list in case of network block or error
        return []
        
    return videos
