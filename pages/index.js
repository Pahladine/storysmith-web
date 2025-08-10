import { useState, useEffect } from "react";
import LandingPage from "@/components/LandingPage";

const videoConfig = {
  landing: { video: "/promo.mp4", background: "/background.jpg" },
  acts: {
    1: { video: "/Keeper1.mp4", background: "/background1.jpg" },
    2: { video: "/Keeper2.mp4", background: "/background2.jpg" },
    3: { video: "/Keeper3.mp4", background: "/background3.jpg" }
  }
};

// Temporary mock dialogue content
const mockDialogue = {
  1: ["Welcome, traveler.", "I have awaited your arrival.", "Shall we begin your story?"],
  2: ["The path ahead is dangerous.", "Choose wisely, for every choice has weight."],
  3: ["Your journey nears its end.", "The final chapter awaits you."]
};

export default function Home() {
  const [showLandingPage, setShowLandingPage] = useState(true);
  const [activeTab, setActiveTab] = useState(1);
  const [videoSrc, setVideoSrc] = useState(videoConfig.landing.video);
  const [backgroundSrc, setBackgroundSrc] = useState(videoConfig.landing.background);
  const [fadeKey, setFadeKey] = useState(0);
  const [lineIndex, setLineIndex] = useState(0);

  useEffect(() => {
    if (showLandingPage) {
      setVideoSrc(videoConfig.landing.video);
      setBackgroundSrc(videoConfig.landing.background);
    } else {
      const { video, background } = videoConfig.acts[activeTab] || videoConfig.acts[1];
      setVideoSrc(video);
      setBackgroundSrc(background);
      setLineIndex(0); // reset dialogue
    }
    setFadeKey((prev) => prev + 1);
  }, [showLandingPage, activeTab]);

  // Cycle through dialogue lines every 3 seconds
  useEffect(() => {
    if (!showLandingPage && mockDialogue[activeTab]) {
      const interval = setInterval(() => {
        setLineIndex((prev) => (prev + 1) % mockDialogue[activeTab].length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [showLandingPage, activeTab]);

  const handleAdminAccess = () => {
    setShowLandingPage(false);
    setActiveTab(1);
  };

  return (
    <>
      {showLandingPage ? (
        <LandingPage onAdminAccess={handleAdminAccess} />
      ) : (
        <div className="relative w-full h-screen bg-black overflow-hidden">
          {/* Background */}
          <img
            key={`bg-${fadeKey}`}
            src={backgroundSrc}
            alt="Act Background"
            className="absolute inset-0 w-full h-full object-cover z-0 opacity-0 animate-fadeIn"
          />

          {/* Video */}
          <video
            key={`vid-${fadeKey}`}
            src={videoSrc}
            autoPlay
            loop
            muted
            playsInline
            onError={(e) => {
              console.error(`Failed to load video: ${videoSrc}`, e);
              e.target.style.display = "none";
            }}
            className="absolute inset-0 w-full h-full object-cover z-10 opacity-0 animate-fadeIn"
          />

          {/* Cinematic Dialogue Overlay */}
   <div className="fixed top-2/3 left-1/2 -translate-x-1/2 z-30 w-11/12 md:w-2/3 lg:w-1/2 text-center pointer-events-none">
  <div className="bg-black/50 backdrop-blur-md px-6 py-4 rounded-xl shadow-lg border border-white/20 inline-block animate-fadeIn">
    <p className="text-white text-2xl md:text-3xl font-semibold drop-shadow-lg transition-opacity duration-500 ease-in-out">
      {mockDialogue[activeTab][lineIndex]}
    </p>
  </div>
</div>

          {/* Act Buttons */}
          <div className="absolute top-4 left-4 flex gap-2 z-30">
            {[1, 2, 3].map((act) => (
              <button
                key={act}
                onClick={() => setActiveTab(act)}
                className={`px-4 py-2 rounded ${
                  activeTab === act ? "bg-indigo-600" : "bg-gray-700"
                }`}
              >
                Act {act}
              </button>
            ))}
          </div>
        </div>
      )}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fadeIn {
          animation: fadeIn 1s ease-in-out forwards;
        }
      `}</style>
    </>
  );
}
