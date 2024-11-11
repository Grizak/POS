const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));  // Serve static files from 'public' folder

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch((err) => console.error('Error connecting to MongoDB: ', err));

const orderSchema = new mongoose.Schema({
    item: String,
    status: {
        type: String,
        enum: ['Pending', 'In Progress', 'Completed'],
        default: "Pending",
    },
});

const Order = mongoose.model('Order', orderSchema);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/../public/index.html');
});

app.get('/orders', async (req, res) => {
    try {
        const orders = await Order.find();
        res.json(orders);
    } catch (err) {
        res.status(500).send('Error retriving orders');
    }
});

// Handle real-time orders and status changes
io.on('connection', (socket) => {
    console.log('A user connected');

    // Send all orders to the newly connected client
    Order.find().then(orders => {
        orders.forEach(order => {
            socket.emit('orderReceived', order);
        });
    });
    
    // Listen for new orders and emit to all clients
    socket.on('newOrder', (orderItem) => {
        const order = new Order({ item: orderItem, status: 'Pending' });  // Default status is 'Pending'
        order.save().then(() => {
            io.emit('orderReceived', order);  // Broadcast new order to all clients
        });
    });

    // Handle status update
    socket.on('updateStatus', ({ orderId, newStatus }) => {
        Order.findByIdAndUpdate(orderId, { status: newStatus }, { new: true })
            .then(updatedOrder => {
                console.log('Update Order', updatedOrder);
                io.emit('orderReceived', updatedOrder);  // Send updated order to all clients
            })
            .catch(err => console.error('Error updating order status:', err));
    });


    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
