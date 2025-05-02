# DeepTube Beta

An advanced AI-powered video marketplace platform that enables intelligent content discovery and community engagement through interactive communication technologies, with a sophisticated advertisement integration system.

## Features

- Browse and upload AI-generated videos and images
- Share embedded content from YouTube and Vimeo
- Content categorization system
- Community engagement with comments and likes
- User profile pages with messaging functionality
- Admin review system for content moderation
- Metrics tracking for trending and popular content

## Tech Stack

- React.js frontend with TypeScript
- Express.js backend
- PostgreSQL database with Drizzle ORM
- AWS S3 for file storage
- Vimeo API integration
- SendGrid for email notifications

## Environment Variables

This application requires the following environment variables:

```
# AWS Configuration
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_BUCKET_NAME=
AWS_REGION=

# Database Configuration
DATABASE_URL=

# Vimeo API Configuration
VIMEO_CLIENT_ID=
VIMEO_CLIENT_SECRET=
VIMEO_ACCESS_TOKEN=

# Stripe Configuration
STRIPE_SECRET_KEY=
VITE_STRIPE_PUBLIC_KEY=

# SendGrid Configuration
SENDGRID_API_KEY=
```

## Installation

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```
