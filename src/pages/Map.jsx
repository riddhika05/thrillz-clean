import React, { useState, useEffect, useRef } from "react";
import { Navigation, Search } from "lucide-react";
import { motion } from "framer-motion";
import { FaArrowLeft } from "react-icons/fa"; 
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"; 
import { supabase } from "../supabaseClient"; 
import DreamyLoader from "../components/loader"; 
import "leaflet/dist/leaflet.css"; 
import L from "leaflet"; 
import axios from "axios";
import bgImage from "../assets/new post.png"; 
import musicIcon from "../assets/music.png"; 

// Fix Leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
});

// Custom whisper marker
const whisperIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// MapUpdater component to dynamically change map center
function MapUpdater({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position && map) {
      map.flyTo(position, 16);
    }
  }, [map, position]);
  return null;
}

// MyLocationMarker component to display user's location with an always-open popup
function MyLocationMarker({ position, placeName }) {
  const markerRef = useRef(null);

  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.openPopup();
    }
  }, [position]);

  return (
    <Marker position={position} ref={markerRef}>
      <Popup>
        📍 {placeName || "My Location"} <br />
        Lat: {position[0].toFixed(5)}, Lon: {position[1].toFixed(5)}
      </Popup>
    </Marker>
  );
}

// Main Map component
export default function Map({ audioRef }) {
  const DELHI_COORDS = [28.6139, 77.2090];
  const [position, setPosition] = useState(DELHI_COORDS); 
  const [placeName, setPlaceName] = useState("Loading...");
  const [relevantPlaces, setRelevantPlaces] = useState([]);
  const [whispers, setWhispers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("cafe");
  const [loading, setLoading] = useState(true); 
  const [isMuted, setIsMuted] = useState(false);

  const navigate = useNavigate();

  // Sync mute state with audioRef
  useEffect(() => {
    if (audioRef?.current) {
      setIsMuted(audioRef.current.muted);
    }
  }, [audioRef]);

  // Toggle music mute state
  const toggleMusic = () => {
    if (audioRef?.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setIsMuted(audioRef.current.muted);
    }
  };

  // Fetch place name
  const fetchPlaceName = async (lat, lon) => {
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
      );
      return response.data.display_name;
    } catch (err) {
      console.error("Error fetching place name:", err);
      return "Unknown Location";
    }
  };

  // NEW: Function to fetch whispers from Supabase
  const fetchWhispers = async (lat, lon) => {
    const radius = 0.005; // 500 meters approximation in degrees
    try {
      const { data, error } = await supabase
        .from("Whispers")
        .select("id, content, latitude, longitude")
        .gte("latitude", lat - radius)
        .lte("latitude", lat + radius)
        .gte("longitude", lon - radius)
        .lte("longitude", lon + radius);

      if (error) {
        console.error("Error fetching whispers:", error);
        return [];
      }
      return data;
    } catch (err) {
      console.error("Unexpected error fetching whispers:", err);
      return [];
    }
  };

  // Fetch and set nearby places and whispers
  const fetchAndSetData = async (lat, lon, cat = category) => {
    setLoading(true);
    try {
      // Fetch relevant places
      const query = `
        [out:json];
        ( node["amenity"="${cat}"](around:500,${lat},${lon}); );
        out center;
      `;
      const placesResponse = await axios.post(
        "https://overpass-api.de/api/interpreter",
        query,
        { headers: { "Content-Type": "text/plain" } }
      );
      const places = placesResponse.data.elements.filter(
        (el) => el.tags && el.tags.name
      );
      setRelevantPlaces(places);

      // Fetch whispers
      const fetchedWhispers = await fetchWhispers(lat, lon);
      setWhispers(fetchedWhispers);
      
    } catch (error) {
      console.error("Error fetching data:", error);
      setRelevantPlaces([]);
      setWhispers([]);
    } finally {
      setLoading(false);
    }
  };

  // Get user's current location
  const locateMe = async (useCurrentLocation = true) => {
    setLoading(true);
    if (useCurrentLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const newPosition = [pos.coords.latitude, pos.coords.longitude];
          setPosition(newPosition);
          const name = await fetchPlaceName(newPosition[0], newPosition[1]);
          setPlaceName(name);
          // Use the new combined function
          await fetchAndSetData(newPosition[0], newPosition[1], category);
        },
        async (err) => {
          console.error("Geolocation error:", err);
          setPosition(DELHI_COORDS);
          const name = await fetchPlaceName(DELHI_COORDS[0], DELHI_COORDS[1]);
          setPlaceName(name);
          // Use the new combined function
          await fetchAndSetData(DELHI_COORDS[0], DELHI_COORDS[1], category);
        }
      );
    } else {
      setPosition(DELHI_COORDS);
      const name = await fetchPlaceName(DELHI_COORDS[0], DELHI_COORDS[1]);
      setPlaceName(name);
      // Use the new combined function
      await fetchAndSetData(DELHI_COORDS[0], DELHI_COORDS[1], category);
    }
  };

  // Handle search
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    setLoading(true);
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          searchQuery
        )}&format=json&limit=1`
      );
      if (response.data.length > 0) {
        const place = response.data[0];
        const newPosition = [parseFloat(place.lat), parseFloat(place.lon)];
        setPosition(newPosition);
        setPlaceName(place.display_name);
        await fetchAndSetData(newPosition[0], newPosition[1], category);
      } else {
        setPlaceName("No results found for your search.");
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Initial data load on component mount
  useEffect(() => {
    locateMe();
  }, []);

  // Re-fetch data when category or position changes
  useEffect(() => {
    if (!loading && position) {
      fetchAndSetData(position[0], position[1], category);
    }
  }, [category]);

  // Reusable Button component
  const Button = ({ children, icon: Icon, onClick, className = "" }) => (
    <motion.button
      whileHover={{ y: -1, boxShadow: "0 8px 28px rgba(0,0,0,0.18)" }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold tracking-wide text-white shadow-lg backdrop-blur-md transition ${className}`}
    >
      {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
      <span>{children}</span>
    </motion.button>
  );

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      {/* Back button */}
      <div
        className="absolute top-4 left-4 z-20"
        onClick={() => navigate("/post")}
      >
        <FaArrowLeft className="text-pink-300 text-3xl cursor-pointer" />
      </div>

      {/* Search + Category + Music */}
      <div className="mx-auto mt-16 sm:mt-6 w-[95%] sm:w-[90%] max-w-3xl flex flex-col sm:flex-row gap-3">
        <form
          onSubmit={handleSearch}
          className="flex flex-1 items-center rounded-full border border-gray-300 bg-white shadow-md px-4 py-2"
        >
          <Search className="w-5 h-5 text-gray-500 mr-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for a place..."
            className="flex-1 outline-none text-gray-700"
          />
          <button
            type="submit"
            className="ml-3 rounded-full bg-violet-500 text-white px-4 py-2"
          >
            Go
          </button>
        </form>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-full border border-gray-300 bg-white shadow-md px-3 py-2 text-gray-700 focus:outline-none text-sm sm:text-base"
        >
          <option value="cafe">Cafés</option>
          <option value="restaurant">Restaurants</option>
          <option value="fast_food">Fast Food</option>
          <option value="atm">ATMs</option>
          <option value="hospital">Hospitals</option>
          <option value="pharmacy">Pharmacies</option>
          <option value="school">Schools</option>
          <option value="park">Parks</option>
          <option value="library">Libraries</option>
        </select>

        {/* Music button */}
        <div className="ml-auto flex flex-wrap items-center">
          <div className="relative cursor-pointer" onClick={toggleMusic}>
            <img
              src={musicIcon}
              alt="Music"
              className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12"
            />
            {isMuted && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-[3px] bg-red-600 rotate-45"></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="mx-auto mt-6 w-[95%] sm:w-[90%] max-w-5xl">
        <div className="relative h-[50vh] sm:h-[60vh] rounded-[28px] shadow-lg overflow-hidden">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-30">
              <DreamyLoader />
            </div>
          )}
          <MapContainer
            center={position}
            zoom={16}
            style={{ height: "100%", width: "100%" }}
            className="rounded-[28px]"
            whenCreated={(map) => {
              window.addEventListener("resize", () => {
                setTimeout(() => map.invalidateSize(), 0);
              });
            }}
          >
            <MapUpdater position={position} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={18}
            />
            <MyLocationMarker position={position} placeName={placeName} />
            {relevantPlaces.map((place) => (
              <Marker key={place.id} position={[place.lat, place.lon]}>
                <Popup>{place.tags.name}</Popup>
              </Marker>
            ))}
            {whispers.map((whisper) => (
              <Marker
                key={whisper.id}
                position={[whisper.latitude, whisper.longitude]}
                icon={whisperIcon}
              >
                <Popup>{whisper.content}</Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="pointer-events-none absolute inset-x-0 bottom-6 flex w-full justify-center">
        <div className="pointer-events-auto flex flex-wrap items-center gap-4 sm:gap-6 rounded-3xl border border-white/20 bg-white/15 px-4 py-3 shadow-xl backdrop-blur-xl">
          <Button
            icon={Navigation}
            onClick={() => locateMe(true)}
            className="bg-violet-500/90 hover:bg-violet-500/90"
          >
            Locate Me
          </Button>
        </div>
      </div>
    </div>
  );
}