# 📘 BambiSleep.Chat API Documentation

## Overview

This document provides comprehensive information about the BambiSleep.Chat API endpoints, request/response formats, and authentication methods. The API enables developers to integrate with the platform and access its features programmatically.

## Base URL

```
https://api.bambisleep.chat/v1
```

## Authentication

### Session-based Authentication

All API requests require a valid session cookie obtained through the authentication endpoints.

```
POST /auth/login
```

**Request Body:**
```json
{
  "username": "your_username",
  "password": "your_password"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Authentication successful",
  "user": {
    "id": "user_id",
    "username": "your_username"
  }
}
```

### API Key Authentication

For server-to-server communication, use API key authentication:

```
GET /resource
Authorization: Bearer YOUR_API_KEY
```

## API Endpoints

### Profile Management

#### Get Profile

```
GET /profile/{username}
```

**Response:**
```json
{
  "id": "profile_id",
  "username": "username",
  "displayName": "Display Name",
  "avatarUrl": "https://bambisleep.chat/avatars/image.png",
  "isPublic": true,
  "xp": 1250,
  "level": 5,
  "createdAt": "2025-01-01T00:00:00Z",
  "triggers": ["trigger1", "trigger2"]
}
```

#### Update Profile

```
PUT /profile/{username}
```

**Request Body:**
```json
{
  "displayName": "New Display Name",
  "avatarUrl": "https://bambisleep.chat/avatars/new-image.png",
  "isPublic": true
}
```

### AI Interaction

#### Generate AI Response

```
POST /ai/generate
```

**Request Body:**
```json
{
  "prompt": "Hello Bambi",
  "settings": {
    "model": "MODEL_1",
    "includeAudio": true,
    "includeTriggers": true
  }
}
```

**Response:**
```json
{
  "response": "AI generated response text",
  "audioUrl": "https://bambisleep.chat/audio/response-123.mp3",
  "triggers": ["trigger1", "trigger2"]
}
```

### Trigger Management

#### List Triggers

```
GET /triggers
```

**Response:**
```json
{
  "triggers": [
    {
      "id": "trigger_id",
      "name": "Trigger Name",
      "description": "Trigger Description",
      "isPublic": true,
      "creator": "username"
    }
  ]
}
```

#### Create Custom Trigger

```
POST /triggers
```

**Request Body:**
```json
{
  "name": "Custom Trigger",
  "description": "Custom Trigger Description",
  "isPublic": false,
  "content": "Trigger activation text"
}
```

### Session Management

#### List Session Histories

```
GET /sessions
```

**Response:**
```json
{
  "sessions": [
    {
      "id": "session_id",
      "createdAt": "2025-01-01T00:00:00Z",
      "messageCount": 10
    }
  ]
}
```

#### Get Session Details

```
GET /sessions/{sessionId}
```

**Response:**
```json
{
  "id": "session_id",
  "createdAt": "2025-01-01T00:00:00Z",
  "messages": [
    {
      "role": "user",
      "content": "User message",
      "timestamp": "2025-01-01T00:00:00Z"
    },
    {
      "role": "assistant",
      "content": "Assistant response",
      "timestamp": "2025-01-01T00:00:01Z"
    }
  ]
}
```

## Websocket API

### Real-time Chat

Connect to the WebSocket endpoint for real-time messaging:

```
wss://api.bambisleep.chat/ws/chat
```

**Connection Authentication:**
```json
{
  "type": "auth",
  "token": "YOUR_SESSION_TOKEN"
}
```

**Send Message:**
```json
{
  "type": "message",
  "content": "Hello everyone!"
}
```

**Receive Message:**
```json
{
  "type": "message",
  "username": "other_user",
  "content": "Hi there!",
  "timestamp": "2025-01-01T00:00:00Z"
}
```

## Error Handling

All API endpoints return standard HTTP status codes:

- `200 OK`: Request succeeded
- `400 Bad Request`: Invalid parameters
- `401 Unauthorized`: Authentication failed
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

Error responses follow this format:

```json
{
  "error": true,
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {} // Optional additional details
}
```

## Rate Limiting

API requests are limited to:
- 60 requests per minute for authenticated users
- 10 requests per minute for unauthenticated requests

When rate limited, you'll receive a `429 Too Many Requests` response with a `Retry-After` header indicating the number of seconds to wait.

## Webhook Integration

Configure webhooks to receive real-time notifications:

```
POST /webhooks
```

**Request Body:**
```json
{
  "url": "https://your-server.com/webhook",
  "events": ["message.new", "profile.update", "trigger.shared"],
  "secret": "your_webhook_secret"
}
```

## SDK Libraries

Official client libraries:
- [JavaScript](https://github.com/bambisleep/js-sdk)
- [Python](https://github.com/bambisleep/python-sdk)
- [PHP](https://github.com/bambisleep/php-sdk)

## Support

For API support, contact:
- Email: api@bambisleep.chat
- Discord: [#api-support](https://discord.gg/E7U5BxVttv)
