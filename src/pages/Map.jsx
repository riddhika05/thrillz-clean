import React, { useState, useEffect, useRef } from "react";
import { Navigation, Search } from "lucide-react";
import { motion } from "framer-motion";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { supabase } from "../supabaseClient";
import DreamyLoader from "../components/loader"; // Ensure this path is correct
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import axios from "axios";
import bgImage from "../assets/new post.png";

// Fix Leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
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

// Center updater
function MapUpdater({ position }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(position, 16);
  }, [map, position]);
  return null;
}

// Marker with always-open popup + place name
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

// Dummy whispers
const generateWhispers = (lat, lon) => {
  const whispers = [];
  for (let i = 0; i < 3; i++) {
    const randomLat = lat + (Math.random() - 0.5) * 0.005;
    const randomLon = lon + (Math.random() - 0.5) * 0.005;
    whispers.push({
      id: i,
      lat: randomLat,
      lon: randomLon,
      content: `A whisper from a nearby spot! #${i + 1}`,
    });
  }
  return whispers;
};

export default function Map() {
  const [position, setPosition] = useState([51.505, -0.09]);
  const [placeName, setPlaceName] = useState("Loading...");
  const [loaded, setLoaded] = useState(false);
  const [relevantPlaces, setRelevantPlaces] = useState([]);
  const [whispers, setWhispers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("cafe");
  const [loading, setLoading] = useState(true); // Added loading state

  // Fetch place name from lat/lon
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

  // Save location name in Supabase users table
  const saveLocationToDB = async (locationName) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .update({ Location: locationName })
        .eq("id", 3);

      if (error) console.error("Supabase update error:", error);
      else console.log("✅ Location saved to DB:", data);
    } catch (err) {
      console.error("DB save error:", err);
    }
  };

  // Fetch nearby category-based places
  const fetchAndSetPlaces = async (lat, lon, cat = category) => {
    try {
      const query = `
        [out:json];
        ( node["amenity"="${cat}"](around:500,${lat},${lon}); );
        out center;
      `;
      const response = await axios.post(
        "https://overpass-api.de/api/interpreter",
        query,
        { headers: { "Content-Type": "text/plain" } }
      );
      const places = response.data.elements.filter(
        (el) => el.tags && el.tags.name
      );
      setRelevantPlaces(places);
      setWhispers(generateWhispers(lat, lon));
    } catch (error) {
      console.error("Error fetching places:", error);
    }
  };

  // Locate user
  const locateMe = () => {
    setLoading(true); // Start loading
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const newPosition = [pos.coords.latitude, pos.coords.longitude];
          setPosition(newPosition);
          const name = await fetchPlaceName(newPosition[0], newPosition[1]);
          setPlaceName(name);
          await fetchAndSetPlaces(newPosition[0], newPosition[1], category);
          setLoaded(true);
          setLoading(false); // End loading after all data is fetched

          // ✅ Save to Supabase
          saveLocationToDB(name);
        },
        (err) => {
          console.error("Geolocation error:", err);
          setLoaded(true);
          setLoading(false); // End loading even if there's an error
        }
      );
    } else {
      setLoaded(true);
      setLoading(false); // End loading if geolocation is not supported
    }
  };

  // Search bar handler
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;

    setLoading(true); // Start loading for search
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
        await fetchAndSetPlaces(newPosition[0], newPosition[1], category);
        setLoaded(true);
        setLoading(false); // End loading after search results are fetched

        // ✅ Save searched place to Supabase
        saveLocationToDB(place.display_name);
      } else {
        setPlaceName("No results found for your search.");
        setLoading(false);
      }
    } catch (err) {
      console.error("Search error:", err);
      setLoading(false); // End loading if there's an error
    }
  };

  useEffect(() => {
    if (loaded) {
      fetchAndSetPlaces(position[0], position[1], category);
    }
  }, [category]);

  useEffect(() => {
    locateMe();
  }, []);

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

  const navigate = useNavigate();

  return (
    <>
      {loading && <DreamyLoader />} {/* Conditional rendering of the loader */}
      <div
        className={`relative min-h-screen w-full overflow-hidden bg-cover bg-center ${
          loading ? "hidden" : ""
        }`}
        style={{ backgroundImage: `url(${bgImage})` }}
      >
        <div
          className="absolute top-4 left-4 z-20"
          onClick={() => navigate("/post")}
        >
          <FaArrowLeft className="text-pink-300 text-3xl cursor-pointer" />
        </div>

        {/* 🔍 Search + Dropdown */}
        <div className="mx-auto mt-6 w-[95%] sm:w-[90%] max-w-3xl flex flex-col sm:flex-row gap-3">
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
        </div>

        {/* Map */}
        <div className="mx-auto mt-6 w-[95%] sm:w-[90%] max-w-5xl">
          <div className="relative h-[50vh] sm:h-[60vh] rounded-[28px] shadow-lg overflow-hidden">
            {loaded && (
              <MapContainer
                center={position}
                zoom={16}
                style={{ height: "100%", width: "100%" }}
                className="rounded-[28px]"
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
                    position={[whisper.lat, whisper.lon]}
                    icon={whisperIcon}
                  >
                    <Popup>{whisper.content}</Popup>
                  </Marker>
                ))}
              </MapContainer>
            )}
          </div>
        </div>

        {/* Bottom action bar */}
        <div className="pointer-events-none absolute inset-x-0 bottom-6 flex w-full justify-center">
          <div className="pointer-events-auto flex flex-wrap items-center gap-4 sm:gap-6 rounded-3xl border border-white/20 bg-white/15 px-4 py-3 shadow-xl backdrop-blur-xl">
            <Button
              icon={Navigation}
              onClick={locateMe}
              className="bg-violet-500/90 hover:bg-violet-500/90"
            >
              Locate Me
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
