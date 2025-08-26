import React, { useState, useEffect, useRef } from "react";
import { Navigation, Search } from "lucide-react";
import { motion } from "framer-motion";
import { FaArrowLeft } from "react-icons/fa"; // Ensure react-icons is installed
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"; // Ensure react-leaflet is installed
import { supabase } from "../supabaseClient"; // Ensure this path is correct and file exists
import DreamyLoader from "../components/loader"; // Ensure this path is correct and file exists
import "leaflet/dist/leaflet.css"; // Ensure leaflet is installed
import L from "leaflet"; // Ensure leaflet is installed
import axios from "axios";
import bgImage from "../assets/new post.png"; // Ensure this path is correct and file exists

// Fix Leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
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
      // Fly to the new position with a smooth animation
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
      // Open the popup as soon as the marker is rendered
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

// Helper function to generate dummy whispers around a given location
const generateWhispers = (lat, lon) => {
  const whispers = [];
  for (let i = 0; i < 3; i++) {
    const randomLat = lat + (Math.random() - 0.5) * 0.005; // Randomize latitude slightly
    const randomLon = lon + (Math.random() - 0.5) * 0.005; // Randomize longitude slightly
    whispers.push({
      id: i,
      lat: randomLat,
      lon: randomLon,
      content: `A whisper from a nearby spot! #${i + 1}`,
    });
  }
  return whispers;
};

// Main Map component
export default function Map() {
  // State variables for map position, place name, relevant places, whispers, search query, category, and loading status
  // Initial position set to Delhi's coordinates (approximate center)
  const DELHI_COORDS = [28.6139, 77.2090];
  const [position, setPosition] = useState(DELHI_COORDS); 
  const [placeName, setPlaceName] = useState("Loading...");
  const [relevantPlaces, setRelevantPlaces] = useState([]);
  const [whispers, setWhispers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("cafe");
  const [loading, setLoading] = useState(true); // Initial loading state for geolocation and data fetch

  const navigate = useNavigate(); // Hook for navigation

  // Function to fetch place name from latitude and longitude using Nominatim
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

  // Function to save the fetched location name to Supabase
  const saveLocationToDB = async (locationName) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .update({ Location: locationName })
        .eq("id", 3); // Assuming user ID 3 for now

      if (error) console.error("Supabase update error:", error);
      else console.log("✅ Location saved to DB:", data);
    } catch (err) {
      console.error("DB save error:", err);
    }
  };

  // Function to fetch and set nearby places from Overpass API
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
      setWhispers(generateWhispers(lat, lon)); // Generate dummy whispers
    } catch (error) {
      console.error("Error fetching places:", error);
      setRelevantPlaces([]); // Clear places on error
      setWhispers([]);
    }
  };

  // Function to get user's current geolocation
  const locateMe = async (useCurrentLocation = true) => { // Marked as async
    setLoading(true); // Start loading for new location
    if (useCurrentLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const newPosition = [pos.coords.latitude, pos.coords.longitude];
          setPosition(newPosition); // Update map position
          const name = await fetchPlaceName(newPosition[0], newPosition[1]);
          setPlaceName(name); // Update place name
          await fetchAndSetPlaces(newPosition[0], newPosition[1], category); // Fetch nearby places
          setLoading(false); // End loading
          saveLocationToDB(name); // Save to DB
        },
        async (err) => { // This callback also needs to be async if it uses await
          console.error("Geolocation error:", err);
          // If geolocation fails, fall back to Delhi
          setPosition(DELHI_COORDS);
          const name = await fetchPlaceName(DELHI_COORDS[0], DELHI_COORDS[1]);
          setPlaceName(name);
          await fetchAndSetPlaces(DELHI_COORDS[0], DELHI_COORDS[1], category);
          setLoading(false); // End loading
        }
      );
    } else {
      // If geolocation not supported or explicitly not used, use Delhi
      setPosition(DELHI_COORDS);
      const name = await fetchPlaceName(DELHI_COORDS[0], DELHI_COORDS[1]);
      setPlaceName(name);
      await fetchAndSetPlaces(DELHI_COORDS[0], DELHI_COORDS[1], category); // Added await here
      setLoading(false); // End loading
    }
  };

  // Handler for the search bar submission
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return; // Don't search if query is empty

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
        setPosition(newPosition); // Update map position
        setPlaceName(place.display_name); // Update place name
        await fetchAndSetPlaces(newPosition[0], newPosition[1], category); // Fetch nearby places
        setLoading(false); // End loading
        saveLocationToDB(place.display_name); // Save searched place to DB
      } else {
        setPlaceName("No results found for your search.");
        setLoading(false); // End loading
      }
    } catch (err) {
      console.error("Search error:", err);
      setLoading(false); // End loading if error occurs
    }
  };

  // Effect to run once on component mount to get initial location
  useEffect(() => {
    // Attempt to locate user, otherwise default to Delhi
    locateMe(); 
  }, []);

  // Effect to refetch places when the category changes
  useEffect(() => {
    // Only fetch if not initially loading and position is set
    // Check if position is different from default London to avoid unnecessary fetches
    // The previous default was London (51.505, -0.09). Now it's Delhi (28.6139, 77.2090).
    // So, the condition should check against the initial DELHI_COORDS if geolocation failed.
    if (!loading && (position[0] !== DELHI_COORDS[0] || position[1] !== DELHI_COORDS[1])) { 
      fetchAndSetPlaces(position[0], position[1], category);
    }
  }, [category, position, loading]); // Depend on position and loading to ensure data is fetched after location is set

  // Reusable Button component with motion for hover and tap effects
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
      className={`relative min-h-screen w-full overflow-hidden bg-cover bg-center`}
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      {/* Back button */}
      <div
        className="absolute top-4 left-4 z-20"
        onClick={() => navigate("/post")}
      >
        <FaArrowLeft className="text-pink-300 text-3xl cursor-pointer" />
      </div>

      {/* Search and Category Filter */}
      {/* Added mt-16 for mobile (mt-6 for larger screens) to move search bar down */}
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
      </div>

      {/* Map Container */}
      <div className="mx-auto mt-6 w-[95%] sm:w-[90%] max-w-5xl">
        <div className="relative h-[50vh] sm:h-[60vh] rounded-[28px] shadow-lg overflow-hidden">
          {/* Loader Overlay */}
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
              // Ensure map is responsive by invalidating its size on window resize
              window.addEventListener('resize', () => {
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
            {/* My Location Marker */}
            <MyLocationMarker position={position} placeName={placeName} />
            {/* Relevant Places Markers */}
            {relevantPlaces.map((place) => (
              <Marker key={place.id} position={[place.lat, place.lon]}>
                <Popup>{place.tags.name}</Popup>
              </Marker>
            ))}
            {/* Whisper Markers */}
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
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="pointer-events-none absolute inset-x-0 bottom-6 flex w-full justify-center">
        <div className="pointer-events-auto flex flex-wrap items-center gap-4 sm:gap-6 rounded-3xl border border-white/20 bg-white/15 px-4 py-3 shadow-xl backdrop-blur-xl">
          <Button
            icon={Navigation}
            onClick={() => locateMe(true)} // Pass true to attempt geolocation
            className="bg-violet-500/90 hover:bg-violet-500/90"
          >
            Locate Me
          </Button>
        </div>
      </div>
    </div>
  );
}
