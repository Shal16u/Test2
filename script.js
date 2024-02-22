const API_KEY = '31531d3c6bdfd09a6d4519950c2b05af';
const unit = 'metric';
const week = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const getCities = async(search_text) => {
    const response = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${search_text}&limit=5&appid=${API_KEY}`);

    return response.json();
}

const getCityEntries = async(event) => {
    const {value} = event.target;
    const cities = await getCities(value);
    let options = '';
    for(let {lat, lon, name, state, country} of cities) {
        options += `
            <option details='${JSON.stringify({lat, lon, name})}' value="${name}, ${state}, ${country}"></option>
        `;
    }
    document.getElementById('cities_list').innerHTML = options;
}

const debounce = (func) => {
    let timer;

    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() =>{
            func.apply(this, args);
        }, 500);
    }
}

const debouceSearch = debounce((event) => {getCityEntries(event)});

const updateCity = (event) => {
    let selectedText = event.target.value;
    let options = document.querySelectorAll("#cities_list > option");
    if(options?.length){
        let selectedOption = Array.from(options).find(option => option.value === selectedText);
        let selectedDetails = JSON.parse(selectedOption.getAttribute("details"));
        loadContents(selectedDetails);
    }
}

const currentWeather = async({lat, lon}) =>{
    const currentdata = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${unit}`);
    return currentdata.json();
}

const formatTemp = (temp) => `${temp?.toFixed(1)}°`;

const loadCurrentWeather = ({main: {temp}, name, weather:[{description, icon}]}) => {
    document.getElementsByClassName("temp")[0].textContent = formatTemp(temp);
    document.getElementsByClassName("city")[0].textContent = name;
    document.getElementsByClassName("img_desc")[0].innerHTML = `<img src="${getURL(icon)}" alt="icon"> <p class="desc">${description}</p>`;
}

const loadWindSpeed = ({wind:{speed}}) => {
    document.getElementsByClassName("speed")[0].textContent = `${speed} m/s`;
}

const loadHumidity = ({main:{humidity}}) => {
    document.getElementsByClassName("humidity-data")[0].textContent = `${humidity}%`;
}

const weatherForecast = async({lat, lon, name:city}) => {
    const forecastData = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${unit}`);
    const data = await forecastData.json();
    return data.list.map((forecast) => {
        const {main:{temp, temp_min, temp_max}, weather:[{description, icon}], dt, dt_txt} = forecast;
        return {temp, temp_min, temp_max, description, icon, dt_txt, dt};
    })
}

const loadHourlyForecast = (hourlyForecast) => {
    let requiredData = hourlyForecast.slice(2, 14);
    const container = document.querySelector(".hourly_container");
    const timeFormatter = Intl.DateTimeFormat("en", {
        hour12: true, hour:"numeric"
    })
    let innerHTMLString = "";

    for(let {dt_txt, icon, temp, description} of requiredData){
        innerHTMLString += `
        <article>
            <h4>${timeFormatter.format(new Date(dt_txt))}</h4>
            <img src="${getURL(icon)}" alt="icon" />
            <p class="desc">${description}</p>
            <p>${formatTemp(temp)}C</p>
        </article>
        `
    }
    container.innerHTML = innerHTMLString;
}

const getURL = (icon) => `https://openweathermap.org/img/wn/${icon}@2x.png`;

const dayWiseForecast = (hourlyForecast) => {
    let dayWiseForecast = new Map();

    for(let i = 0; i < hourlyForecast.length; i++){
        const forecast = hourlyForecast[i];
        const date = forecast.dt_txt.split(" ")[0];
        if(i === 0 && hourlyForecast[1].dt_txt.split(" ")[0] != date){
            continue;
        }
        const day = week[new Date(date).getDay()];

        if(dayWiseForecast.has(day)){
            let forecastOfTheDay = dayWiseForecast.get(day);
            forecastOfTheDay.push(forecast);
            dayWiseForecast.set(day, forecastOfTheDay);
        }else{
            dayWiseForecast.set(day, [forecast]);
        }
    }

    for(let [key, value] of dayWiseForecast){
        const temp_min = Math.min(...Array.from(value, val => val.temp_min));
        const temp_max = Math.max(...Array.from(value, val => val.temp_max));
        const icons = Array.from(value, val => val.icon)
        let mostOccuredIcon = new Map();
        
        for(let icon of icons){
            if(mostOccuredIcon.has(icon)){
                let occurance = mostOccuredIcon.get(icon);
                mostOccuredIcon.set(icon, occurance+1);
            }else{
                mostOccuredIcon.set(icon, 1);
            }
        }

        let occurance = 0;
        let icon = "";
        for(let [key, val] of mostOccuredIcon){
            if(occurance < val){
                occurance = val;
                icon = key;
            }
        }

        dayWiseForecast.set(key, {temp_min, temp_max, icon});
    }

    return dayWiseForecast;
}

const loadFiveDayForecase = (dayWiseForecastData) => {
    const container = document.querySelector(".five-day-forecast-container");
    let innerHTML = ``;

    Array.from(dayWiseForecastData).map(([day, {temp_min, temp_max, icon}], index) => {
        if(index < 5){
            if(index === 0) day = "Today";
            else if(index === 1) day = "Tommorow";
            innerHTML += `
            <article>
                <h4>${day}</h4>
                <img src="${getURL(icon)}" alt="">
                <p class="high_low">${formatTemp(temp_max)} / ${formatTemp(temp_min)}</p>
            </article>
            `
        }
    })

    container.innerHTML = innerHTML;
}

const loadContents = async(selectedDetails) =>{    
    const currWeatherData = await currentWeather(selectedDetails);
    loadCurrentWeather(currWeatherData);
    loadWindSpeed(currWeatherData);
    loadHumidity(currWeatherData);

    const hourlyForecast = await weatherForecast(selectedDetails);
    loadHourlyForecast(hourlyForecast);

    const dayWiseForecastData = dayWiseForecast(hourlyForecast);
    loadFiveDayForecase(dayWiseForecastData);
}

const currLocation = () => {
    navigator.geolocation.getCurrentPosition(currLocation => {
        const selectedDetails = {
            lat : currLocation.coords.latitude,
            lon : currLocation.coords.longitude
        }
        loadContents(selectedDetails);
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    currLocation();
    const cityInput = document.getElementById("search");
    cityInput.addEventListener("input", debouceSearch);
    cityInput.addEventListener("change", updateCity);    
})
