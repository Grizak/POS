const socket = io();  // Connect to the Socket.IO server

// Fetch orders on page load
window.addEventListener('DOMContentLoaded', () => {
  fetch('/orders')
    .then(response => response.json())
    .then(orders => {
      orders.forEach(order => {
        displayOrder(order); // Display orders when the page loads
      });
    })
    .catch(err => {
      console.error('Error fetching orders:', err);
    });
});

document.getElementById('addOrder').addEventListener('click', function() {
  addOrder();
});

document.getElementById('orderItem').addEventListener('keydown', function(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    addOrder();
  }
});

function addOrder() {
  const orderItem = document.getElementById('orderItem').value;
  if (orderItem) {
    // Emit the new order to the server
    socket.emit('newOrder', orderItem);

    // Clear input field
    document.getElementById('orderItem').value = ''; 
  }
}

// Listen for incoming orders from the server and add them to the list
socket.on('orderReceived', function(order) {
  // Check if the order already exists in the list
  const existingOrderElement = document.getElementById(`order-${order._id}`);
  
  if (existingOrderElement) {
    // If order exists, just update the status
    existingOrderElement.querySelector('.status').textContent = `Status: ${order.status}`;
  } else {
    // If order doesn't exist, create a new element
    displayOrder(order);
  }
});

// Function to display order and its status
function displayOrder(order) {
  const li = document.createElement('li');
  li.id = `order-${order._id}`;  // Assign a unique ID based on the order _id
  li.innerHTML = `${order.item} <span class="status">Status: ${order.status}</span>`; // Added the status in the innerHTML
  
  // Add status change buttons
  const statusButton = document.createElement('button');
  statusButton.textContent = 'Change Status';
  statusButton.addEventListener('click', () => changeStatus(order._id, order.status, li));
  
  li.appendChild(statusButton);
  document.getElementById('orderList').appendChild(li);
}

// Function to change the status of an order
function changeStatus(orderId, currentStatus, li) {
  let newStatus = '';

  // Toggle through the status options
  if (currentStatus === 'Pending') {
    newStatus = 'In Progress';
  } else if (currentStatus === 'In Progress') {
    newStatus = 'Completed';
    li.querySelector('button').disabled = true;
  }

  // Emit the status change to the server
  socket.emit('updateStatus', { orderId, newStatus });

  // Directly update the DOM (this avoids waiting for the next emitted update)
  li.querySelector('.status').textContent = `Status: ${newStatus}`;
}
