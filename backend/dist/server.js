import express from 'express';
import cors from 'cors';
import { roomsRouter } from './routes/rooms.js';
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/rooms', roomsRouter);
app.listen(3005, () => {
    console.log('Backend running on http://localhost:3005');
});
