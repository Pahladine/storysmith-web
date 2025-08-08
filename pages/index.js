import { useState } from "react";
import ForgeHero from "@/components/ForgeHero";
import { useStory } from "@/context/StoryContext";

export default function Home() {
  const [activeTab, setActiveTab] = useState("ForgeHero");
  const { storyState, setStoryState, sharedResponse, setSharedResponse } = useStory();

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      <header className="mb-6">
        <h1 className="text-4xl font-bold text-center">StorySmith v2.0</h1>
      </header>

      <div className="flex justify-center space-x-4 mb-6">
        <button
          className={`px-4 py-2 rounded ${activeTab === "ForgeHero" ? "bg-indigo-600" : "bg-gray-700"}`}
          onClick={() => setActiveTab("ForgeHero")}
        >
          Forge Hero
        </button>
        <button
          className={`px-4 py-2 rounded ${activeTab === "SpinTale" ? "bg-indigo-600" : "bg-gray-700"}`}
          onClick={() => setActiveTab("SpinTale")}
        >
          Spin Tale
        </button>
        <button
          className={`px-4 py-2 rounded ${activeTab === "BindBook" ? "bg-indigo-600" : "bg-gray-700"}`}
          onClick={() => setActiveTab("BindBook")}
        >
          Bind Book
        </button>
      </div>

      {activeTab === "ForgeHero" && (
        <ForgeHero setActiveTab={setActiveTab} />
      )}

      {/* Placeholder tabs for later phases */}
      {activeTab === "SpinTale" && <p>SpinTale coming in Phase 2</p>}
      {activeTab === "BindBook" && <p>BindBook coming in Phase 3</p>}
    </main>
  );
}
