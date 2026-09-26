# LiftLog

A mobile-first full-stack fitness platform for tracking workouts, nutrition, physical progress, nearby gyms, and gym session bookings from one place.

LiftLog combines workout logging, nutrition tracking, progress insights, nearby-gym discovery, and gym-session booking into a single fitness experience.

---

## Features

### Authentication & User Profile

- User signup and login
- JWT-based authentication
- Access and refresh token support
- Personalized fitness profile
- Fitness onboarding
- Editable account information
- User-specific workout and booking data

### Workout Tracking

- Create and manage workout routines
- Start an empty workout
- Add exercises to workouts
- Track sets, repetitions, and weight
- Complete and save workout sessions
- View workout history
- Open detailed workout summaries
- Track workout volume and activity

### Progress Tracking

- Weekly workout statistics
- Training volume
- Exercise count
- Workout streaks
- Weight tracking
- Weight progress visualization
- Recent workout activity
- Progress-over-time insights

### Nutrition Tracking

- Search and select food items
- Track daily calories
- Track protein
- Track carbohydrates
- Track fats
- Nutrition-focused dashboard
- Food and meal tracking workflow

### Gym Discovery

- Discover nearby gyms using browser geolocation
- Distance-based gym results
- View gym preview images
- View gym information
- View address and location details
- Browse available gym time slots

### Gym Booking

- Browse available dates and slots
- Book gym sessions
- View booking confirmation
- View personal bookings from the Profile page
- Open individual booking details
- View booked gym, date, and time
- Get directions to the gym
- View booking status

---

## Tech Stack

### Frontend

- Angular
- TypeScript
- HTML5
- CSS3
- RxJS
- Angular Router
- Responsive mobile-first UI

### Backend

- Python
- FastAPI
- SQLAlchemy
- REST APIs
- JWT Authentication
- SQLite for local development

### Development Tools

- Git
- GitHub
- VS Code
- Postman
- Swagger / OpenAPI
- Python Virtual Environments
- npm
- Angular CLI

---

## Project Structure

```text
LiftLog/
│
├── BE/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   └── ...
│   │
│   └── ...
│
├── FE/
│   ├── public/
│   │   └── gyms/
│   │
│   ├── src/
│   │   ├── app/
│   │   │   ├── pages/
│   │   │   ├── services/
│   │   │   └── ...
│   │   │
│   │   └── environments/
│   │
│   ├── angular.json
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## Application Flow

```text
Signup / Login
      │
      ▼
  Onboarding
      │
      ▼
     Home
      │
      ├──────────────► Workouts
      │                   │
      │                   ├── Create Routine
      │                   ├── Start Workout
      │                   ├── Add Exercises
      │                   └── Workout History
      │
      ├──────────────► Nutrition
      │                   │
      │                   ├── Food Search
      │                   ├── Calories
      │                   └── Macronutrients
      │
      ├──────────────► Nearby Gyms
      │                   │
      │                   ▼
      │              Gym Details
      │                   │
      │                   ▼
      │              Available Slots
      │                   │
      │                   ▼
      │                Booking
      │
      └──────────────► Profile
                          │
                          ├── Progress
                          ├── My Bookings
                          ├── Recent Activity
                          └── Weight Journey
```

---

## Main Frontend Pages

The Angular frontend includes application flows for:

- Login
- Signup
- Onboarding
- Home
- Workout Dashboard
- Active Workout
- Exercise Picker
- Workout History
- Workout Detail
- Nutrition
- Food Picker
- Profile
- Account
- Gym Booking
- Gym Slot Selection
- Gym Details
- Booking Detail

---

## API Overview

The FastAPI backend exposes REST APIs used by the Angular frontend.

### Authentication

Handles:

- User registration
- Login
- Access tokens
- Refresh tokens
- Authenticated user requests

### User Profile

Handles:

- Loading profile information
- Updating user information
- Fitness profile data
- Weight and progress information

### Workouts

Handles:

- Workout sessions
- Workout history
- Workout details
- Exercises
- Sets
- Repetitions
- Workout volume

### Nutrition

Handles:

- Food data
- Food search
- Calories
- Macronutrients
- Nutrition tracking

### Gyms

Handles:

- Nearby gym discovery
- Gym summaries
- Gym details
- Available gym slots
- Individual slot information

### Bookings

Handles:

- Creating gym bookings
- Retrieving user bookings
- Retrieving an individual booking
- Booking status
- Cancelling bookings

---

## Gym Discovery & Booking Flow

One of the larger full-stack workflows in LiftLog is gym discovery and booking.

```text
Browser Geolocation
        │
        ▼
Nearby Gym API
        │
        ▼
Nearby Gym Cards
        │
        ▼
Gym Booking Page
        │
        ▼
Available Gym Slots
        │
        ▼
Select Date & Time
        │
        ▼
Create Booking
        │
        ▼
Booking Confirmation
        │
        ▼
Profile → My Bookings
        │
        ▼
Booking Detail Page
```

---

## Authentication Flow

LiftLog uses JWT-based authentication.

The frontend stores authentication tokens locally and automatically sends the access token with protected API requests.

The authentication system supports:

- Access tokens
- Refresh tokens
- Protected endpoints
- Automatic authenticated requests
- User-specific data

Sensitive values such as production API keys and JWT secrets should be supplied through environment variables and must never be committed to the repository.

---

## Running the Project Locally

### Prerequisites

Make sure the following are installed:

- Git
- Python 3
- Node.js
- npm
- Angular CLI

---

## 1. Clone the Repository

```bash
git clone https://github.com/PritishaPaul0507/LiftLog.git
cd LiftLog
```

---

## 2. Backend Setup

Create a Python virtual environment:

```bash
python3 -m venv BE/.venv
```

Activate it on macOS or Linux:

```bash
source BE/.venv/bin/activate
```

Install the backend dependencies required by the project.

Then start the FastAPI backend from the project root:

```bash
python -m uvicorn BE.app.main:app --reload --host 0.0.0.0 --port 8001
```

The backend will run at:

```text
http://localhost:8001
```

Swagger API documentation is available at:

```text
http://localhost:8001/docs
```

---

## 3. Frontend Setup

Open another terminal and navigate to the frontend:

```bash
cd FE
```

Install dependencies:

```bash
npm install
```

Start the Angular development server:

```bash
ng serve
```

The frontend will run at:

```text
http://localhost:4200
```

---

## UI Design

LiftLog follows a mobile-first design system focused on simplicity and usability.

The application uses:

- Deep green primary colors
- Mint accents
- White cards
- Rounded corners
- Clean typography
- Minimal navigation
- Smartphone-first layouts
- Consistent spacing
- Responsive components

The desktop experience keeps the same mobile-focused visual language rather than introducing a completely separate design.

---

## Screenshots

Application screenshots can be added here to showcase the main user flows.

Recommended screenshots:

### Home

_Add screenshot here_

### Workout Dashboard

_Add screenshot here_

### Active Workout

_Add screenshot here_

### Nutrition

_Add screenshot here_

### Profile & Progress

_Add screenshot here_

### Nearby Gyms

_Add screenshot here_

### Gym Booking

_Add screenshot here_

### Booking Confirmation

_Add screenshot here_

---

## Engineering Highlights

LiftLog demonstrates several full-stack software engineering concepts:

- REST API development
- Angular component architecture
- FastAPI backend architecture
- JWT-based authentication
- Access and refresh token handling
- Frontend-backend integration
- SQLAlchemy ORM
- Database persistence
- Responsive application design
- State-driven UI updates
- Browser geolocation
- Workout session management
- Nutrition tracking
- User progress tracking
- Booking workflows
- Route-based navigation
- Error handling
- Form validation

---

## Development Goals

LiftLog is being developed as a portfolio-quality full-stack application demonstrating practical product development across both frontend and backend systems.

The project focuses on:

- Building maintainable frontend architecture
- Designing REST APIs
- Implementing authentication
- Managing user-specific data
- Integrating frontend and backend systems
- Creating responsive user interfaces
- Building real-world application workflows
- Designing features around practical fitness use cases

---

## Future Improvements

Planned improvements include:

- AI-assisted workout recommendations
- Personalized nutrition recommendations
- More detailed fitness analytics
- Advanced progress charts
- Gym search filters
- Gym ratings and reviews
- Booking reminders
- Expanded food database coverage
- Improved nutrition insights
- Progressive Web App support
- Cloud database integration
- Production deployment
- Automated testing
- CI/CD pipelines
- Improved observability and logging

---

## Project Status

LiftLog is currently under active development.

Current development focuses on:

- Authentication
- User onboarding
- Workout tracking
- Workout history
- Progress tracking
- Nutrition tracking
- Nearby gym discovery
- Gym slot selection
- Gym booking
- Booking history
- User profile management

---

## Security

The project is configured so that local development files and sensitive runtime data should not be committed to Git.

Examples include:

```text
.env
*.db
*.sqlite
*.sqlite3
*.log
node_modules/
.venv/
```

Production secrets should always be supplied through environment variables.

---

## Repository

**GitHub**

https://github.com/PritishaPaul0507/LiftLog

---

## Author

**Pritisha Paul**

Software Developer

GitHub:

https://github.com/PritishaPaul0507

---

## License

This project is currently intended for portfolio and educational purposes.

---

Built as a full-stack fitness platform using **Angular + FastAPI**.
