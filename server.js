const express = require('express');
const http = require('http');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

// Load environment variables configuration settings
dotenv.config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const swipeRoutes = require('./routes/swipeRoutes');
const matchRoutes = require('./routes/matchRoutes');
const messageRoutes = require('./routes/messageRoutes');
const agoraRoutes = require('./routes/agoraRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const errorHandler = require('./middlewares/errorHandler');
const AppError = require('./utils/appError');
const initSocket = require('./socket');

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = initSocket(server);
app.set('io', io); // Make socket instance accessible in routes if needed

// Middlewares
app.use(helmet());
app.use(cors({
  origin: '*', // Allow connection from Flutter app directly
  credentials: true,
}));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static profile uploads if needed (local filesystem upload fallback)
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/swipe', swipeRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/agora', agoraRoutes);
app.use('/api/subscription', subscriptionRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'Tinder backend is healthy!' });
});

// Handle unmapped routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Trigger nodemon restart
