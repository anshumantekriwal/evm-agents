import React, { useState, useRef, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import "./TradingAgentLauncher.css";

// Import slide components
import InviteSlide from "./slides/InviteSlide";
import BasicInfoSlide from "./slides/BasicInfoSlide";
import ImageUploadSlide from "./slides/ImageUploadSlide";
import BehaviorSlide from "./slides/BehaviorSlide";
import ReviewSlide from "./slides/ReviewSlide";
import AgentSuccess from "./AgentSuccess";
import { supabase } from "../lib/supabase";

// Types
interface FormState {
  currentStep: number;
  inviteCode: string;
  agentName: string;
  agentDescription: string;
  agentImage: File | null;
  agentBehavior: string;
  selectedStrategy: string;
  selectedSources: string[];
  selectedChains: string[];
}

interface UIState {
  isCreating: boolean;
  inviteError: string;
  imagesLoaded: boolean;
  isGeneratingQuestions: boolean;
  isFetchingAICode: boolean;
  aiRating: number | null;
  showSuccess: boolean;
  deployedAgent: any;
  followUpQuestions: string[];
  aiSteps: string[];
  reviewEnabled: boolean;
  aiJustification: string;
  aiCode: string;
}

interface Chain {
  name: string;
  logo: string;
}

const TradingAgentLauncher = () => {
  const { user } = useAuth0();

  // Consolidated form state
  const [formState, setFormState] = useState<FormState>({
    currentStep: 0,
    inviteCode: "",
    agentName: "",
    agentDescription: "",
    agentImage: null,
    agentBehavior: "",
    selectedStrategy: "trading",
    selectedSources: [],
    selectedChains: [],
  });

  // Consolidated UI state
  const [uiState, setUIState] = useState<UIState>({
    isCreating: false,
    inviteError: "",
    imagesLoaded: false,
    isGeneratingQuestions: false,
    isFetchingAICode: false,
    aiRating: null,
    showSuccess: false,
    deployedAgent: null,
    followUpQuestions: [],
    aiSteps: [],
    reviewEnabled: false,
    aiJustification: "",
    aiCode: "",
  });

  const containerRef = useRef(null);

  // Static data
  const slides = [
    {
      image: "/login.png",
      title: "Enter Invite Code",
      content: "Please enter your invitation code to continue",
      component: InviteSlide,
    },
    {
      image: "/login.png",
      title: "It all starts with a name",
      content: "How should we call your EVM Agent?",
      component: BasicInfoSlide,
    },
    {
      image: "/login.png",
      title: `Let's upload the picture\nof ${
        formState.agentName || "your agent"
      }`,
      content: "",
      component: ImageUploadSlide,
    },
    {
      image: "/login.png",
      title: `What do you want\n${formState.agentName || "your agent"} to do?`,
      content: "Describe your agent's behavior and capabilities",
      component: BehaviorSlide,
    },
    {
      image: "/login.png",
      title: "Review",
      content: "",
      component: ReviewSlide,
    },
  ];

  const chains: Chain[] = [
    {
      name: "Polygon",
      logo: "https://coin-images.coingecko.com/coins/images/32440/large/polygon.png",
    },
  ];

  // Preload all static images
  useEffect(() => {
    let isMounted = true;
    const urls = [
      ...slides.map((slide) => slide.image),
      ...chains.map((chain) => chain.logo),
    ];
    let loadedCount = 0;
    urls.forEach((url) => {
      const img = new window.Image();
      img.src = url;
      img.onload = img.onerror = () => {
        loadedCount++;
        if (loadedCount === urls.length && isMounted) {
          setUIState((prev) => ({ ...prev, imagesLoaded: true }));
        }
      };
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // State update helpers
  const updateForm = (field: keyof FormState, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const updateUI = (field: keyof UIState, value: any) => {
    setUIState((prev) => ({ ...prev, [field]: value }));
  };

  const setUIBatch = (updates: Partial<UIState>) => {
    setUIState((prev) => ({ ...prev, ...updates }));
  };

  // Navigation handlers
  const handleNext = () => {
    if (formState.currentStep < slides.length - 1) {
      updateForm("currentStep", formState.currentStep + 1);
    }
  };

  const handleBack = () => {
    if (formState.currentStep > 0) {
      updateForm("currentStep", formState.currentStep - 1);
    }
  };

  // Business logic handlers
  const validateInviteCode = async (code: string) => {
    // Mock validation - replace with actual API call
    return new Promise<{ valid: boolean; error?: string }>((resolve) => {
      setTimeout(() => {
        if (code === "XADE2024" || code === "EVM123") {
          resolve({ valid: true });
        } else {
          resolve({ valid: false, error: "Invalid invite code" });
        }
      }, 1000);
    });
  };

  const handleFileUpload = (file: File) => {
    updateForm("agentImage", file);
  };

  const handleAIRating = async () => {
    updateUI("isGeneratingQuestions", true);

    // Mock AI rating - replace with actual API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const mockRating = 8; // Fixed 8/10 rating

    setUIBatch({
      isGeneratingQuestions: false,
      aiRating: mockRating,
      aiJustification:
        "Your strategy shows good understanding of risk management and market analysis.",
      followUpQuestions: [], // No follow-up questions
      reviewEnabled: true,
    });
  };

  // Reset handleCreateKeypair functionality
  const handleCreateKeypair = async () => {
    updateUI("isCreating", true);

    try {
      // Placeholder functionality - add your implementation here
      console.log("Creating agent with data:", {
        name: formState.agentName,
        description: formState.agentDescription,
        behavior: formState.agentBehavior,
        image: formState.agentImage,
        user_id: user?.sub || user?.email,
      });

      // Simulate some processing time
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // For now, just log success
      console.log("Agent creation simulated successfully");

      updateUI("isCreating", false);
    } catch (error) {
      console.error("Error creating agent:", error);
      updateUI("isCreating", false);
    }
  };

  const handleBackToDashboard = () => {
    // Reset all states to go back to dashboard
    setFormState({
      currentStep: 0,
      inviteCode: "",
      agentName: "",
      agentDescription: "",
      agentImage: null,
      agentBehavior: "",
      selectedStrategy: "trading",
      selectedSources: [],
      selectedChains: [],
    });

    setUIState({
      isCreating: false,
      inviteError: "",
      imagesLoaded: false,
      isGeneratingQuestions: false,
      isFetchingAICode: false,
      aiRating: null,
      showSuccess: false,
      deployedAgent: null,
      followUpQuestions: [],
      aiSteps: [],
      reviewEnabled: false,
      aiJustification: "",
      aiCode: "",
    });
  };

  // Show success page if deployment completed
  if (uiState.showSuccess && uiState.deployedAgent) {
    return (
      <AgentSuccess
        agentData={uiState.deployedAgent}
        onBackToDashboard={handleBackToDashboard}
      />
    );
  }

  // Loading state
  if (!uiState.imagesLoaded) {
    return (
      <div className="agent-launcher-loading">
        <div className="cool-spinner"></div>
        <div className="cool-loading-text">
          Loading your EVM Agent experience...
        </div>
      </div>
    );
  }

  const currentSlide = slides[formState.currentStep];
  const SlideComponent = currentSlide.component;

  return (
    <div className="agent-launcher-container">
      <div className="progress-bar-container">
        <div
          className="progress-bar"
          style={{
            width: ((formState.currentStep + 1) / slides.length) * 100 + "%",
          }}
        />
        <div className="progress-text">
          Step {formState.currentStep + 1} of {slides.length}
        </div>
      </div>

      {formState.currentStep > 0 && (
        <button className="back-button" onClick={handleBack}>
          ← Back
        </button>
      )}

      <div className="slide-container">
        <div className="slide-content">
          <div className="image-container">
            <img
              src={currentSlide.image}
              alt={`Step ${formState.currentStep + 1}`}
              className="slide-image"
            />
          </div>

          <div className="content-container">
            <h2>{currentSlide.title}</h2>

            <SlideComponent
              formState={formState}
              uiState={uiState}
              updateForm={updateForm}
              updateUI={updateUI}
              validateInviteCode={validateInviteCode}
              handleFileUpload={handleFileUpload}
              handleAIRating={handleAIRating}
              handleCreateKeypair={handleCreateKeypair}
              onNext={handleNext}
              onBack={handleBack}
              chains={chains}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingAgentLauncher;
