# Sample report: YouTube Data API v3 usage — Potter Play

Google Cloud project: "potter-play-youtube" · OAuth desktop client: "Subidas Potter Play" · Channel: Potter Play (UC-upSUghMwd2-TxjH9_tLJg) · Report date: 2026-11-18

## 1. YouTube data the application retrieves
| API method | Parts requested | Purpose | Frequency | Quota cost |
|---|---|---|---|---|
| videos.insert (resumable upload) | snippet, status | Upload our own Shorts and long videos | up to 6 per day | 1,600 per upload |
| thumbnails.set | — | Thumbnails for our own long videos | a few per week | 50 |
| channels.list (mine=true) | snippet, statistics | Check that the channel is connected | on connection and in tests | 1 |
| videos.list | statistics | Read the view count (viewCount) of the videos our own application uploaded | once a day | 1 per batch of up to 50 IDs |

OAuth scopes: youtube.upload and youtube.force-ssl. The application **does not use** the YouTube Analytics API or the YouTube Reporting API, **does not read comments, subscribers or any personal data of viewers**, and only queries videos from the owner's channel (the user who authorized the app).

## 2. Data retrieved (real sample, 2026-11-18)
Channel: 25 subscribers · 28,931 views · 85 videos.
Videos uploaded by the application and queried: **56** (from 2026-11-09 to 2026-11-18); total views: **18,304**; average per video: **326.9**.
The full list (video ID, content type, title, upload and publish dates, privacy status, views, likes and comments) is in the attached file `muestra-datos-api.csv`. The titles are in Spanish because our channel is in Spanish; all other fields are numeric or dates.

## 3. Analysis performed on that data
- We only store the view count of each of our own videos next to its date (table "envios" in the project's database), to compare formats and publishing times of our own content.
- Summary by content type (from the sample): Shorts: 56 videos, 326.9 average views.
- Use: decide which formats to repeat, at what time to publish and which videos to resend to other platforms. We do not profile people, we do not sell or share the data with third parties, and we do not download data from other channels.
- Retention: view counts are refreshed once a day and records are kept while the channel is active. The user can revoke access at https://myaccount.google.com/permissions and the tokens are then deleted.

## 4. Visibility of videos uploaded with videos.insert
Every video uploaded through videos.insert by this client stays Private. To publish it, we open YouTube Studio, review and approve each video, and manually change its visibility to Public. None of the 56 videos in the sample became public automatically. The "privacidad" (privacy) column of the CSV shows the current state (all public because we published them manually).
