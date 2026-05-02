# Gemini AI Integration for Hermesian

This project now includes Google Gemini AI integration alongside the existing Claude AI service. The integration provides enhanced AI capabilities including YouTube video analysis and improved content curation.

## Features Added

### 1. Gemini AI Service (`src/services/gemini.ts`)
- **Debate Response Generation**: Generate debate responses using Gemini AI
- **News Content Analysis**: Curate and analyze news articles for relevance
- **YouTube Video Analysis**: Analyze YouTube videos for educational value and debate potential
- **YouTube Search**: Search for relevant YouTube videos
- **Top Headlines Generation**: Generate current news headlines

### 2. Enhanced API Routes

#### Debate API (`/api/debate`)
- Now supports both Gemini and Claude AI providers
- Automatic fallback between providers
- New parameter: `aiProvider` (defaults to 'gemini')
- Response includes which AI provider was used

#### News Articles API (`/api/news/articles`)
- Enhanced with Gemini-powered content curation
- Fallback to Claude if Gemini fails
- New parameter: `aiProvider` (defaults to 'gemini')

#### YouTube API (`/api/youtube`)
- **GET/POST** `/api/youtube?action=search&query=...` - Search YouTube videos
- **GET/POST** `/api/youtube?action=analyze&videoId=...` - Analyze specific videos
- Returns video metadata and AI analysis including:
  - Educational value (1-10)
  - Debate potential (1-10)
  - Key topics
  - Summary
  - Recommendation for debate use

### 3. YouTube Analyzer Component
- Interactive UI for searching and analyzing YouTube videos
- Real-time analysis using Gemini AI
- Visual indicators for educational value and debate potential
- Accessible at `/youtube` route

## Setup Instructions

### 1. Environment Variables
Add your Google API key to your environment configuration:

```bash
GOOGLE_API_KEY=AIzaSyC9Rfj-zz7bdLwfa00f9gmIdUqnG-gIxWs
```

### 2. Dependencies
The following packages have been installed:
- `@google/generative-ai` - Google's Gemini AI SDK
- `googleapis` - Google APIs client library for YouTube and other services

### 3. API Key Permissions
Your Google API key has access to:
- **Gemini AI API** - For text generation and analysis
- **YouTube Data API v3** - For video search and metadata
- **Google Cloud Storage API** - For potential file storage features

## Usage Examples

### Using Gemini for Debates
```javascript
// Frontend request
const response = await fetch('/api/debate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [...],
    topic: 'Climate Change',
    viewpoint: 'for',
    aiProvider: 'gemini' // or 'claude'
  })
})
```

### Analyzing YouTube Videos
```javascript
// Search videos
const searchResponse = await fetch('/api/youtube?action=search&query=climate change debate')

// Analyze specific video
const analysisResponse = await fetch('/api/youtube?action=analyze&videoId=dQw4w9WgXcQ')
```

### News Analysis with Gemini
```javascript
// Get curated articles using Gemini
const articlesResponse = await fetch('/api/news/articles?headline=AI Development&terms=artificial intelligence&aiProvider=gemini')
```

## Benefits of Gemini Integration

1. **Cost Efficiency**: Gemini often provides competitive pricing
2. **Enhanced Capabilities**: Access to Google's latest AI models
3. **YouTube Integration**: Direct access to YouTube data and analysis
4. **Fallback Reliability**: Automatic fallback to Claude ensures service continuity
5. **Multi-Modal Support**: Future support for image and video analysis

## Error Handling

The integration includes comprehensive error handling:
- Automatic fallback between AI providers
- Graceful degradation when APIs are unavailable
- Detailed error logging for debugging
- User-friendly error messages

## Future Enhancements

Potential future features:
- Image analysis using Gemini Vision
- Multi-language support
- Real-time video transcription
- Advanced content moderation
- Integration with Google Cloud Storage for file analysis
