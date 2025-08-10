import { useState } from "react";

export default function LandingPage({ onAdminAccess }) {
  const [videoEnded, setVideoEnded] = useState(false); // tracks if promo finished
  const [skipped, setSkipped] = useState(false);       // tracks if user skipped

  const showBackground = videoEnded || skipped;

  const handleSkip = () => {
    setSkipped(true); // move to background.jpg, stay on landing
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {!showBackground ? (
        <video
          src="/promo.mp4"
          autoPlay
          muted
          playsInline
          onEnded={() => setVideoEnded(true)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <img
          src="/background.jpg"
          alt="Landing Background"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Overlay Content */}
      <div className="absolute inset-0 flex flex-col justify-center items-center text-center text-white p-6">
        <h1 className="text-5xl font-bold mb-4">StorySmith</h1>
        <p className="max-w-2xl mb-6 text-lg">
          Where imagination takes form. Forge your hero, shape your tale, and bring your story to life.
        </p>
      </div>

      {/* Skip Button */}
      {!showBackground && (
        <button
          onClick={handleSkip}
          className="absolute bottom-4 left-4 px-4 py-2 bg-gray-800 bg-opacity-75 rounded hover:bg-gray-700"
        >
          Skip Video
        </button>
      )}

      {/* Admin Button */}
      {showBackground && (
        <button
          onClick={() => {
            const password = prompt("Enter admin password:");
            if (password === "6425") {
              onAdminAccess();
            } else {
              alert("Incorrect password");
            }
          }}
          className="absolute bottom-4 right-4 px-4 py-2 bg-gray-800 bg-opacity-75 rounded hover:bg-gray-700"
        >
          Admin
        </button>
      )}
    </div>
  );
}
