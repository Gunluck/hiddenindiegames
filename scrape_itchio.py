import requests
from bs4 import BeautifulSoup
import json

url = "https://itch.io/games/newest"
headers = {'User-Agent': 'Mozilla/5.0'}

response = requests.get(url, headers=headers)
soup = BeautifulSoup(response.text, 'html.parser')

games = []
cards = soup.select("div.game_cell")

for card in cards[:10]:
    link_tag = card.select_one("a.title")
    title = link_tag.text.strip() if link_tag else "Untitled Game"
    href = link_tag['href'] if link_tag else ""
    full_link = href if href.startswith("http") else f"https://itch.io{href}"

    description = "Discover a new indie gem!"

    games.append({
        "title": title,
        "description": description,
        "link": full_link
    })

# Save to games.json
with open("games.json", "w", encoding="utf-8") as f:
    json.dump(games, f, indent=2)

print("✅ Scraped and saved games with working links!")
