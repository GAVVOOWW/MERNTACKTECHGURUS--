# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend (Node.js/Express)
- **Start development server**: `cd backend && npm run dev` (uses nodemon)
- **Start production server**: `cd backend && npm start` 
- **Seed database**: `cd backend && npm run seed`
- **Generate embeddings**: `cd backend && node scripts/generateEmbeddings.js`

### Frontend (React + Vite)
- **Start development server**: `cd frontend && npm run dev`
- **Build for production**: `cd frontend && npm run build`
- **Run linter**: `cd frontend && npm run lint`
- **Preview production build**: `cd frontend && npm run preview`

### Full Stack Development
- **Root commands**: `npm run dev` (backend), `npm start` (backend), `npm run seed` (backend)

## Architecture Overview

### Core Technology Stack
- **Backend**: Node.js with Express, MongoDB with Mongoose, Socket.IO for real-time chat
- **Frontend**: React 19 with Vite, React Router DOM, Bootstrap + Tailwind CSS
- **AI Integration**: Gemini API for query parsing, Xenova Transformers for semantic search
- **Payment**: PayMongo integration for Philippine market
- **File Storage**: Cloudinary for image management

### Database Architecture
**Core Models**:
- `Item`: Furniture products with vector embeddings for semantic search, customization options, and material configurations
- `User`: Authentication with role-based access (user/admin), includes embedded address schema
- `Cart`: User shopping cart with support for custom dimensions and materials
- `Order`: Complete order lifecycle with delivery tracking and payment integration
- `Category`: Room categories (Bedroom, Living Room, etc.)
- `FurnitureType`: Product types (Table, Chair, etc.)
- `Chat`: Real-time messaging system between users and admins

**Key Schema Features**:
- Items have vector embeddings for AI-powered semantic search
- Customizable items support material selection and dynamic pricing
- Orders track custom dimensions and materials for furniture customization
- Address schema supports Philippine PSGC (Philippine Standard Geographic Code) integration

### AI-Powered Search System
**Semantic Search Flow**:
1. User query → Gemini API for NLQ parsing (`utils/geminiParser.js`)
2. Parsed query → Vector embedding via Xenova Transformers
3. MongoDB Atlas Vector Search with filtering and sorting
4. Results ranked by semantic similarity score

**Embedding Generation**:
- Run `generateEmbeddings.js` script after adding new items
- Converts item properties to descriptive text for better search results
- Uses BGE-small-en-v1.5 model for embeddings

### Authentication & Authorization
- JWT-based authentication with role-based access control
- Middleware: `authenticateToken` for auth, `authorizeRoles` for permissions
- User roles: "user" (customers) and "admin" (staff)

### Real-time Features
- Socket.IO integration for live chat between customers and admins
- Real-time order status updates
- Chat system with message history and typing indicators

### Payment Integration
- PayMongo for Philippine peso transactions (GCash, Cards)
- Webhook handling for payment confirmation
- Order status tracking with delivery proof uploads

### Custom Furniture Pricing
**Dynamic Pricing System** (`utils/priceCalculator.js`):
- Calculates material requirements based on dimensions
- Supports different wood types (Narra, Acacia, etc.) with different costs
- Factors in labor costs, overhead, and profit margins
- API endpoint: `POST /api/items/:id/calculate-price`

### File Upload & Storage
- Multer for handling multipart/form-data
- Cloudinary integration for optimized image storage
- Support for multiple product images and delivery proof uploads

## Environment Configuration

**Backend (.env)**:
- `MONGO_URI`: MongoDB connection string with Atlas Vector Search
- `JWT_SECRET`: JWT signing secret
- `PAYMONGO_SECRET_KEY`: PayMongo API key
- `CLOUDINARY_*`: Cloud storage credentials
- `FRONTEND_URL`: CORS configuration

**Frontend (.env)**:
- `VITE_BACKEND_URL`: Backend API endpoint

## Development Patterns

### API Response Format
All API responses follow consistent format:
```javascript
{ success: boolean, message?: string, [DataType]: data }
```

### Error Handling
- Comprehensive try-catch blocks with detailed logging
- Consistent HTTP status codes
- User-friendly error messages

### Database Queries
- Mongoose with population for referenced documents
- Vector search queries require specific pipeline structure
- Atlas Vector Search index named 'vector_index' on 'embedding' field

### State Management
- Zustand for client-side state management
- JWT stored in localStorage for authentication state

### Routing Structure
- Frontend uses React Router with protected routes
- Backend follows RESTful conventions with role-based middleware

## Important Notes

### Vector Search Setup
- Requires MongoDB Atlas with Vector Search capability
- Items must have embeddings generated before search functionality works
- Search limit previously capped at 50 results (now configurable)

### Custom Furniture Workflow
1. User selects customizable item
2. Specifies dimensions and materials
3. System calculates price using `priceCalculator.js`
4. Order stores custom specifications
5. Admin receives order with full customization details

### Chat System
- Connects users with admin staff
- Real-time messaging with Socket.IO
- Message history persistence in MongoDB

### Payment Flow
1. Cart → Checkout → PayMongo session
2. PayMongo webhook confirms payment
3. Order status updated automatically
4. Admin uploads delivery proof to complete order