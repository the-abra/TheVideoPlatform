# Titan UI/UX Design Platform

A comprehensive platform for UI/UX design with backend and frontend components.

## Project Structure

- `backend/` - Go-based backend server with database and API endpoints
- `frontend/` - Next.js frontend application with UI components

## Prerequisites

- Go 1.21+
- Node.js 18+
- pnpm (recommended) or npm
- SQLite (for the database)

## Quick Setup

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd titan-ui-ux-design
   ```

2. Setup backend:
   ```bash
   cd backend
   go mod tidy
   cp .env.example .env  # Customize environment variables as needed
   go run cmd/server/main.go
   ```

3. In a new terminal, setup frontend:
   ```bash
   cd frontend
   pnpm install  # or npm install
   pnpm dev      # or npm run dev
   ```

4. Visit `http://localhost:3000` to see the application

## Environment Variables

The application requires environment configuration. See the `.env.example` file in the backend directory for required variables.

## Database

The application uses SQLite for data storage. The database file will be created automatically when the backend starts.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.