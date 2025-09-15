import React, { useState, useEffect } from "react";
import { FaSearch, FaArrowLeft } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import backgroundImage from "../assets/new post.png";
import { supabase } from "../supabaseClient";

const Chatbox = () => {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { recipientId } = location.state || {};

  // Initial setup
  useEffect(() => {
    async function initializeChat() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      setCurrentUser(user);

      const { data: chatsData, error: chatsError } = await supabase
        .from("chats")
        .select(`
          id,
          user1,
          user2,
          messages!chat_id(content, created_at)
        `)
        .or(`user1.eq.${user.id},user2.eq.${user.id}`)
        .order('created_at', { foreignTable: 'messages', ascending: false });

      if (chatsError) {
        console.error("Error fetching chats:", chatsError);
        return;
      }

      const chatListWithDetails = await Promise.all(
        chatsData.map(async (chat) => {
          const otherUserId = chat.user1 === user.id ? chat.user2 : chat.user1;
          const { data: otherUserData } = await supabase
            .from("users")
            .select("username, profilepic")
            .eq("user_id", otherUserId)
            .single();

          const lastMessage = chat.messages.length > 0 ? chat.messages[0].content : "No messages yet.";

          return {
            ...chat,
            otherUser: otherUserData,
            lastMessage: lastMessage,
          };
        })
      );

      setChats(chatListWithDetails);

      if (recipientId) {
        let chatToOpen = chatListWithDetails.find(
          (c) => (c.user1 === recipientId && c.user2 === user.id) || (c.user1 === user.id && c.user2 === recipientId)
        );

        if (!chatToOpen) {
          const { data: newChat, error: chatError } = await supabase
            .from("chats")
            .insert({ user1: user.id, user2: recipientId })
            .select()
            .single();

          if (chatError) {
            console.error("Error creating new chat:", chatError);
            return;
          }

          const { data: otherUserData } = await supabase
            .from("users")
            .select("username, profilepic")
            .eq("user_id", recipientId)
            .single();

          chatToOpen = { 
            ...newChat, 
            otherUser: otherUserData, 
            lastMessage: "Start a new conversation!",
            messages: [] 
          };
          setChats(prev => [chatToOpen, ...prev]);
        }
        
        handleChatCardClick(chatToOpen);
      }
    }

    initializeChat();
  }, [navigate, recipientId]);

  // Real-time subscription for messages
  useEffect(() => {
    if (!selectedChat || !selectedChat.id) return;

    const subscription = supabase
      .channel(`messages_${selectedChat.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${selectedChat.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          setChats(prevChats =>
            prevChats.map(chat =>
              chat.id === selectedChat.id
                ? { ...chat, lastMessage: payload.new.content }
                : chat
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [selectedChat]);

  // Polling fallback (refresh messages every 2s)
  useEffect(() => {
    if (!selectedChat || !currentUser) return;

    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .eq("chat_id", selectedChat.id)
          .order("created_at", { ascending: true });

        if (!error && data) {
          setMessages(data);
        }
      } catch (error) {
        console.error("Auto-refresh error:", error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [selectedChat, currentUser]);

  const sendMessage = async () => {
    if (!selectedChat || newMessage.trim() === "" || !currentUser) return;

    const { error: messageError } = await supabase.from("messages").insert({
      chat_id: selectedChat.id,
      sender: currentUser.id,
      content: newMessage,
    });

    if (messageError) {
      console.error("Error sending message:", messageError);
    } else {
      setNewMessage("");
    }
  };

  const filteredChats = chats.filter((chat) =>
    chat.otherUser?.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleChatCardClick = async (chat) => {
    setSelectedChat(chat);
    setIsChatOpen(true);

    const { data: messagesData, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chat.id)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("Error fetching messages:", messagesError);
      return;
    }
    setMessages(messagesData);
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
              <img src={chat.otherUser?.profilepic || "https://avatar.iran.liara.run/public/84"} alt="avatar" className="h-10 w-10 rounded-full" />
              <div>
                <p className="font-semibold text-[#784552]">{chat.otherUser?.username || "Loading..."}</p>
                <p className="message">{chat.lastMessage}</p>
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
              <img src={selectedChat.otherUser?.profilepic || "https://avatar.iran.liara.run/public/84"} alt="avatar" className="h-12 w-12 rounded-full" />
              <p className="text-lg font-bold text-white">{selectedChat.otherUser?.username || "Loading..."}</p>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`mb-3 max-w-[70%] rounded-2xl p-3 text-sm shadow-sm ${
                    msg.sender === currentUser?.id
                      ? "ml-auto rounded-br-none bg-pink-200 text-[#784552]"
                      : "mr-auto rounded-bl-none bg-white text-gray-700"
                  }`}
                >
                  {msg.content}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') sendMessage();
                }}
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
            Select a chat to start messaging.
          </div>
        )}
      </div>
    </div>
  );
};

export default Chatbox;