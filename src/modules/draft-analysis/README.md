# Draft Analysis Module - Server

Backend implementation of the Draft Analysis system using Domain-Driven Design (DDD).

## Structure
```
draft-analysis/
├── domain/              # Business logic layer
│   ├── entities/        # Core business entities
│   ├── value-objects/   # Immutable value types
│   ├── services/        # Domain services
│   └── repositories/    # Repository interfaces
├── application/         # Use cases & DTOs
│   ├── dto/            # Data transfer objects
│   └── use-cases/      # Application use cases
├── infrastructure/      # External concerns
│   ├── repositories/   # Repository implementations
│   ├── mappers/        # Entity/DB mappers
│   ├── external/       # External API adapters
│   └── prisma/         # Database schema
└── presentation/        # API layer
    ├── controllers/    # HTTP controllers
    ├── validators/     # Request validators
    └── routes/         # Route definitions
```

## Key Features

- ✅ Historical draft pattern analysis
- ✅ Predictive draft selection engine
- ✅ Real-time draft pick grading
- ✅ Live draft tracking
- ✅ Comprehensive draft reports
- ✅ Team needs calculation
- ✅ System bias detection

## Setup

1. Install dependencies
2. Update `prisma/schema.prisma` with schema additions
3. Run migrations: `npx prisma migrate dev`
4. Seed data: `npm run seed`
5. Register module in main app

## API Endpoints

- `POST /api/draft-analysis/analyze-pattern` - Analyze team draft pattern
- `POST /api/draft-analysis/predict-selection` - Predict draft pick
- `POST /api/draft-analysis/grade-pick` - Grade a draft pick
- `GET /api/draft-analysis/report/:teamId/:year` - Get draft report
- `POST /api/draft-analysis/track-pick` - Track live pick
- `GET /api/draft-analysis/:year/current` - Get current pick
