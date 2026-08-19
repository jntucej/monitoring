# API Specification (OpenAPI 3.0)
## Unified Campus Access Management System

---

## 1. Overview

This document defines the RESTful API for the Unified Campus Access Management System.

**Base URL:** `https://api.campus-access.edu/v1`  
**Version:** 1.0.0

---

## 2. Authentication

All API endpoints (except `/auth/*`) require authentication via Bearer token.

### Authentication Header
```
Authorization: Bearer <jwt_token>
```

### Authentication Endpoints

#### POST /auth/login
**Description:** Authenticate a user  
**Request Body:**
```json
{
  "uniqueId": "string",
  "password": "string"
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt_token",
    "user": {
      "id": "uuid",
      "uniqueId": "string",
      "name": "string",
      "type": "student|faculty|staff|worker|visitor|parent",
      "role": "string"
    }
  }
}
```

#### POST /auth/logout
**Description:** Invalidate current session

---

## 3. Person Management

### GET /persons
**Description:** List all persons (admin only)  
**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | Filter by person type |
| `q` | string | Search query |
| `department` | string | Filter by department |
| `status` | string | active/inactive |

### GET /persons/{uniqueId}
**Description:** Get person by unique ID

### POST /persons
**Description:** Create a new person (admin only)

---

## 4. Gate Management

### POST /gate/scan
**Description:** Record a gate scan  
**Authorization:** operator, supervisor

### GET /gate/logs
**Description:** Get gate logs

---

## 5. Visitor Management

### POST /visitors
**Description:** Create visitor check-in

### PUT /visitors/{uniqueId}/checkout
**Description:** Check out a visitor

---

## 6. System Health & Analytics

### GET /health
**Description:** Get system health status

### GET /analytics/occupancy
**Description:** Get campus occupancy statistics
