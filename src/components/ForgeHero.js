import { useState, useEffect } from "react";
import { useStory } from "@/context/StoryContext";

export default function ForgeHero({ setActiveTab }) {
  const [currentForgeHeroStep, setCurrentForgeHeroStep] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState("start");

  const [heroDetails, setHeroDetails] = useState({
    type: "",
    name: "",
    age: "",
    gender: "",
    traits: "brave and kind",
    wardrobe: "",
    signatureItem: "",
    photoFile: null,
  });

  const [isImageLoading, setIsImageLoading] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState("");

  const { storyState, setStoryState, sharedResponse, setSharedResponse } = useStory();

  // KB: Initial greeting
  useEffect(() => {
    if (currentForgeHeroStep === 0) {
      setSharedResponse(
        "Welcome, brave adventurer! To begin our grand tale, tell me, from where shall our hero emerge?"
      );
    }
  }, [currentForgeHeroStep, setSharedResponse]);

  const constructHeroPrompt = (details) => {
    const { name, age, gender, traits, wardrobe, signatureItem } = details;
    let prompt = `${name || "A young hero"}, a ${age || "7"}-year-old ${gender || "child"} with ${traits || "brave and curious"} traits, wearing ${wardrobe || "a simple tunic and sturdy boots"}, holding ${signatureItem || "a magical locket"}.`;
    prompt += " Style: 3D animated film, Consistency Tag: whimsical_fantasy_child, Format: full body, front-facing. Lighting: soft cinematic. Rendered as a 3D animated film.";
    prompt += " no text, no captions, no writing, no labels, no words";
    return prompt;
  };

  const generateRealImage = async () => {
    const prompt = constructHeroPrompt(heroDetails);
    setIsImageLoading(true);
    setSharedResponse("Behold, the hero’s face shines with living light!");

    try {
      const res = await fetch("/api/generateImage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) throw new Error("Image generation failed");
      const data = await res.json();
      setHeroImageUrl(data.imageUrl);
      setSharedResponse("A worthy visage has been conjured!");
    } catch (error) {
      console.error(error);
      setSharedResponse("Alas, the vision eludes me. Shall we try again?");
    } finally {
      setIsImageLoading(false);
    }
  };

  const handleApproveHero = () => {
    setStoryState((prev) => ({
      ...prev,
      story_content: {
        ...prev.story_content,
        CharacterBlock: {
          character_details: heroDetails,
          character_image: heroImageUrl,
        },
      },
    }));
    setActiveTab("SpinTale"); // Later will go to Act II
  };

  const handleHeroTypeSelection = (type) => {
    setHeroDetails((prev) => ({ ...prev, type }));

    if (type === "real") {
      setCurrentForgeHeroStep(1); // Photo upload step
      setSharedResponse("How marvelous! A legend in the making!");
    } else if (type === "fictional") {
      setCurrentForgeHeroStep(2); // Start attributes
      setCurrentQuestion("name");
    } else if (type === "surprise") {
      // Will trigger AI later
      setSharedResponse("A hero, conjured from the void!");
      setCurrentForgeHeroStep(3); // Placeholder for now
    }
  };

  const handleQuestionAnswer = (field, value, nextQuestion) => {
    setHeroDetails((prev) => ({ ...prev, [field]: value }));
    setCurrentQuestion(nextQuestion);
  };

  const renderStepContent = () => {
    switch (currentForgeHeroStep) {
      case 0:
        return (
          <div className="space-y-4">
            <button
              onClick={() => handleHeroTypeSelection("real")}
              className="px-4 py-2 bg-blue-600 rounded"
            >
              A real person
            </button>
            <button
              onClick={() => handleHeroTypeSelection("fictional")}
              className="px-4 py-2 bg-green-600 rounded"
            >
              A brand new hero
            </button>
            <button
              onClick={() => handleHeroTypeSelection("surprise")}
              className="px-4 py-2 bg-purple-600 rounded"
            >
              Surprise me!
            </button>
          </div>
        );
      case 2:
        return (
          <div>
            {currentQuestion === "name" && (
              <div>
                <p>What shall our hero be called?</p>
                <input
                  className="text-black px-2 py-1 rounded"
                  onBlur={(e) =>
                    handleQuestionAnswer("name", e.target.value, "age")
                  }
                />
              </div>
            )}
            {currentQuestion === "age" && (
              <div>
                <p>What age shall they be?</p>
                <input
                  className="text-black px-2 py-1 rounded"
                  onBlur={(e) =>
                    handleQuestionAnswer("age", e.target.value, "gender")
                  }
                />
              </div>
            )}
            {/* Additional questions per KB go here */}
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            {isImageLoading && <p>Summoning the hero’s image...</p>}
            {!isImageLoading && !heroImageUrl && (
              <button
                onClick={generateRealImage}
                className="px-4 py-2 bg-indigo-600 rounded"
              >
                Generate Hero Image
              </button>
            )}
            {heroImageUrl && (
              <div className="space-y-4">
                <img
                  src={heroImageUrl}
                  alt="Hero portrait"
                  className="rounded-lg shadow-lg max-w-sm mx-auto object-cover"
                />
                <div className="flex space-x-4 justify-center">
                  <button
                    onClick={handleApproveHero}
                    className="px-4 py-2 bg-green-600 rounded"
                  >
                    Approve
                  </button>
                  <button
                    onClick={generateRealImage}
                    className="px-4 py-2 bg-yellow-600 rounded"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      default:
        return <p>Step not implemented yet</p>;
    }
  };

  return (
    <div className="p-4 bg-gray-800 rounded-lg space-y-4">
      <p className="italic text-yellow-300">{sharedResponse}</p>
      {renderStepContent()}
    </div>
  );
}