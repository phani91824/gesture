// script.js

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const cameraFeed = document.getElementById('cameraFeed');
const cameraPlaceholder = document.getElementById('cameraPlaceholder');
const loadingSpinner = document.getElementById('loadingSpinner');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const connectionStatus = document.getElementById('connectionStatus');
const cameraStatus = document.getElementById('cameraStatus');
const gestureStatus = document.getElementById('gestureStatus');
const currentGesture = document.getElementById('currentGesture');

let socket = null;
let stream = null;

startBtn.addEventListener('click', async () => {
    // 1. Update UI to show connecting state
    statusIndicator.className = 'status-indicator status-connecting';
    statusText.textContent = 'Connecting...';
    connectionStatus.textContent = 'Connecting...';
    cameraStatus.textContent = 'Accessing...';
    loadingSpinner.style.display = 'flex';

    try {
        // 2. Access the webcam
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        cameraFeed.srcObject = stream;
        cameraPlaceholder.style.display = 'none';
        
        // Update UI for camera access
        cameraStatus.textContent = 'Accessed';
        cameraStatus.classList.remove('text-red-500');
        cameraStatus.classList.add('text-green-500');

        // 3. Connect to the WebSocket backend
        socket = new WebSocket('ws://127.0.0.1:5000'); // URL of your backend server

        socket.onopen = (event) => {
            console.log('WebSocket connection opened');
            // Update UI for successful connection
            statusIndicator.className = 'status-indicator status-online';
            statusText.textContent = 'Online';
            connectionStatus.textContent = 'Connected';
            connectionStatus.classList.remove('text-red-500');
            connectionStatus.classList.add('text-green-500');
            loadingSpinner.style.display = 'none';
            
            // Start sending video frames to the backend
            sendVideoFrames();
        };

        socket.onmessage = (event) => {
            // 4. Handle gesture data from the backend
            const gesture = event.data;
            currentGesture.textContent = gesture;
            gestureStatus.textContent = 'Active';
            gestureStatus.classList.remove('text-red-500');
            gestureStatus.classList.add('text-green-500');
        };

        socket.onclose = (event) => {
            console.log('WebSocket connection closed');
            handleDisconnect();
        };

        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            alert('Could not connect to the backend. Please ensure the backend server is running.');
            handleDisconnect();
        };

    } catch (err) {
        console.error("Error accessing camera:", err);
        alert("Failed to access camera. Please check permissions.");
        handleDisconnect();
    }
});

stopBtn.addEventListener('click', () => {
    handleDisconnect();
});

function handleDisconnect() {
    // Stop the camera stream
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        cameraFeed.srcObject = null;
    }
    // Close WebSocket connection
    if (socket) {
        socket.close();
        socket = null;
    }
    // Reset UI to disconnected state
    statusIndicator.className = 'status-indicator status-offline';
    statusText.textContent = 'Disconnected';
    connectionStatus.textContent = 'Disconnected';
    connectionStatus.classList.remove('text-green-500');
    connectionStatus.classList.add('text-red-500');
    cameraStatus.textContent = 'Not accessed';
    cameraStatus.classList.remove('text-green-500');
    cameraStatus.classList.add('text-red-500');
    gestureStatus.textContent = 'Inactive';
    gestureStatus.classList.remove('text-green-500');
    gestureStatus.classList.add('text-red-500');
    currentGesture.textContent = 'None';
    loadingSpinner.style.display = 'none';
    cameraPlaceholder.style.display = 'flex';
}

function sendVideoFrames() {
    if (socket && socket.readyState === WebSocket.OPEN && stream) {
        // Create a canvas to capture a frame from the video
        const canvas = document.createElement('canvas');
        canvas.width = cameraFeed.videoWidth;
        canvas.height = cameraFeed.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(cameraFeed, 0, 0, canvas.width, canvas.height);
        
        // Convert the canvas data to a base64 string
        const imageData = canvas.toDataURL('image/jpeg', 0.5); 
        
        // Send the image data over the WebSocket
        socket.send(imageData);

        // Schedule the next frame to be sent
        setTimeout(sendVideoFrames, 100); // Adjust this value to control frame rate
    }
}