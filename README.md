
# RedPulse

**RedPulse** is a real-time emergency blood donation platform that connects patients and hospitals with nearby eligible blood donors.

## Overview

RedPulse is designed to reduce the time required to find compatible blood donors during medical emergencies. Users can create blood requests, find nearby compatible donors, and receive notifications for urgent donation requests.

## Key Features

- Emergency blood request creation
- Nearby compatible donor discovery
- Blood group compatibility matching
- Donor availability management
- Real-time emergency notifications
- User authentication with phone OTP
- Location-based donor search
- Role-based access control
- Donor response and request tracking
- Hospital and blood bank support
- Admin verification and management

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- TanStack Query
- Zustand
- React Hook Form
- Zod
- Axios
- Firebase
- Framer Motion
- Lucide React

### Backend

- Node.js
- Express
- TypeScript
- MongoDB
- Mongoose
- JWT
- Firebase Admin SDK
- Zod
- Multer
- Helmet
- Express Rate Limit

### Services & Infrastructure

- **MongoDB Atlas** — Database
- **Firebase** — Phone authentication and push notifications
- **Google Maps Platform** — Maps, geolocation, and geocoding
- **Vercel** — Frontend hosting
- **Render** — Backend hosting

## Architecture

```text
React + TypeScript
        │
        │ REST API
        ▼
Express + TypeScript
        │
        ├── MongoDB Atlas
        ├── Firebase
        └── Google Maps
````

## User Roles

| Role           | Purpose                                              |
| -------------- | ---------------------------------------------------- |
| **Donor**      | Receive requests and respond to blood donation needs |
| **Patient**    | Create emergency blood requests and find donors      |
| **Hospital**   | Create and manage requests on behalf of patients     |
| **Blood Bank** | Manage blood bank information and donation camps     |
| **Admin**      | Verify users and manage the platform                 |

## License

This project is proprietary. All rights reserved.


