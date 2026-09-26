# LiftLog

A mobile-first full-stack fitness platform for tracking workouts, nutrition, physical progress, and gym sessions from one place.

LiftLog combines workout logging, nutrition tracking, progress insights, nearby-gym discovery, and gym-session booking into a single fitness experience.

## Features

### Authentication & Profile
- User signup and login
- JWT-based authentication
- Personalized fitness profile
- Fitness goals and onboarding
- Editable account information

### Workout Tracking
- Create and manage workout routines
- Start empty workouts
- Add exercises and sets
- Track weight and repetitions
- Complete and save workouts
- Workout history and detailed workout summaries

### Progress Tracking
- Weekly workout statistics
- Training volume
- Exercise count
- Workout streaks
- Weight progress tracking
- Progress-over-time visualization

### Nutrition
- Food search and selection
- Calorie tracking
- Protein, carbohydrate, and fat tracking
- Nutrition-focused dashboard

### Gym Discovery & Booking
- Discover nearby gyms using geolocation
- View gym information and photos
- Browse available gym time slots
- Book gym sessions
- View personal bookings
- Open detailed booking confirmations
- Get directions to booked gyms

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
- JWT authentication
- SQLite for local development

## Project Structure

```text
LiftLog/
├── BE/                     # FastAPI backend
│   └── app/
│       ├── api/
│       ├── core/
│       └── ...
│
├── FE/                     # Angular frontend
│   ├── public/
│   └── src/
│       └── app/
│           ├── core/
│           ├── pages/
│           ├── services/
│           └── shared/
│
└── README.md