// Create a 400x225 black image with an orange play button in the center
const canvas = document.createElement('canvas');
canvas.width = 400;
canvas.height = 225;
const ctx = canvas.getContext('2d');

// Black background
ctx.fillStyle = '#191919';
ctx.fillRect(0, 0, 400, 225);

// Orange play triangle
ctx.fillStyle = '#FF6600';
ctx.beginPath();
ctx.moveTo(180, 112.5);
ctx.lineTo(140, 85);
ctx.lineTo(140, 140);
ctx.closePath();
ctx.fill();

// White text
ctx.fillStyle = '#ffffff';
ctx.font = '18px Arial';
ctx.textAlign = 'center';
ctx.fillText('Video Preview', 200, 135);

// Convert to base64 data URL
const base64 = canvas.toDataURL('image/png');
console.log(base64);