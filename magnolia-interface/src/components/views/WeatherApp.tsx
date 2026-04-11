import { useState, useEffect, useCallback } from 'react';
import { Wind, Droplets, Sun, Cloud, CloudRain, MapPin, RefreshCw, Thermometer, CloudLightning } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface WeatherData {
  temp: number;
  feelsLike: number;
  humidity: number;
  wind: number;
  conditionCode: number;
  condition: string;
}

export function WeatherApp() {
  const [cityName, setCityName] = useState<string>('Detecting...');
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    setIsLoading(true);
    try {
      // 1. Get City Name
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
      const geoData = await geoRes.json();
      setCityName(geoData.address.city || geoData.address.town || geoData.address.village || 'Magnolia Zone');

      // 2. Get Weather (Open-Meteo)
      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m`);
      const data = await weatherRes.json();
      const current = data.current;

      setWeatherData({
        temp: Math.round(current.temperature_2m),
        feelsLike: Math.round(current.apparent_temperature),
        humidity: current.relative_humidity_2m,
        wind: Math.round(current.wind_speed_10m),
        conditionCode: current.weather_code,
        condition: getConditionText(current.weather_code)
      });
    } catch (e) {
      toast.error("Weather sync failed");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        fetchWeather(position.coords.latitude, position.coords.longitude);
      }, () => {
        setCityName('Permission Denied');
      });
    } else {
      setCityName('Geo Unsupported');
    }
  }, [fetchWeather]);

  const getConditionIcon = (code: number) => {
    if (code === 0) return <Sun size={64} color="#fcd34d" />;
    if (code <= 3) return <Cloud size={64} color="var(--schemes-primary)" />;
    if (code <= 69) return <CloudRain size={64} color="var(--schemes-primary)" />;
    if (code <= 99) return <CloudLightning size={64} color="var(--schemes-primary)" />;
    return <Cloud size={64} color="var(--schemes-outline)" />;
  };

  const getConditionText = (code: number) => {
    if (code === 0) return 'Clear Skies';
    if (code <= 3) return 'Partly Cloudy';
    if (code <= 69) return 'Rainy';
    if (code <= 99) return 'Storm';
    return 'Overcast';
  };

  if (!weatherData) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <RefreshCw size={32} className="animate-spin" color="var(--schemes-primary)" />
      </div>
    );
  }

  return (
    <div style={{ height: '100%', padding: '48px', display: 'flex', flexDirection: 'column', gap: '32px', background: 'var(--schemes-surface-container-lowest)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--schemes-primary)', marginBottom: '8px' }}>
            <MapPin size={18} />
            <span style={{ fontSize: '15px', fontWeight: 600 }}>{cityName}</span>
          </div>
          <h1 style={{ fontSize: '72px', margin: 0, fontWeight: 300, color: 'var(--schemes-on-surface)' }}>
            {weatherData.temp}°C
          </h1>
          <p style={{ fontSize: '18px', color: 'var(--schemes-on-surface-variant)' }}>{weatherData.condition}</p>
        </div>
        <div style={{ padding: '24px', borderRadius: '32px', background: 'var(--schemes-surface-container-high)' }}>
          {getConditionIcon(weatherData.conditionCode)}
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        <WeatherCard icon={<Droplets />} label="Humidity" value={`${weatherData.humidity}%`} />
        <WeatherCard icon={<Wind />} label="Wind" value={`${weatherData.wind} km/h`} />
        <WeatherCard icon={<Thermometer />} label="Feels Like" value={`${weatherData.feelsLike}°`} />
      </div>

      <div style={{ marginTop: 'auto', padding: '24px', borderRadius: '24px', border: '1px solid var(--schemes-outline-variant)', background: 'var(--schemes-surface-container-low)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--schemes-outline)' }}>
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Updated recently from local mesh
        </p>
        <button 
          onClick={() => navigator.geolocation.getCurrentPosition(p => fetchWeather(p.coords.latitude, p.coords.longitude))}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--schemes-primary)', fontSize: '12px', fontWeight: 600 }}
        >
          Refresh Now
        </button>
      </div>
    </div>
  );
}

interface WeatherCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function WeatherCard({ icon, label, value }: WeatherCardProps) {
  return (
    <div style={{ padding: '24px', borderRadius: '24px', background: 'var(--schemes-surface-container)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ color: 'var(--schemes-primary)' }}>{icon}</div>
      <div>
        <p style={{ fontSize: '12px', color: 'var(--schemes-on-surface-variant)', marginBottom: '4px' }}>{label}</p>
        <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--schemes-on-surface)' }}>{value}</p>
      </div>
    </div>
  );
}
