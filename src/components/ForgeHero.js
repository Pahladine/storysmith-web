import { useState } from "react";
import { useStory } from "@/context/StoryContext";

export default function ForgeHero() {
  const { storyState, setStoryState } = useStory();
  const [loading, setLoading] = useState(false);
  const [approved, setApproved] = useState(false);
  const [error, setError] = useState(null);

  const loadFullPrompt = async () => {
    try {
      const res = await fetch("/prompts/01_Hero_And_Blueprint.txt");
      if (!res.ok) throw new Error("Failed to load Act 1 prompt");
      return await res.text();
    } catch (err) {
      setError(err.message);
      return null;
    }
  };

  const generateHero = async () => {
    setLoading(true);
    setError(null);

    const fullPrompt = await loadFullPrompt();
    if (!fullPrompt) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/forgeHeroStepFull", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: fullPrompt })
      });

      if (!res.ok) throw new Error("Hero generation failed");

      const data = await res.json();

      setStoryState((prev) => ({
        ...prev,
        story_content: {
          ...prev.story_content,
          CharacterBlock: data.story_content?.CharacterBlock || {},
          StoryBlueprintBlock: data.story_content?.StoryBlueprintBlock || {}
        },
        story_data: {
          ...prev.story_data,
          visual_style: data.story_data?.visual_style || "",
          visual_consistency_tag: data.story_data?.visual_consistency_tag || ""
        }
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const hasHeroData = Boolean(storyState?.story_content?.CharacterBlock?.hero_name);

  return (
    <div className="forge-hero-container">
      <button onClick={generateHero} disabled={loading}>
        {loading ? "Generating Hero..." : "Forge My Hero"}
      </button>

      {error && <p className="error">{error}</p>}

      {hasHeroData && !approved && (
        <div className="hero-confirmation">
          <h2>Your Hero</h2>
          <p><strong>Name:</strong> {storyState.story_content.CharacterBlock.hero_name}</p>
          <p><strong>Appearance:</strong> {JSON.stringify(storyState.story_content.CharacterBlock.appearance)}</p>
          <p><strong>Wardrobe:</strong> {JSON.stringify(storyState.story_content.CharacterBlock.wardrobe)}</p>
          <p><strong>Signature Item:</strong> {storyState.story_content.CharacterBlock.signature_item}</p>
          <p><strong>Visual Style:</strong> {storyState.story_data.visual_style}</p>
          <div>
            <strong>Story Blueprint:</strong>
            <pre>{JSON.stringify(storyState.story_content.StoryBlueprintBlock, null, 2)}</pre>
          </div>
          <button className="approve-btn" onClick={() => setApproved(true)}>Approve Hero</button>
        </div>
      )}

      {approved && (
        <div className="hero-approved">
          ✅ Hero locked in! Proceed to Act 2.
        </div>
      )}
    </div>
  );
}
