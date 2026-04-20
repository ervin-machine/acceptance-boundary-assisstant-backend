# Acceptance and Boundary Assistant - Backend API

HIPAA-compliant Node.js + Express + PostgreSQL backend for the ACT-based mental health application.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- Claude API key from Anthropic

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env

# Run database migrations
psql -U postgres -d acceptance_boundary_assistant -f migrations/001_initial_schema.sql
psql -U postgres -d acceptance_boundary_assistant -f migrations/002_indexes.sql
psql -U postgres -d acceptance_boundary_assistant -f migrations/003_audit_triggers.sql
```

### Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run production server
npm start
```

### Docker Deployment

```bash
# Start all services (PostgreSQL, Redis, Node)
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Emotions (Feelings Weather)
- `POST /api/emotions` - Log emotion entry
- `GET /api/emotions` - Get all emotions (paginated)
- `GET /api/emotions/:id` - Get single emotion
- `PUT /api/emotions/:id` - Update emotion
- `DELETE /api/emotions/:id` - Delete emotion

### Values (Values Clarification)
- `POST /api/values` - Create value entry
- `GET /api/values` - Get all values (paginated)
- `GET /api/values/:id` - Get single value
- `PUT /api/values/:id` - Update value
- `DELETE /api/values/:id` - Delete value

### Actions (Committed Action Planner)
- `POST /api/actions` - Create action
- `GET /api/actions` - Get all actions (paginated)
- `GET /api/actions/:id` - Get single action
- `PUT /api/actions/:id` - Update action
- `DELETE /api/actions/:id` - Delete action

### Boundaries (Boundary Assistant)
- `POST /api/boundaries` - Create boundary practice
- `GET /api/boundaries` - Get all boundaries (paginated)
- `GET /api/boundaries/:id` - Get single boundary
- `PUT /api/boundaries/:id` - Update boundary
- `DELETE /api/boundaries/:id` - Delete boundary

### AI Companion
- `POST /api/ai/chat` - Send message to AI companion
- `GET /api/ai/conversations` - Get conversation history
- `DELETE /api/ai/conversations` - Delete conversation history
- `POST /api/ai/micro-steps` - Generate action micro-steps
- `POST /api/ai/analyze-boundary` - Analyze boundary response
- `POST /api/ai/acceptance-guidance` - Get ACT acceptance guidance
- `GET /api/ai/daily-check-in` - Get personalized check-in
- `POST /api/ai/reflective-listening` - Get empathetic response
- `GET /api/ai/boundary-value-insights` - Get insights on conflicts

## 🔐 Security Features

### HIPAA Compliance
- ✅ **AES-256-GCM encryption** for all PII and sensitive data
- ✅ **TLS 1.3** in transit (configure with reverse proxy)
- ✅ **Audit logging** with 7-year retention
- ✅ **Access controls** via JWT authentication
- ✅ **Session timeout** (30 minutes)
- ✅ **Encrypted backups** (configure with PostgreSQL)
- ✅ **Data breach detection** via audit logs

### Authentication & Authorization
- JWT access tokens (30-minute expiry)
- JWT refresh tokens (7-day expiry)
- Bcrypt password hashing (12 rounds)
- Session management in PostgreSQL
- User data isolation (row-level security)

### Rate Limiting
- General API: 100 requests / 15 minutes
- Authentication: 5 requests / 15 minutes
- AI endpoints: 20 requests / 15 minutes
- Redis-backed distributed rate limiting

### Input Validation
- Express-validator for all inputs
- XSS prevention via sanitization
- SQL injection prevention (parameterized queries)
- CSRF protection
- Content-length limits

## 🤖 AI Companion Features

### Core Capabilities
1. **Values-Aware Conversations** - AI knows user's values and progress
2. **Crisis Detection** - Automatic crisis keyword monitoring
3. **Acceptance Guidance** - ACT-based emotional support
4. **Boundary Coaching** - Analyzes passive/aggressive/assertive communication
5. **Micro-Step Generation** - Breaks actions into tiny steps
6. **Daily Check-ins** - Personalized messages for lonely users
7. **Reflective Listening** - Empathetic active listening
8. **Insight Generation** - Identifies boundary-value conflicts

### Crisis Detection
Monitors for keywords:
- suicide, self-harm, end it all, better off dead, kill myself, etc.

Responds with:
- Crisis resources (988 Lifeline, Crisis Text Line)
- Warm, concerned message
- Encouragement to seek professional help

### Conversation Context
AI receives:
- User's top values (importance + alignment scores)
- Recent emotional patterns
- Current committed actions
- Boundary work in progress
- Last 10 messages for continuity

## 💾 Database Schema

### Tables
- **users** - Encrypted email, name, password hash
- **emotions** - Emotion tracking with body sensations
- **values** - Values with importance/alignment
- **actions** - Committed actions with micro-steps
- **boundary_practices** - Boundary scenarios and responses
- **messages** - AI conversation history
- **sessions** - Refresh token management
- **audit_logs** - HIPAA compliance trail (immutable)

### Encryption Strategy
- **Email**: SHA-256 hash for search + AES-256 encrypted value
- **PII**: All names, emotions, values, etc. encrypted with AES-256-GCM
- **Passwords**: Bcrypt (12 rounds)
- **Tokens**: SHA-256 hash for storage

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 📊 Monitoring & Logs

### Log Files
- `logs/combined.log` - All logs
- `logs/error.log` - Errors only
- `logs/exceptions.log` - Uncaught exceptions
- `logs/rejections.log` - Unhandled promise rejections

### Log Levels
- `error` - Errors
- `warn` - Warnings
- `info` - General information (default)
- `debug` - Detailed debugging

## 🔧 Configuration

### Required Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/db
ENCRYPTION_KEY=<32-byte-hex>

# JWT
JWT_SECRET=<secure-random-string>
JWT_REFRESH_SECRET=<secure-random-string>

# OpenRouter API (https://openrouter.ai/keys)
OPENROUTER_API_KEY=sk-or-v1-...

# Redis
REDIS_URL=redis://localhost:6379

# Security
CORS_ORIGIN=https://yourdomain.com
```

### Generate Secure Keys
```bash
# Encryption key (32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# JWT secrets (64 bytes)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 📈 Performance

### Database Indexes
- Email hash lookup (users)
- User ID + created_at composite (all tables)
- Importance DESC (values)
- Completed status (actions)
- Active sessions only (partial index)

### Caching Strategy
- Redis for rate limiting
- Redis for session cache (future)
- Database connection pooling (max 20)

### Pagination
- Default: 20 items per page
- Maximum: 100 items per page

## 🚨 Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `409` - Conflict
- `429` - Too Many Requests
- `500` - Internal Server Error

## 🔄 Backup & Recovery

### Automated Backups (Configure)
```bash
# Daily PostgreSQL backup (add to cron)
0 2 * * * pg_dump -U postgres acceptance_boundary_assistant | gzip > /backups/db-$(date +\%Y\%m\%d).sql.gz

# Encrypt backups
gpg --encrypt --recipient your@email.com /backups/db-*.sql.gz
```

### Data Retention
- **Conversation history**: 90 days (configurable)
- **Audit logs**: 7 years (HIPAA requirement)
- **User data**: Indefinite (until user deletion)

## 📝 License

MIT

## 🤝 Support

For issues or questions, contact: [your-support-email]

---

**⚠️ IMPORTANT**: This application provides mental health support tools but is NOT a replacement for professional therapy or crisis services. Always direct users in crisis to 988 Lifeline or emergency services.
