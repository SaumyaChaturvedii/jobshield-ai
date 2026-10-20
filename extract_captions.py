import os
import json
from youtube_transcript_api import YouTubeTranscriptApi

video_id = 'ML8qfm7W3vk'
print(f"Fetching transcripts for video: {video_id}")

transcript_list = YouTubeTranscriptApi().list(video_id)
transcript = transcript_list.find_transcript(['hi'])
fetched = transcript.fetch()

segments = []
for item in fetched:
    if hasattr(item, 'text'):
        segments.append({
            'text': item.text,
            'start': item.start,
            'duration': item.duration
        })
    elif isinstance(item, dict):
        segments.append(item)
    else:
        segments.append({
            'text': str(item)
        })

output_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'raw_transcript.json')
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(segments, f, ensure_ascii=False, indent=2)

print(f"Successfully saved {len(segments)} caption segments to {output_file}")
