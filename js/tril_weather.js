const apiKey = 'd419f9cfc927cbf6c34217ff5cbe4f67'; // Replace with your actual key
const city = 'London';
// Corrected URL structure
const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

fetch(url)
  .then(response => {
    // It's good practice to check if the response is actually okay (e.g., 200 OK)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    console.log(`Current temp in ${data.name}: ${data.main.temp}°C`);
    console.log(`Weather: ${data.weather[0].description}`);
  })
  .catch(error => {
    console.error('Error fetching weather:', error);
  });