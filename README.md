# ProdActivity - Productivity Management System

A comprehensive productivity management system built with Django (backend) and React (frontend) that helps users track tasks, study progress, and productivity metrics.

## Features

- **Task Management**: Create, organize, and track tasks with categories and due dates
- **Progress Tracking**: Visual progress charts and productivity metrics
- **Study Tools**: Flashcard decks, quiz sessions, and study timers
- **Notes System**: Rich text notes with AI-powered summarization
- **Schedule Management**: Calendar integration and event planning
- **XP & Leveling System**: Gamified productivity tracking
- **User Authentication**: Secure login with email verification

## Tech Stack

### Backend
- **Django 5.2.3** - Web framework
- **Django REST Framework** - API development
- **PostgreSQL** - Database (configurable)
- **JWT Authentication** - Token-based auth
- **Gmail SMTP** - Email services

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Axios** - HTTP client

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd prodactivity
   ```

2. **Set up Python environment**
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\Activate  # Windows
   # source venv/bin/activate  # Linux/Mac
   pip install -r requirements.txt
   ```

3. **Environment Configuration**
   ```bash
   # Copy the template and configure your settings
   cp env_template.txt .env
   ```
   
   Edit `.env` file with your settings:
   ```env
   # Email Configuration (Gmail SMTP)
   EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USE_TLS=True
   EMAIL_HOST_USER=your-email@gmail.com
   EMAIL_HOST_PASSWORD=your-app-password
   
   # Database Configuration
   DB_NAME=prodactivity_db
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_HOST=localhost
   DB_PORT=5432
   
   # Django Secret Key
   DJANGO_SECRET_KEY=your-secret-key
   
   # Hugging Face API Key (for AI features)
   HUGGINGFACE_API_KEY=your-hf-key
   ```

4. **Database Setup**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   python manage.py createsuperuser
   ```

5. **Start Backend Server**
   ```bash
   python manage.py runserver
   ```
   Backend will run on: http://localhost:8000

### Frontend Setup

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Start Frontend Server**
   ```bash
   npm start
   ```
   Frontend will run on: http://localhost:3000

## API Documentation

### Authentication Endpoints
- `POST /api/login/` - User login
- `POST /api/register/` - User registration
- `POST /api/token/refresh/` - Refresh JWT token

### Core Endpoints
- `GET /api/tasks/` - List tasks
- `POST /api/tasks/` - Create task
- `GET /api/notes/` - List notes
- `GET /api/decks/` - List flashcard decks
- `GET /api/progress/stats/` - User statistics
- `GET /api/progress/level/` - User level info

## Development

### Backend Development
```bash
cd backend
python manage.py runserver
```

### Frontend Development
```bash
cd frontend
npm start
```

### Database Management
```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

### Create Sample Data
```bash
cd backend
python create_sample_data.py
```

## Project Structure

```
prodactivity/
├── backend/                 # Django backend
│   ├── accounts/           # User authentication
│   ├── tasks/              # Task management
│   ├── notes/              # Notes system
│   ├── decks/              # Flashcard system
│   ├── progress/           # Progress tracking
│   ├── schedule/           # Calendar/scheduling
│   ├── reviewer/           # AI review system
│   └── core/               # Core settings
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── context/        # React context
│   │   └── utils/          # Utility functions
│   └── public/             # Static files
└── README.md
```

## Team Collaboration

### Git Workflow
1. Create feature branches: `git checkout -b feature/your-feature`
2. Make changes and commit: `git commit -m "Add feature description"`
3. Push to remote: `git push origin feature/your-feature`
4. Create pull request on GitHub

### Code Standards
- Use meaningful commit messages
- Follow PEP 8 for Python code
- Use TypeScript for frontend components
- Add comments for complex logic

## Troubleshooting

### Common Issues

1. **Backend won't start**
   - Check if virtual environment is activated
   - Verify all dependencies are installed
   - Check `.env` file configuration

2. **Frontend proxy issues**
   - Ensure backend is running on port 8000
   - Check proxy configuration in `package.json`

3. **Database connection errors**
   - Verify database credentials in `.env`
   - Ensure database server is running

4. **Email not working**
   - Check Gmail app password configuration
   - Verify SMTP settings in `.env`

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is for educational and team collaboration purposes.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review existing issues on GitHub
3. Create a new issue with detailed description
