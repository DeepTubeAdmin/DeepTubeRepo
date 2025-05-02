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

## GitHub Integration

To work with this codebase in GitHub:

### From Replit to GitHub

1. In the Replit workspace, click on the Version Control tab in the sidebar
2. Connect your GitHub account if not already connected
3. Choose "Create a GitHub repository" or "Connect to existing repository"
4. Fill in the repository details and click "Create/Connect"
5. Commit and push your changes

### Cloning to local environment

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/deeptube-beta.git
   cd deeptube-beta
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with the necessary environment variables (see above)

4. Start the development server:
   ```bash
   npm run dev
   ```

### Troubleshooting

#### Thumbnails not displaying?

If image thumbnails aren't displaying correctly, access the admin dashboard and use the "Fix Image Thumbnails" button in the System Tools tab to regenerate them. This will ensure thumbnails are properly stored in S3.

#### S3 Access Issues

If you encounter S3 access issues, make sure your bucket permissions allow public read access for the thumbnails directory.
