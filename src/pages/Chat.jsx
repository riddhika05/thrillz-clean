import React, { useState } from "react";
import { FaSearch, FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import backgroundImage from "../assets/new post.png";

const Chatbox = () => {
  const [activeTab, setActiveTab] = useState("chats");
  const [chats, setChats] = useState([
    { id: 1, name: "sweety_21", avatar: "https://avatar.iran.liara.run/public/84", messages: [{ text: "Hey!", type: "received" }] },
    { id: 2, name: "macha_lover12", avatar: "https://avatar.iran.liara.run/public/78", messages: [{ text: "Hello!", type: "received" }] },
    { id: 3, name: "panda_20", avatar: "https://avatar.iran.liara.run/public/100", messages: [] },
  ]);
  const [groups, setGroups] = useState([
    { id: 101, name: "Jaipur Monuments", avatar: "https://iachhrunouathmjxihdg.supabase.co/storage/v1/object/public/Post_images/Hawa%20mahal.jpg", messages: [{ text: "Rani ka Bagh is so underrated! ✨", type: "received" }] },
    { id: 102, name: "Pretty Cafes", avatar: "https://images.pexels.com/photos/33569450/pexels-photo-33569450.jpeg", messages: [{ text: "They have the cutest latte art, had to click a pic 📸☕", type: "received" }] },
  ]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);

  const isChatTab = activeTab === "chats";
  const chatList = isChatTab ? chats : groups;
  const setChatList = isChatTab ? setChats : setGroups;
  const navigate = useNavigate();

  const sendMessage = () => {
    if (!selectedChat || newMessage.trim() === "") return;

    const updatedChats = chatList.map((chat) =>
      chat.id === selectedChat.id
        ? { ...chat, messages: [...chat.messages, { text: newMessage, type: "sent" }] }
        : chat
    );

    const updatedSelected = updatedChats.find((c) => c.id === selectedChat.id);
    const reorderedChats = [
      updatedSelected,
      ...updatedChats.filter((c) => c.id !== selectedChat.id),
    ];

    setChatList(reorderedChats);
    setSelectedChat(updatedSelected);
    setNewMessage("");
  };

  const filteredChats = chatList.filter((chat) =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleChatCardClick = (chat) => {
    setSelectedChat(chat);
    setIsChatOpen(true);
  };

  const handleBackClick = () => {
    setSelectedChat(null);
    setIsChatOpen(false);
  };

  return (
    <div
      className="flex min-h-screen w-full bg-cover bg-center bg-no-repeat p-4 sm:p-6 md:p-8"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      {/* Sidebar */}
      <div className={`${isChatOpen ? 'hidden' : 'flex'} sm:flex relative z-10 w-full max-w-sm sm:w-1/3 flex-col rounded-2xl border border-white/20 bg-white/30 p-4 backdrop-blur-md shadow-lg`}>
        <div className="flex w-full items-center mb-4">
          <FaArrowLeft
            className="text-pink-300 text-3xl cursor-pointer"
            onClick={() => navigate(-1)}
          />
        </div>
        <div className="flex justify-between gap-2 mb-4">
          <button
            className={`flex-1 rounded-full px-4 py-2 font-bold transition-colors ${
              activeTab === "chats"
                ? "bg-white text-[#4b4bc0] border-2 border-[#4b4bc0]"
                : "bg-gray-300/50 text-gray-800 hover:bg-white/50"
            }`}
            onClick={() => {
              setActiveTab("chats");
              setSelectedChat(null);
            }}
          >
            Chats
          </button>
          <button
            className={`flex-1 rounded-full px-4 py-2 font-bold transition-colors ${
              activeTab === "groups"
                ? "bg-white text-[#4b4bc0] border-2 border-[#4b4bc0]"
                : "bg-gray-300/50 text-gray-800 hover:bg-white/50"
            }`}
            onClick={() => {
              setActiveTab("groups");
              setSelectedChat(null);
            }}
          >
            Groups
          </button>
        </div>

        <div className="relative mb-4">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full rounded-full bg-white/70 py-2 pl-10 pr-4 text-gray-700 placeholder-gray-500 outline-none transition-colors focus:bg-white/90"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto pr-2">
          {filteredChats.map((chat) => (
            <div
              className={`mb-3 flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors ${
                selectedChat?.id === chat.id
                  ? "bg-white/80 shadow-md"
                  : "bg-white/50 hover:bg-white/70"
              }`}
              key={chat.id}
              onClick={() => handleChatCardClick(chat)}
            >
              <img src={chat.avatar} alt="avatar" className="h-10 w-10 rounded-full" />
              <div>
                <p className="font-semibold text-[#784552]">{chat.name}</p>
                <p className="text-sm text-gray-500">
                  {chat.messages.length > 0
                    ? chat.messages[chat.messages.length - 1].text
                    : "No messages yet"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Window */}
      <div className={`${isChatOpen ? 'flex' : 'hidden'} sm:flex relative z-10 ml-4 w-full flex-col rounded-2xl border border-white/20 bg-white/30 p-4 backdrop-blur-md shadow-lg`}>
        {selectedChat ? (
          <>
            <div className="flex items-center gap-4 rounded-xl bg-pink-300/60 p-3 shadow-md">
              <FaArrowLeft
                className="text-white text-2xl cursor-pointer sm:hidden"
                onClick={handleBackClick}
              />
              <img src={selectedChat.avatar} alt="avatar" className="h-12 w-12 rounded-full" />
              <p className="text-lg font-bold text-white">{selectedChat.name}</p>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
              {selectedChat.messages.map((msg, i) => (
                <div
                  key={i}
                  className={`mb-3 max-w-[70%] rounded-2xl p-3 text-sm shadow-sm ${
                    msg.type === "sent"
                      ? "ml-auto rounded-br-none bg-pink-200 text-[#784552]"
                      : "mr-auto rounded-bl-none bg-white text-gray-700"
                  }`}
                >
                  {msg.text}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 rounded-full border border-gray-300 bg-white/80 py-2 pl-4 pr-12 outline-none"
              />
              <button
                onClick={sendMessage}
                className="rounded-full bg-[#4b4bc0] px-6 py-2 font-semibold text-white transition-colors hover:bg-[#5a5acd]"
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-center text-xl font-semibold text-gray-600">
            Select a chat or group to start messaging.
          </div>
        )}
      </div>
    </div>
  );
};

export default Chatbox;