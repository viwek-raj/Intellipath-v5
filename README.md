# Intellipath  - AI-Powered Personalized Learning Platform

Intellipath  is a cutting-edge educational platform that leverages Artificial Intelligence to generate personalized curriculum, quizzes, and learning paths instantly. Built with the **MERN stack**, **Next.js 16**, and **Ollama**, it offers a premium, adaptive learning experience tailored to each user.

## 🚀 Key Features

- **🤖 AI Course Generation**: Instantly create structured courses on any topic using local LLMs (Ollama).
- **📚 Personalized Learning Paths**: Adaptive curriculum that fits your skill level (Beginner to Expert).
- **📝 Interactive Assessments**: Automatically generated quizzes (3 questions/module) to verify knowledge retention.
- **📊 Learning Analytics**: Real-time dashboard tracking progress, lessons learned, and average scores.
- **🔒 Secure Authentication**: Robust JWT-based auth with HTTP-only cookies and Middleware protection.
- **🎨 Premium UI/UX**: Built with Shadcn/UI, Framer Motion, and a heavily customized Material Design 3 aesthetic.

## 🛠️ Tech Stack

### Frontend

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, Shadcn/UI, Lucide Icons
- **Animation**: Framer Motion
- **State**: React Context API

### Backend

- **Runtime**: Node.js
- **Framework**: Express.js 5
- **Database**: MongoDB (Mongoose)
- **AI Engine**: [Ollama](https://ollama.ai/) (Local LLM Integration)
- **Auth**: JSON Web Tokens (JWT) & Bcrypt

## ⚙️ Prerequisites

Before running the project, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18+)
- [MongoDB](https://www.mongodb.com/try/download/community) (running locally or Atlas URI)
- [Ollama](https://ollama.ai/) (running locally with a model pulled, e.g., `ollama pull llama3`)

## 📦 Installation

1.  **Clone the repository**

    ```bash
    git clone https://github.com/viwek-raj/intellipath.git
    cd Intellipath 
    ```

2.  **Install Server Dependencies**

    ```bash
    cd server
    npm install
    ```

3.  **Install Client Dependencies**
    ```bash
    cd ../client
    npm install
    ```

## 🔧 Configuration

### Server Environment (`server/.env`)

Create a `.env` file in the `server` directory:

```env
PORT=3001
MONGO_URI=mongodb://localhost:27017/Intellipath 
JWT_SECRET=your_super_secret_key_change_this_in_production
OLLAMA_HOST=http://localhost:11434
```

### Client Environment

The client is pre-configured to proxy API requests to `http://localhost:3001` via `next.config.ts` or direct API client configuration. Ensure the base URL matches your server port.

## 🏃‍♂️ Running the Project

### 1. Start the Backend Server

```bash
# In the /server directory
npm run dev
```

_Server will run on http://localhost:3001_

### 2. Start the Frontend Application

```bash
# In the /client directory
npm run dev
```

_Client will run on http://localhost:3000_

### 3. Start AI Engine

Ensure Ollama is running in the background:

```bash
ollama serve
```

## 📂 Project Structure

```
Intellipath /
├── client/                 # Next.js Frontend
│   ├── src/
│   │   ├── app/           # App Router Pages
│   │   ├── components/    # Reusable UI Components
│   │   ├── context/       # Auth Context
│   │   ├── lib/           # API Utilities
│   │   └── middleware.ts  # Route Protection
│   └── ...
├── server/                 # Express Backend
│   ├── src/
│   │   ├── controllers/   # Business Logic
│   │   ├── models/        # Mongoose Schemas
│   │   ├── routes/        # API Endpoints
│   │   └── services/      # Ollama/AI Services
│   └── ...
└── README.md
```

## 🛡️ License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
